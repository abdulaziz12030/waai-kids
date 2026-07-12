"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type LearningFeedback = {
  correct: boolean;
  selected: number;
  answer: number;
  tableNumber: number;
  multiplier: number;
  key: number;
};

type AppleStyle = CSSProperties & {
  "--learning-apple-left": string;
  "--learning-apple-delay": string;
  "--learning-apple-drift": string;
};

const APPLE_POSITIONS = [10, 28, 47, 67, 86, 18, 38, 58, 78, 22, 43, 63, 83, 13, 33, 53, 73, 91, 25, 69];
const CORRECT_SOUND = "/audio/correct-answer.mp3";
const WRONG_SOUND = "/audio/wrong-answer.mp3";
const CORRECT_DURATION_MS = 5000;
const WRONG_DURATION_MS = 6300;

function normalizeDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
}

function findAnswerInteraction(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return null;

  const selectedText = normalizeDigits(button.textContent || "").trim();
  if (!/^\d+$/.test(selectedText)) return null;

  let questionRoot: HTMLElement | null = button.parentElement;
  for (let depth = 0; depth < 5 && questionRoot; depth += 1) {
    const text = normalizeDigits(questionRoot.textContent || "");
    const equation = text.match(/(\d+)\s*[×xX*]\s*(\d+)\s*=\s*[؟?]/);
    if (text.includes("اختر الإجابة الصحيحة") && equation) {
      const tableNumber = Number(equation[1]);
      const multiplier = Number(equation[2]);
      const selected = Number(selectedText);
      if (![tableNumber, multiplier, selected].every(Number.isFinite)) return null;
      return { tableNumber, multiplier, selected, answer: tableNumber * multiplier };
    }
    questionRoot = questionRoot.parentElement;
  }

  return null;
}

function DirectAppleCount({ count }: { count: number }) {
  return (
    <div className="multiplication-learning-apple-scene" aria-label={`${count} تفاحات`}>
      <div className="multiplication-learning-tree" aria-hidden="true">🌳</div>
      <div className="multiplication-learning-apple-rain" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const style: AppleStyle = {
            "--learning-apple-left": `${APPLE_POSITIONS[index % APPLE_POSITIONS.length]}%`,
            "--learning-apple-delay": `${index * 72}ms`,
            "--learning-apple-drift": index % 2 === 0 ? `${7 + (index % 3) * 3}px` : `${-7 - (index % 3) * 3}px`,
          };
          return <span className="multiplication-learning-falling-apple" style={style} key={index}>🍎</span>;
        })}
      </div>
      <div className="multiplication-learning-ground" aria-hidden="true" />
    </div>
  );
}

function PlaceValueCount({ answer }: { answer: number }) {
  const tens = Math.floor(answer / 10);
  const ones = answer % 10;
  return (
    <div className="multiplication-learning-place-value">
      <div className="multiplication-learning-baskets" aria-label={`${tens} مجموعات من عشر تفاحات`}>
        {Array.from({ length: tens }, (_, index) => (
          <span className="multiplication-learning-basket" style={{ animationDelay: `${index * 65}ms` }} key={index}>
            <span aria-hidden="true">🧺</span><strong>10</strong>
          </span>
        ))}
      </div>
      {ones > 0 && (
        <div className="multiplication-learning-ones" aria-label={`${ones} تفاحات منفردة`}>
          {Array.from({ length: ones }, (_, index) => (
            <span style={{ animationDelay: `${tens * 65 + index * 70}ms` }} key={index}>🍎</span>
          ))}
        </div>
      )}
      <p>{tens > 0 ? `${tens} × 10` : ""}{tens > 0 && ones > 0 ? " + " : ""}{ones || ""} = {answer}</p>
    </div>
  );
}

export default function MultiplicationLearningFeedback() {
  const [feedback, setFeedback] = useState<LearningFeedback | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const correctAudio = new Audio(CORRECT_SOUND);
    const wrongAudio = new Audio(WRONG_SOUND);
    correctAudio.preload = "auto";
    wrongAudio.preload = "auto";
    correctAudio.volume = 1;
    wrongAudio.volume = 1;
    correctAudioRef.current = correctAudio;
    wrongAudioRef.current = wrongAudio;

    return () => {
      correctAudio.pause();
      wrongAudio.pause();
      correctAudioRef.current = null;
      wrongAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    function playUploadedSound(correct: boolean) {
      const current = correct ? correctAudioRef.current : wrongAudioRef.current;
      const other = correct ? wrongAudioRef.current : correctAudioRef.current;
      other?.pause();
      if (!current) return;
      current.pause();
      current.currentTime = 0;
      void current.play().catch(() => undefined);
    }

    function handleAnswerClick(event: MouseEvent) {
      const interaction = findAnswerInteraction(event.target);
      if (!interaction) return;

      const correct = interaction.selected === interaction.answer;
      playUploadedSound(correct);
      if ("vibrate" in navigator) navigator.vibrate(correct ? [35, 35, 35] : 100);

      setFeedback({ ...interaction, correct, key: Date.now() });
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(
        () => setFeedback(null),
        correct ? CORRECT_DURATION_MS : WRONG_DURATION_MS,
      );
    }

    document.addEventListener("click", handleAnswerClick, true);
    return () => {
      document.removeEventListener("click", handleAnswerClick, true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!feedback) return null;
  const directCount = feedback.answer <= 20;

  return (
    <div className="multiplication-learning-overlay" aria-live="assertive" key={feedback.key}>
      <section
        className={`multiplication-learning-card ${feedback.correct ? "is-correct" : "is-wrong"}`}
        role="dialog"
        aria-modal="true"
        aria-label="شرح الإجابة بصريًا وصوتيًا"
      >
        <div className="multiplication-learning-heading">
          <span aria-hidden="true">{feedback.correct ? "⭐" : "💡"}</span>
          <div>
            <h2>{feedback.correct ? "أحسنت! إجابة صحيحة" : "محاولة جميلة، تعلّم الإجابة"}</h2>
            <p>{feedback.correct ? "شاهد العدد أمامك واستمع للمؤثر." : `اخترت ${feedback.selected}، والصحيح هو ${feedback.answer}.`}</p>
          </div>
        </div>
        <div className="multiplication-learning-equation" dir="ltr">
          {feedback.tableNumber} × {feedback.multiplier} = <strong>{feedback.answer}</strong>
        </div>
        <div className="multiplication-learning-answer-number">{feedback.answer}</div>
        {directCount ? <DirectAppleCount count={feedback.answer} /> : <PlaceValueCount answer={feedback.answer} />}
        <p className="multiplication-learning-caption">
          {directCount ? `أمامك ${feedback.answer} تفاحات، وهو عدد الإجابة.` : "كل سلة تساوي عشر تفاحات، ثم نضيف الآحاد."}
        </p>
      </section>
    </div>
  );
}
