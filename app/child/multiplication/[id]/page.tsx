"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import styles from "../../../components/MultiplicationAdventure.module.css";
import feedbackStyles from "../../../components/MultiplicationFeedback.module.css";

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
type Round = {
  round_id: string;
  table_number: number;
  question_limit: number;
  answered_count: number;
  correct_count: number;
};
type Question = {
  attempt_id: string;
  table_number: number;
  multiplier: number;
  options: number[];
  answered_count: number;
  question_limit: number;
};
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
type Feedback = {
  correct: boolean;
  answer: number;
  selected: number;
  questionKey: string;
};
type Mode = "study" | "question" | "result" | "complete";
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

type AppleStyle = CSSProperties & {
  "--apple-left": string;
  "--apple-delay": string;
  "--apple-drift": string;
};

const APPLE_POSITIONS = [12, 36, 61, 82, 24, 49, 73, 17, 42, 67, 88, 29, 55, 77, 9, 33, 58, 84, 20, 70];

function playNote(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  oscillatorType: OscillatorType,
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

  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );
}

function playAppleDrop(context: AudioContext, startAt: number, index: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const landingTone = 210 + (index % 4) * 24;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(690 + (index % 3) * 55, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(landingTone, startAt + 0.12);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.09, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.18);
  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );
}

function playFeedbackTone(context: AudioContext | null, isCorrect: boolean, answer: number) {
  if (!context || context.state !== "running") return;

  try {
    const startAt = context.currentTime + 0.01;
    if (isCorrect) {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        playNote(context, frequency, startAt + index * 0.075, 0.2, 0.17, "triangle");
      });

      const visualUnits = answer <= 20 ? answer : Math.floor(answer / 10) + (answer % 10);
      const soundUnits = Math.min(Math.max(visualUnits, 1), 12);
      for (let index = 0; index < soundUnits; index += 1) {
        playAppleDrop(context, startAt + 0.4 + index * 0.085, index);
      }
      return;
    }

    [246.94, 196, 164.81].forEach((frequency, index) => {
      playNote(context, frequency, startAt + index * 0.11, 0.25, 0.13, "sine");
    });
  } catch {
    // لا يتوقف التحدي إذا كان المتصفح لا يدعم Web Audio.
  }
}

function AppleRain({ count }: { count: number }) {
  return (
    <div className={feedbackStyles.directCountScene} aria-label={`${count} تفاحات`}>
      <div className={feedbackStyles.treeCrown} aria-hidden="true">🌳</div>
      <div className={feedbackStyles.appleRain} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const left = APPLE_POSITIONS[index % APPLE_POSITIONS.length];
          const drift = index % 2 === 0 ? `${6 + (index % 3) * 3}px` : `${-6 - (index % 3) * 3}px`;
          const appleStyle: AppleStyle = {
            "--apple-left": `${left}%`,
            "--apple-delay": `${index * 75}ms`,
            "--apple-drift": drift,
          };
          return <span className={feedbackStyles.fallingApple} style={appleStyle} key={index}>🍎</span>;
        })}
      </div>
      <div className={feedbackStyles.groundLine} aria-hidden="true" />
    </div>
  );
}

function PlaceValueApples({ answer }: { answer: number }) {
  const tens = Math.floor(answer / 10);
  const ones = answer % 10;

  return (
    <div className={feedbackStyles.placeValueScene}>
      <div className={feedbackStyles.basketGroups} aria-label={`${tens} مجموعات، في كل مجموعة عشر تفاحات`}>
        {Array.from({ length: tens }, (_, index) => (
          <span className={feedbackStyles.tenBasket} style={{ animationDelay: `${index * 70}ms` }} key={index}>
            <span aria-hidden="true">🧺</span>
            <strong>10</strong>
          </span>
        ))}
      </div>
      {ones > 0 && (
        <div className={feedbackStyles.looseApples} aria-label={`${ones} تفاحات إضافية`}>
          {Array.from({ length: ones }, (_, index) => (
            <span style={{ animationDelay: `${tens * 70 + index * 75}ms` }} key={index} aria-hidden="true">🍎</span>
          ))}
        </div>
      )}
      <p className={feedbackStyles.placeValueCaption}>
        {tens > 0 ? `${tens} × 10` : ""}{tens > 0 && ones > 0 ? " + " : ""}{ones > 0 ? ones : ""} = {answer}
      </p>
    </div>
  );
}

