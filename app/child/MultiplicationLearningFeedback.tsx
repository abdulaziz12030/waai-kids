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
const SMALL_NUMBERS = [
  "صفر",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];
const TENS: Record<number, string> = {
  20: "عشرون",
  30: "ثلاثون",
  40: "أربعون",
  50: "خمسون",
  60: "ستون",
  70: "سبعون",
  80: "ثمانون",
  90: "تسعون",
};

function numberToArabicWords(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number < 20) return SMALL_NUMBERS[number];
  if (number < 100) {
    const tensValue = Math.floor(number / 10) * 10;
    const ones = number % 10;
    return ones ? `${SMALL_NUMBERS[ones]} و${TENS[tensValue]}` : TENS[tensValue];
  }
  if (number < 200) {
    const remainder = number - 100;
    return remainder ? `مئة و${numberToArabicWords(remainder)}` : "مئة";
  }
  return String(number);
}

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
      return {
        tableNumber,
        multiplier,
        selected,
        answer: tableNumber * multiplier,
      };
    }
    questionRoot = questionRoot.parentElement;
  }

  return null;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createToneDataUrl(correct: boolean) {
  const sampleRate = 8000;
  const duration = correct ? 0.38 : 0.42;
  const sampleCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.018);
    const release = Math.min(1, (duration - time) / 0.07);
    let frequency = 0;
    let amplitude = 0.62;

    if (correct) {
      frequency = time < 0.14 ? 659.25 : time < 0.2 ? 0 : 987.77;
    } else {
      frequency = time < 0.17 ? 230 : time < 0.23 ? 0 : 165;
      amplitude = 0.52;
    }

    const sample = frequency
      ? Math.sin(2 * Math.PI * frequency * time) * amplitude * attack * Math.max(0, release)
      : 0;
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:audio/wav;base64,${window.btoa(binary)}`;
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
          {Array.from({ length: ones }, (_, index) => <span style={{ animationDelay: `${tens * 65 + index * 70}ms` }} key={index}>🍎</span>)}
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
  const voiceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    correctAudioRef.current = new Audio(createToneDataUrl(true));
    wrongAudioRef.current = new Audio(createToneDataUrl(false));
    correctAudioRef.current.preload = "auto";
    wrongAudioRef.current.preload = "auto";
    correctAudioRef.current.volume = 1;
    wrongAudioRef.current.volume = 1;

    return () => {
      correctAudioRef.current?.pause();
      wrongAudioRef.current?.pause();
      correctAudioRef.current = null;
      wrongAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    function playClearSound(correct: boolean) {
      const audio = correct ? correctAudioRef.current : wrongAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
    }

    function speakEquation(interaction: NonNullable<ReturnType<typeof findAnswerInteraction>>, correct: boolean) {
      if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
      window.speechSynthesis.cancel();

      const equationWords = `${numberToArabicWords(interaction.tableNumber)} ضرب ${numberToArabicWords(interaction.multiplier)} يساوي ${numberToArabicWords(interaction.answer)}`;
      const utterance = new SpeechSynthesisUtterance(correct ? `أحسنت. ${equationWords}.` : `محاولة جيدة. ${equationWords}.`);
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "ar-sa")
        || voices.find((voice) => voice.lang.toLowerCase().startsWith("ar"))
        || null;
      utterance.lang = utterance.voice?.lang || "ar-SA";
      utterance.rate = 0.88;
      utterance.pitch = correct ? 1.08 : 0.96;
      utterance.volume = 1;
      voiceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    function handleAnswerClick(event: MouseEvent) {
      const interaction = findAnswerInteraction(event.target);
      if (!interaction) return;

      const correct = interaction.selected === interaction.answer;
      playClearSound(correct);
      speakEquation(interaction, correct);

      if ("vibrate" in navigator) navigator.vibrate(correct ? [35, 35, 35] : 100);

      setFeedback({
        ...interaction,
        correct,
        key: Date.now(),
      });

      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setFeedback(null), 2250);
    }

    document.addEventListener("click", handleAnswerClick, true);
    return () => {
      document.removeEventListener("click", handleAnswerClick, true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      window.speechSynthesis?.cancel();
      voiceRef.current = null;
    };
  }, []);

  if (!feedback) return null;

  const directCount = feedback.answer <= 20;
  return (
    <div className="multiplication-learning-overlay" aria-live="assertive" key={feedback.key}>
      <section className={`multiplication-learning-card ${feedback.correct ? "is-correct" : "is-wrong"}`} role="dialog" aria-modal="true" aria-label="شرح الإجابة بصريًا وصوتيًا">
        <div className="multiplication-learning-heading">
          <span aria-hidden="true">{feedback.correct ? "⭐" : "💡"}</span>
          <div>
            <h2>{feedback.correct ? "أحسنت! إجابة صحيحة" : "محاولة جميلة، تعلّم الإجابة"}</h2>
            <p>{feedback.correct ? "استمع للمعادلة وشاهد العدد أمامك." : `اخترت ${feedback.selected}، والصحيح هو ${feedback.answer}.`}</p>
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
