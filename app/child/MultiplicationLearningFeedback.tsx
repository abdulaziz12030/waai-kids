"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Feedback = {
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

function normalizeDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
}

function findAnswer(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return null;

  const selectedText = normalizeDigits(button.textContent || "").trim();
  if (!/^\d+$/.test(selectedText)) return null;

  let root: HTMLElement | null = button.parentElement;
  for (let depth = 0; depth < 5 && root; depth += 1) {
    const text = normalizeDigits(root.textContent || "");
    const equation = text.match(/(\d+)\s*[×xX*]\s*(\d+)\s*=\s*[؟?]/);
    if (text.includes("اختر الإجابة الصحيحة") && equation) {
      const tableNumber = Number(equation[1]);
      const multiplier = Number(equation[2]);
      const selected = Number(selectedText);
      if (![tableNumber, multiplier, selected].every(Number.isFinite)) return null;
      return { tableNumber, multiplier, selected, answer: tableNumber * multiplier };
    }
    root = root.parentElement;
  }
  return null;
}

function muteLegacyWebAudio() {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const classes = [window.AudioContext, audioWindow.webkitAudioContext].filter(Boolean) as Array<typeof AudioContext>;
  const restorers: Array<() => void> = [];

  classes.forEach((AudioContextClass) => {
    const prototype = AudioContextClass.prototype as unknown as { createGain: AudioContext["createGain"] };
    const original = prototype.createGain;
    if (!original || (original as unknown as { __waaiMuted?: boolean }).__waaiMuted) return;

    const muted = function (this: AudioContext) {
      const node = original.call(this);
      const parameter = node.gain;
      parameter.value = 0;
      parameter.setValueAtTime = () => parameter;
      parameter.linearRampToValueAtTime = () => parameter;
      parameter.exponentialRampToValueAtTime = () => parameter;
      return node;
    } as AudioContext["createGain"] & { __waaiMuted?: boolean };

    muted.__waaiMuted = true;
    prototype.createGain = muted;
    restorers.push(() => {
      if (prototype.createGain === muted) prototype.createGain = original;
    });
  });

  window.setTimeout(() => restorers.forEach((restore) => restore()), 1600);
}

function Apples({ count }: { count: number }) {
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

function PlaceValue({ answer }: { answer: number }) {
  const tens = Math.floor(answer / 10);
  const ones = answer % 10;
  return (
    <div className="multiplication-learning-place-value">
      <div className="multiplication-learning-baskets">
        {Array.from({ length: tens }, (_, index) => (
          <span className="multiplication-learning-basket" style={{ animationDelay: `${index * 65}ms` }} key={index}>
            <span aria-hidden="true">🧺</span><strong>10</strong>
          </span>
        ))}
      </div>
      {ones > 0 && (
        <div className="multiplication-learning-ones">
          {Array.from({ length: ones }, (_, index) => <span key={index}>🍎</span>)}
        </div>
      )}
      <p>{tens > 0 ? `${tens} × 10` : ""}{tens > 0 && ones > 0 ? " + " : ""}{ones || ""} = {answer}</p>
    </div>
  );
}

export default function MultiplicationLearningFeedback() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    correctRef.current = new Audio(CORRECT_SOUND);
    wrongRef.current = new Audio(WRONG_SOUND);
    correctRef.current.preload = "auto";
    wrongRef.current.preload = "auto";
    correctRef.current.volume = 1;
    wrongRef.current.volume = 1;

    const stop = (audio: HTMLAudioElement | null) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    };

    const onClick = (event: MouseEvent) => {
      const interaction = findAnswer(event.target);
      if (!interaction) return;

      const correct = interaction.selected === interaction.answer;
      muteLegacyWebAudio();
      stop(correctRef.current);
      stop(wrongRef.current);

      const audio = correct ? correctRef.current : wrongRef.current;
      if (audio) void audio.play().catch(() => undefined);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if ("vibrate" in navigator) navigator.vibrate(correct ? [35, 35, 35] : 100);

      setFeedback({ ...interaction, correct, key: Date.now() });
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFeedback(null), correct ? 5000 : 6300);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      stop(correctRef.current);
      stop(wrongRef.current);
      correctRef.current = null;
      wrongRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!feedback) return null;
  const directCount = feedback.answer <= 20;

  return (
    <div className="multiplication-learning-overlay" aria-live="assertive" key={feedback.key}>
      <section className={`multiplication-learning-card ${feedback.correct ? "is-correct" : "is-wrong"}`} role="dialog" aria-modal="true">
        <div className="multiplication-learning-heading">
          <span aria-hidden="true">{feedback.correct ? "⭐" : "💡"}</span>
          <div>
            <h2>{feedback.correct ? "أحسنت! إجابة صحيحة" : "محاولة جميلة، تعلّم الإجابة"}</h2>
            <p>{feedback.correct ? "شاهد العدد أمامك." : `اخترت ${feedback.selected}، والصحيح هو ${feedback.answer}.`}</p>
          </div>
        </div>
        <div className="multiplication-learning-equation" dir="ltr">
          {feedback.tableNumber} × {feedback.multiplier} = <strong>{feedback.answer}</strong>
        </div>
        <div className="multiplication-learning-answer-number">{feedback.answer}</div>
        {directCount ? <Apples count={feedback.answer} /> : <PlaceValue answer={feedback.answer} />}
        <p className="multiplication-learning-caption">
          {directCount ? `أمامك ${feedback.answer} تفاحات، وهو عدد الإجابة.` : "كل سلة تساوي عشر تفاحات، ثم نضيف الآحاد."}
        </p>
      </section>
    </div>
  );
}
