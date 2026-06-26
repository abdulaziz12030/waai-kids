"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Props = {
  segmentId: string;
  hasAudio: boolean;
  audioDurationSeconds?: number | null;
  onUploaded: () => Promise<void> | void;
};

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function supportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function fileExtension(mimeType: string) {
  const normalized = mimeType.split(";")[0];
  if (normalized === "audio/mp4" || normalized === "audio/x-m4a") return "m4a";
  if (normalized === "audio/mpeg") return "mp3";
  if (normalized === "audio/ogg") return "ogg";
  if (normalized === "audio/wav") return "wav";
  return "webm";
}

export default function QuranAudioRecorder({ segmentId, hasAudio, audioDurationSeconds, onUploaded }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const previewUrlRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setLocalPreview(url: string) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    clearTimer();
    stopStream();
    setRecording(false);
  }

  function clearLocalRecording(clearMessages = true) {
    setLocalPreview("");
    setAudioBlob(null);
    setElapsed(0);
    if (clearMessages) {
      setError("");
      setSuccess("");
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      stopStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function startRecording() {
    setError("");
    setSuccess("");
    setSavedUrl("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("هذا المتصفح لا يدعم التسجيل الصوتي. جرّب متصفح Chrome أو Safari المحدث.");
      return;
    }

    try {
      clearLocalRecording(false);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = supportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        if (blob.size > 0) {
          setAudioBlob(blob);
          setLocalPreview(URL.createObjectURL(blob));
        } else {
          setError("لم يتم التقاط صوت. أعد المحاولة وتأكد من السماح للميكروفون.");
        }
        recorderRef.current = null;
      };

      recorder.start(1000);
      startedAtRef.current = Date.now();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const seconds = Math.min(300, Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
        setElapsed(seconds);
        if (seconds >= 300) stopRecording();
      }, 250);
    } catch {
      stopStream();
      setRecording(false);
      setError("تعذر تشغيل الميكروفون. اسمح للمنصة باستخدامه ثم أعد المحاولة.");
    }
  }

  async function uploadRecording() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token || !audioBlob) return;

    const duration = Math.max(1, elapsed);
    const baseMime = (audioBlob.type || "audio/webm").split(";")[0];
    const file = new File([audioBlob], `quran-recitation.${fileExtension(baseMime)}`, { type: baseMime });
    const form = new FormData();
    form.append("session_token", token);
    form.append("segment_id", segmentId);
    form.append("duration_seconds", String(duration));
    form.append("audio", file);

    setUploading(true);
    setError("");
    setSuccess("");
    const result = await client.functions.invoke("quran-audio", { body: form });
    setUploading(false);

    if (result.error || !result.data?.success) {
      setError(result.data?.error || "تعذر إرسال التسجيل. تحقق من الاتصال ثم أعد المحاولة.");
      return;
    }

    clearLocalRecording(false);
    setSavedUrl(result.data.signedUrl || "");
    setSuccess("تم إرسال تسجيلك بنجاح إلى ولي الأمر أو المعلم.");
    await onUploaded();
  }

  async function loadSavedAudio() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;

    setLoadingSaved(true);
    setError("");
    const result = await client.functions.invoke("quran-audio", {
      body: { action: "child-url", session_token: token, segment_id: segmentId }
    });
    setLoadingSaved(false);

    if (result.error || !result.data?.signedUrl) {
      setError(result.data?.error || "تعذر تشغيل التسجيل المحفوظ.");
      return;
    }
    setSavedUrl(result.data.signedUrl);
  }

  return (
    <section className="quran-audio-recorder">
      <div className="quran-audio-heading">
        <span>🎙️</span>
        <div>
          <strong>{hasAudio ? "تسجيل التسميع محفوظ" : "سجّل تسميعك"}</strong>
          <small>استمع قبل الإرسال، ويمكنك إعادة التسجيل. الحد الأقصى 5 دقائق.</small>
        </div>
      </div>

      {recording && (
        <div className="quran-recording-live">
          <span className="recording-dot" />
          <strong>جارٍ التسجيل {formatSeconds(elapsed)}</strong>
          <button type="button" onClick={stopRecording}>إيقاف التسجيل</button>
        </div>
      )}

      {!recording && !audioBlob && (
        <div className="quran-audio-actions">
          <button className="record-button" type="button" onClick={startRecording}>
            {hasAudio ? "إعادة التسجيل" : "بدء التسجيل"}
          </button>
          {hasAudio && !savedUrl && (
            <button type="button" disabled={loadingSaved} onClick={loadSavedAudio}>
              {loadingSaved ? "جارٍ التحميل..." : `الاستماع لتسجيلي${audioDurationSeconds ? ` (${formatSeconds(audioDurationSeconds)})` : ""}`}
            </button>
          )}
        </div>
      )}

      {previewUrl && audioBlob && (
        <div className="quran-audio-preview">
          <strong>استمع قبل الإرسال</strong>
          <audio controls src={previewUrl} />
          <div className="quran-audio-actions">
            <button className="send-audio-button" type="button" disabled={uploading} onClick={uploadRecording}>
              {uploading ? "جارٍ رفع التسجيل..." : "إرسال التسجيل للتسميع"}
            </button>
            <button type="button" disabled={uploading} onClick={() => clearLocalRecording()}>حذف وإعادة التسجيل</button>
          </div>
        </div>
      )}

      {savedUrl && !previewUrl && (
        <div className="quran-audio-preview saved">
          <strong>التسجيل المرسل</strong>
          <audio controls src={savedUrl} />
        </div>
      )}

      {error && <p className="quran-audio-message error">{error}</p>}
      {success && <p className="quran-audio-message success">{success}</p>}
    </section>
  );
}
