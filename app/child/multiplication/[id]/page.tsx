"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import styles from "../../../components/MultiplicationAdventure.module.css";

type Stage = {
  id: string;
  table_number: number;
  status: "locked" | "available" | "completed";
  attempts_count: number;
  best_score: number;
};
type Program = {
  id: string;
  task_id: string | null;
  task_status: string | null;
  from_table: number;
  to_table: number;
  questions_per_stage: number;
  pass_percentage: number;
  status: "active" | "completed";
  current_table: number;
  completed_tables: number;
  total_tables: number;
  stages: Stage[];
};
type Round = { round_id: string; table_number: number; question_limit: number; answered_count: number; correct_count: number };
type Question = { attempt_id: string; table_number: number; multiplier: number; options: number[]; answered_count: number; question_limit: number };
type AnswerResult = {
  is_correct: boolean;
  correct_answer: number;
  answered_count: number;
  correct_count: number;
  round_complete: boolean;
  score: number | null;
  stage_passed: boolean;
  program_complete: boolean;
  next_table: number | null;
};
type Mode = "study" | "question" | "result" | "complete";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function playNote(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  oscillatorType: OscillatorType
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = oscillatorType;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);

  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    gain.disconnect();
  }, { once: true });
}

function playFeedbackTone(context: AudioContext | null, isCorrect: boolean) {
  if (!context || context.state !== "running") return;

  try {
    const startAt = context.currentTime + 0.015;
    if (isCorrect) {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        playNote(context, frequency, startAt + index * 0.085, 0.18, 0.14, "triangle");
      });
      return;
    }

    [220, 174.61].forEach((frequency, index) => {
      playNote(context, frequency, startAt + index * 0.12, 0.22, 0.09, "sine");
    });
  } catch {
    // يتعذر الصوت فقط في المتصفحات التي لا تدعم Web Audio، دون تعطيل التحدي.
  }
}

