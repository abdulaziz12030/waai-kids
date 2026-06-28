// Original procedural soundtrack created exclusively for WAAI KIDS. No third-party audio samples are used.
function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function softClip(value: number) {
  return Math.tanh(value * 1.32) * 0.84;
}

function neighVoice(time: number, start: number, length: number, phase: { value: number }, sampleRate: number, noise: number) {
  const local = time - start;
  if (local < 0 || local >= length) return 0;
  const rise = Math.min(1, local / 0.14);
  const fall = Math.min(1, (length - local) / 0.32);
  const firstTurn = length * 0.37;
  const secondTurn = length * 0.68;
  const contour = local < firstTurn
    ? 270 + 410 * Math.pow(local / firstTurn, 0.76)
    : local < secondTurn
      ? 680 - 155 * ((local - firstTurn) / (secondTurn - firstTurn))
      : 525 - 255 * ((local - secondTurn) / (length - secondTurn));
  const vibrato = 1 + 0.058 * Math.sin(Math.PI * 2 * 7.5 * local) + 0.018 * Math.sin(Math.PI * 2 * 13.1 * local);
  phase.value += Math.PI * 2 * contour * vibrato / sampleRate;
  const voiced = 0.62 * Math.sin(phase.value) + 0.23 * Math.sin(2.03 * phase.value) + 0.1 * Math.sin(3.08 * phase.value);
  const breath = noise * 0.068 * Math.sin(Math.PI * local / length);
  const quiver = 0.75 + 0.25 * Math.pow(Math.sin(Math.PI * 2 * 9.5 * local), 2);
  return (voiced + breath) * rise * fall * quiver;
}

export default function createArabianHorseAudioUrl() {
  const sampleRate = 22050;
  const duration = 8.8;
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

  const openingPhase = { value: 0 };
  const finalePhase = { value: 0 };
  let seed = 20260628;
  const hoofTimes = [1.92, 2.14, 2.36, 2.58, 2.8, 3.02, 3.24, 3.47, 3.7, 3.93, 4.17, 4.4, 4.64];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967295) * 2 - 1;

    let hoof = 0;
    for (const hoofTime of hoofTimes) {
      const delta = time - hoofTime;
      if (delta >= 0 && delta < 0.14) {
        const envelope = Math.exp(-delta * 33);
        const lowTone = Math.sin(Math.PI * 2 * (92 - delta * 235) * delta);
        const groundCrack = noise * Math.exp(-delta * 55);
        hoof += (lowTone * 0.73 + groundCrack * 0.25) * envelope;
      }
    }

    const openingNeigh = neighVoice(time, 0.72, 1.38, openingPhase, sampleRate, noise) * 0.64;
    const finaleNeigh = neighVoice(time, 6.12, 1.75, finalePhase, sampleRate, noise) * 0.86;

    const jumpDelta = time - 4.58;
    const jumpWhoosh = jumpDelta >= 0 && jumpDelta < 0.82
      ? noise * Math.sin(Math.PI * jumpDelta / 0.82) * (0.24 + jumpDelta * 0.25)
      : 0;

    const landingDelta = time - 5.47;
    const landing = landingDelta >= 0 && landingDelta < 0.5
      ? (Math.sin(Math.PI * 2 * (68 - landingDelta * 82) * landingDelta) * 0.86 + noise * 0.3) * Math.exp(-landingDelta * 12)
      : 0;

    const openingRise = Math.min(1, time / 1.25);
    const windFall = Math.min(1, (duration - time) / 1.1);
    const wind = noise * 0.021 * openingRise * windFall;
    const desertDrone = Math.sin(Math.PI * 2 * 43 * time) * 0.018 * Math.sin(Math.PI * Math.min(1, time / duration));
    const sandRush = time > 1.7 && time < 5.8 ? noise * 0.018 * Math.sin(Math.PI * (time - 1.7) / 4.1) : 0;

    const sample = softClip(
      hoof * 0.86 +
      openingNeigh +
      finaleNeigh +
      jumpWhoosh * 0.42 +
      landing * 0.75 +
      wind +
      desertDrone +
      sandRush
    );
    view.setInt16(44 + index * 2, Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