function EducationalFeedback({
  feedback,
  tableNumber,
  multiplier,
}: {
  feedback: Feedback;
  tableNumber: number;
  multiplier: number;
}) {
  const answer = Math.max(0, Math.floor(feedback.answer));
  const directCount = answer <= 20;

  return (
    <section
      className={`${feedbackStyles.learningFeedback} ${feedback.correct ? feedbackStyles.learningFeedbackCorrect : feedbackStyles.learningFeedbackWrong}`}
      role="status"
      aria-live="assertive"
      key={feedback.questionKey}
    >
      <div className={feedbackStyles.feedbackHeading}>
        <span aria-hidden="true">{feedback.correct ? "⭐" : "💡"}</span>
        <div>
          <h2>{feedback.correct ? "أحسنت! إجابة صحيحة" : "محاولة جميلة، لنتعلمها بصريًا"}</h2>
          <p>{feedback.correct ? `شاهد العدد ${answer} أمامك.` : `اخترت ${feedback.selected}، والصحيح هو ${answer}.`}</p>
        </div>
      </div>

      <div className={feedbackStyles.equationReveal} dir="ltr">
        {tableNumber} × {multiplier} = <strong>{answer}</strong>
      </div>

      {directCount ? <AppleRain count={answer} /> : <PlaceValueApples answer={answer} />}

      <p className={feedbackStyles.countCaption}>
        {directCount
          ? `عدد التفاحات الساقطة يساوي الإجابة: ${answer}`
          : "كل سلة تمثل 10 تفاحات، والتفاحات المفردة تمثل الآحاد."}
      </p>
    </section>
  );
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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
      if (context.state !== "running") await context.resume();
      if (context.state !== "running") return context;

      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
      source.addEventListener("ended", () => source.disconnect(), { once: true });
    } catch {
      return context;
    }

    return context;
  }

  function prepareAudio() {
    void unlockAudio();
  }

  function playImmediateFeedback(isCorrect: boolean, answer: number) {
    void unlockAudio().then((context) => playFeedbackTone(context, isCorrect, answer));

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(isCorrect ? [25, 35, 25] : 90);
    }
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
    const resumeOnReturn = () => {
      if (document.visibilityState === "visible" && audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
    };
    document.addEventListener("visibilitychange", resumeOnReturn);

    return () => {
      document.removeEventListener("visibilitychange", resumeOnReturn);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const selectedStage = useMemo(
    () => program?.stages.find((stage) => stage.table_number === selectedTable),
    [program, selectedTable],
  );

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
    prepareAudio();
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

    const expectedAnswer = question.table_number * question.multiplier;
    setBusy(true);
    setSelectedAnswer(value);
    playImmediateFeedback(value === expectedAnswer, expectedAnswer);

    const token = childToken();
    if (!token) {
      setBusy(false);
      return;
    }
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
    setFeedback({
      correct: nextResult.is_correct,
      answer: nextResult.correct_answer,
      selected: value,
      questionKey: question.attempt_id,
    });
    setResult(nextResult);
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
    }, 2350);
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
      <div className={styles.gameTop}>
        <Link className={styles.backLink} href="/child?section=tasks">← العودة إلى مهامي</Link>
        <span>{program.completed_tables} من {program.total_tables} مراحل</span>
      </div>
      <section className={styles.gameShell}>
        {mode === "complete" ? (
          <div className={styles.finalCelebration}>
            <span>🏆</span>
            <h1>أنت بطل جدول الضرب!</h1>
            <p>أكملت جميع الجداول بنجاح. ستبقى النتيجة داخل مهامي في مساحتي التعليمية، ويمكنك إرسالها لولي الأمر للاعتماد.</p>
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
              <button className={styles.primaryButton} type="button" disabled={busy || completionSubmitted} onClick={() => void submitCompletedTask()}>
                {busy ? "جارٍ إرسال الإنجاز..." : completionSubmitted ? "تم إرسال الإنجاز" : "إنجاز المهمة وإرسالها لولي الأمر"}
              </button>
              <Link className={styles.secondaryButton} href="/child?section=tasks">العودة إلى مهامي</Link>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.gameTitle}>
              <span>المرحلة الحالية</span>
              <h1>جدول ضرب {selectedTable}</h1>
              <p>تأمل النتائج بهدوء، ثم ابدأ عندما تشعر أنك مستعد.</p>
            </div>
            <div className={styles.stageStrip}>
              {program.stages.map((stage) => (
                <button
                  type="button"
                  key={stage.table_number}
                  onClick={() => chooseStage(stage.table_number, stage.status)}
                  disabled={stage.status === "locked" || mode === "question"}
                  className={stage.status === "completed" ? styles.stageDone : stage.table_number === selectedTable ? styles.stageCurrent : styles.stageLocked}
                >
                  {stage.status === "completed" ? "✓" : stage.table_number}
                </button>
              ))}
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {mode === "study" && (
              <div className={styles.studyCard}>
                <div className={styles.studyGrid}>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((multiplier) => (
                    <div className={styles.studyEquation} key={multiplier}>
                      <span>{selectedTable} × {multiplier}</span>
                      <strong>{selectedTable * multiplier}</strong>
                    </div>
                  ))}
                </div>
                {selectedStage?.best_score ? <p className={styles.successMessage}>أفضل نتيجة سابقة: {selectedStage.best_score}٪</p> : null}
                <div className={styles.studyActions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={busy || selectedStage?.status !== "available"}
                    onPointerDown={prepareAudio}
                    onTouchStart={prepareAudio}
                    onClick={() => void startChallenge()}
                  >
                    {busy ? "جارٍ تجهيز التحدي..." : selectedStage?.status === "completed" ? "تم إتقان هذه المرحلة" : "أنا مستعد للتحدي"}
                  </button>
                </div>
              </div>
            )}
            {mode === "question" && question && (
              <>
                <div className={styles.roundStats}>
                  <span>السؤال {answered + 1} من {question.question_limit}</span>
                  <span>إجابات صحيحة: {correct}</span>
                </div>
                <div className={styles.questionCard}>
                  <small>اختر الإجابة الصحيحة</small>
                  <div className={styles.questionEquation}>{question.table_number} × {question.multiplier} = ؟</div>
                  <div className={styles.answersGrid}>
                    {question.options.map((option) => (
                      <button
                        className={answerClass(option)}
                        type="button"
                        disabled={busy}
                        key={option}
                        onPointerDown={prepareAudio}
                        onTouchStart={prepareAudio}
                        onClick={() => void answer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                {feedback && (
                  <EducationalFeedback
                    feedback={feedback}
                    tableNumber={question.table_number}
                    multiplier={question.multiplier}
                  />
                )}
              </>
            )}
            {mode === "result" && result && (
              <div className={styles.resultCard}>
                <span>{result.stage_passed ? "🎉" : "💪"}</span>
                <h2>{result.stage_passed ? `أتقنت جدول ${round?.table_number || selectedTable}` : "اقتربت من الإتقان"}</h2>
                <div className={styles.scoreCircle}>{result.score}٪</div>
                <p>{result.stage_passed ? "رائع! فُتحت لك المرحلة التالية." : `راجع البطاقة ثم حاول مجددًا. المطلوب ${program.pass_percentage}٪.`}</p>
                <div className={styles.resultActions}>
                  {result.stage_passed && result.next_table ? (
                    <button className={styles.primaryButton} type="button" onClick={() => { setSelectedTable(result.next_table as number); setResult(null); setMode("study"); }}>
                      الانتقال إلى جدول {result.next_table}
                    </button>
                  ) : (
                    <button className={styles.primaryButton} type="button" onClick={() => { setResult(null); setMode("study"); }}>
                      مراجعة البطاقة والمحاولة
                    </button>
                  )}
                  <Link className={styles.secondaryButton} href="/child?section=tasks">حفظ والخروج إلى مهامي</Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