export default function ChildMultiplicationGamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programId = params.id;
  const audioContextRef = useRef<AudioContext | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedTable, setSelectedTable] = useState(1);
  const [round, setRound] = useState<Round | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [mode, setMode] = useState<Mode>("study");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [error, setError] = useState("");

  function childToken() {
    return typeof window === "undefined" ? null : localStorage.getItem("namaa_child_token");
  }

  function getAudioContext() {
    if (typeof window === "undefined") return null;
    if (audioContextRef.current?.state !== "closed") return audioContextRef.current;

    const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextClass) return null;

    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  }

  async function unlockAudio() {
    const context = getAudioContext();
    if (!context) return null;

    try {
      if (context.state === "suspended") await context.resume();
      if (context.state === "running") {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.02);
        oscillator.addEventListener("ended", () => {
          oscillator.disconnect();
          gain.disconnect();
        }, { once: true });
      }
    } catch {
      return context;
    }

    return context;
  }

  async function loadProgram(preferredTable?: number) {
    if (!supabase) return;
    const token = childToken();
    if (!token) {
      router.replace("/child/login");
      return;
    }
    const response = await supabase.rpc("get_child_multiplication_program", {
      p_session_token: token,
      p_program_id: programId,
    });
    if (response.error || !response.data) {
      setError("تعذر فتح برنامج جدول الضرب.");
      return;
    }
    const next = response.data as Program;
    setProgram(next);
    setSelectedTable(preferredTable || next.current_table || next.from_table);
    if (next.status === "completed") setMode("complete");
  }

  useEffect(() => {
    void loadProgram();
  }, [programId]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const selectedStage = useMemo(() => program?.stages.find((stage) => stage.table_number === selectedTable), [program, selectedTable]);

  async function fetchQuestion(roundId: string) {
    if (!supabase) return;
    const token = childToken();
    if (!token) return;
    const response = await supabase.rpc("next_child_multiplication_question", {
      p_session_token: token,
      p_round_id: roundId,
    });
    if (response.error) {
      setError(response.error.message || "تعذر تجهيز السؤال.");
      return;
    }
    setSelectedAnswer(null);
    setQuestion(response.data as Question);
    setMode("question");
  }

  async function startChallenge() {
    if (!supabase || !program || !selectedStage || selectedStage.status !== "available") return;
    await unlockAudio();
    const token = childToken();
    if (!token) return;
    setBusy(true);
    setError("");
    setFeedback(null);
    setSelectedAnswer(null);
    setResult(null);
    const response = await supabase.rpc("start_child_multiplication_stage", {
      p_session_token: token,
      p_program_id: program.id,
      p_table_number: selectedTable,
    });
    if (response.error) {
      setError(response.error.message || "تعذر بدء التحدي.");
      setBusy(false);
      return;
    }
    const nextRound = response.data as Round;
    setRound(nextRound);
    await fetchQuestion(nextRound.round_id);
    setBusy(false);
  }

  async function answer(value: number) {
    if (!supabase || !question || busy) return;
    await unlockAudio();
    const token = childToken();
    if (!token) return;
    setBusy(true);
    setSelectedAnswer(value);
    const response = await supabase.rpc("answer_child_multiplication_question", {
      p_session_token: token,
      p_attempt_id: question.attempt_id,
      p_answer: value,
    });
    if (response.error) {
      setError(response.error.message || "تعذر حفظ الإجابة.");
      setBusy(false);
      return;
    }
    const nextResult = response.data as AnswerResult;
    setFeedback({ correct: nextResult.is_correct, answer: nextResult.correct_answer });
    setResult(nextResult);
    playFeedbackTone(audioContextRef.current, nextResult.is_correct);
    window.setTimeout(async () => {
      setFeedback(null);
      setSelectedAnswer(null);
      if (nextResult.round_complete) {
        await loadProgram(nextResult.next_table || selectedTable);
        setMode(nextResult.program_complete ? "complete" : "result");
      } else if (round) {
        await fetchQuestion(round.round_id);
      }
      setBusy(false);
    }, 1200);
  }

  async function submitCompletedTask() {
    if (!supabase || !program?.task_id || program.status !== "completed") return;
    const token = childToken();
    if (!token) return;
    setBusy(true);
    setError("");
    setCompletionMessage("");
    const response = await supabase.rpc("child_submit_task", {
      p_session_token: token,
      p_task_id: program.task_id,
      p_child_note: "أكملت جميع مراحل تحدي جدول الضرب بنجاح.",
    });
    setBusy(false);
    if (response.error) {
      setError(response.error.message || "تعذر إرسال الإنجاز لولي الأمر.");
      return;
    }
    setCompletionMessage("تم إرسال إنجاز جدول الضرب إلى ولي الأمر للمراجعة والاعتماد.");
    await loadProgram();
  }

  function chooseStage(tableNumber: number, status: Stage["status"]) {
    if (status === "locked" || mode === "question") return;
    setSelectedTable(tableNumber);
    setResult(null);
    setQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setMode("study");
  }

  function answerClass(option: number) {
    if (!feedback) return styles.answerButton;
    if (option === feedback.answer) return `${styles.answerButton} multiplication-answer-correct`;
    if (option === selectedAnswer && !feedback.correct) return `${styles.answerButton} multiplication-answer-wrong`;
    if (option === selectedAnswer && feedback.correct) return `${styles.answerButton} multiplication-answer-correct`;
    return `${styles.answerButton} multiplication-answer-muted`;
  }

  if (!program) return <main className={styles.loading}>{error || "جارٍ تحميل بطاقات جدول الضرب..."}</main>;

  const answered = result?.answered_count ?? question?.answered_count ?? round?.answered_count ?? 0;
  const correct = result?.correct_count ?? round?.correct_count ?? 0;
  const completionSubmitted = program.task_status === "submitted" || program.task_status === "approved";
  const weaknessReport = [...program.stages]
    .filter((stage) => stage.status === "completed")
    .sort((a, b) => a.best_score - b.best_score || b.attempts_count - a.attempts_count)
    .slice(0, 3);

  return (
    <main className={styles.gamePage}>
      <div className={styles.gameTop}><Link className={styles.backLink} href="/child?section=tasks">← العودة إلى مهامي</Link><span>{program.completed_tables} من {program.total_tables} مراحل</span></div>
      <section className={styles.gameShell}>
        {mode === "complete" ? (
          <div className={styles.finalCelebration}>
            <span>🏆</span><h1>أنت بطل جدول الضرب!</h1><p>أكملت جميع الجداول بنجاح. ستبقى النتيجة داخل مهامي في مساحتي التعليمية، ويمكنك إرسالها لولي الأمر للاعتماد.</p>
            <div className="multiplication-weakness-report">
              <h2>تقرير نقاط الضعف</h2>
              <p>هذه أقل الجداول نتيجة وتحتاج مراجعة سريعة حتى تثبت المهارة أكثر.</p>
              <div className="multiplication-weakness-grid">
                {weaknessReport.length > 0 ? weaknessReport.map((stage) => (
                  <article key={stage.id}>
                    <strong>جدول {stage.table_number}</strong>
                    <span>{stage.best_score}%</span>
                    <small>{stage.attempts_count > 1 ? `احتجت ${stage.attempts_count} محاولات` : "تم اجتيازه من أول محاولة"}</small>
                  </article>
                )) : <article><strong>ممتاز</strong><span>100%</span><small>لا توجد نقاط ضعف واضحة.</small></article>}
              </div>
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {completionMessage && <p className={styles.successMessage}>{completionMessage}</p>}
            <div className={styles.studyActions}>
              <button className={styles.primaryButton} type="button" disabled={busy || completionSubmitted} onClick={() => void submitCompletedTask()}>{busy ? "جارٍ إرسال الإنجاز..." : completionSubmitted ? "تم إرسال الإنجاز" : "إنجاز المهمة وإرسالها لولي الأمر"}</button>
              <Link className={styles.secondaryButton} href="/child?section=tasks">العودة إلى مهامي</Link>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.gameTitle}><span>المرحلة الحالية</span><h1>جدول ضرب {selectedTable}</h1><p>تأمل النتائج بهدوء، ثم ابدأ عندما تشعر أنك مستعد.</p></div>
            <div className={styles.stageStrip}>{program.stages.map((stage) => <button type="button" key={stage.table_number} onClick={() => chooseStage(stage.table_number, stage.status)} disabled={stage.status === "locked" || mode === "question"} className={stage.status === "completed" ? styles.stageDone : stage.table_number === selectedTable ? styles.stageCurrent : styles.stageLocked}>{stage.status === "completed" ? "✓" : stage.table_number}</button>)}</div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {mode === "study" && (
              <div className={styles.studyCard}>
                <div className={styles.studyGrid}>{Array.from({ length: 10 }, (_, index) => index + 1).map((multiplier) => <div className={styles.studyEquation} key={multiplier}><span>{selectedTable} × {multiplier}</span><strong>{selectedTable * multiplier}</strong></div>)}</div>
                {selectedStage?.best_score ? <p className={styles.successMessage}>أفضل نتيجة سابقة: {selectedStage.best_score}٪</p> : null}
                <div className={styles.studyActions}><button className={styles.primaryButton} type="button" disabled={busy || selectedStage?.status !== "available"} onClick={() => void startChallenge()}>{busy ? "جارٍ تجهيز التحدي..." : selectedStage?.status === "completed" ? "تم إتقان هذه المرحلة" : "أنا مستعد للتحدي"}</button></div>
              </div>
            )}
            {mode === "question" && question && (
              <>
                <div className={styles.roundStats}><span>السؤال {answered + 1} من {question.question_limit}</span><span>إجابات صحيحة: {correct}</span></div>
                <div className={styles.questionCard}><small>اختر الإجابة الصحيحة</small><div className={styles.questionEquation}>{question.table_number} × {question.multiplier} = ؟</div><div className={styles.answersGrid}>{question.options.map((option) => <button className={answerClass(option)} type="button" disabled={busy} key={option} onClick={() => void answer(option)}>{option}</button>)}</div></div>
                {feedback && <div className={feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong}>{feedback.correct ? "أحسنت! إجابة صحيحة ⭐" : `محاولة جميلة، الإجابة الصحيحة هي ${feedback.answer}`}</div>}
              </>
            )}
            {mode === "result" && result && (
              <div className={styles.resultCard}><span>{result.stage_passed ? "🎉" : "💪"}</span><h2>{result.stage_passed ? `أتقنت جدول ${round?.table_number || selectedTable}` : "اقتربت من الإتقان"}</h2><div className={styles.scoreCircle}>{result.score}٪</div><p>{result.stage_passed ? "رائع! فُتحت لك المرحلة التالية." : `راجع البطاقة ثم حاول مجددًا. المطلوب ${program.pass_percentage}٪.`}</p><div className={styles.resultActions}>{result.stage_passed && result.next_table ? <button className={styles.primaryButton} type="button" onClick={() => { setSelectedTable(result.next_table as number); setResult(null); setMode("study"); }}>الانتقال إلى جدول {result.next_table}</button> : <button className={styles.primaryButton} type="button" onClick={() => { setResult(null); setMode("study"); }}>مراجعة البطاقة والمحاولة</button>}<Link className={styles.secondaryButton} href="/child?section=tasks">حفظ والخروج إلى مهامي</Link></div></div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
