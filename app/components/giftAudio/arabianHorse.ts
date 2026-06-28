// Original procedural sound created for WAAI KIDS. No third-party samples are used.
function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function softClip(value: number) {
  return Math.tanh(value * 1.35) * 0.82;
}

export default function createArabianHorseAudioUrl() {
  const sampleRate = 22050;
  const duration = 6.2;
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

  let phase = 0;
  let seed = 20260628;
  const hoofTimes = [0.18, 0.41, 0.64, 0.88, 1.1, 1.32, 1.55, 1.78, 2.02, 2.25, 2.5, 2.76, 3.02, 3.28, 3.55];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967295) * 2 - 1;

    let hoof = 0;
    for (const hoofTime of hoofTimes) {
      const delta = time - hoofTime;
      if (delta >= 0 && delta < 0.13) {
        const envelope = Math.exp(-delta * 34);
        const tone = Math.sin(Math.PI * 2 * (92 - delta * 230) * delta);
        hoof += (tone * 0.74 + noise * 0.22) * envelope;
      }
    }

    const neighTime = time - 2.75;
    let neigh = 0;
    if (neighTime >= 0 && neighTime < 2.05) {
      const rise = Math.min(1, neighTime / 0.16);
      const fall = Math.min(1, (2.05 - neighTime) / 0.38);
      const contour = neighTime < 0.66
        ? 285 + 390 * Math.pow(neighTime / 0.66, 0.78)
        : neighTime < 1.28
          ? 675 - 145 * ((neighTime - 0.66) / 0.62)
          : 530 - 260 * ((neighTime - 1.28) / 0.77);
      const vibrato = 1 + 0.055 * Math.sin(Math.PI * 2 * 7.4 * neighTime) + 0.02 * Math.sin(Math.PI * 2 * 13.4 * neighTime);
      phase += Math.PI * 2 * contour * vibrato / sampleRate;
      const voiced = 0.63 * Math.sin(phase) + 0.23 * Math.sin(2.04 * phase) + 0.11 * Math.sin(3.08 * phase);
      const breath = noise * 0.065 * Math.sin(Math.PI * neighTime / 2.05);
      const quiver = 0.76 + 0.24 * Math.pow(Math.sin(Math.PI * 2 * 9.6 * neighTime), 2);
      neigh = (voiced + breath) * rise * fall * quiver;
    }

    const jumpDelta = time - 4.18;
    const jumpWhoosh = jumpDelta >= 0 && jumpDelta < 0.72
      ? noise * Math.sin(Math.PI * jumpDelta / 0.72) * (0.25 + jumpDelta * 0.18)
      : 0;

    const landingDelta = time - 4.9;
    const landing = landingDelta >= 0 && landingDelta < 0.42
      ? (Math.sin(Math.PI * 2 * (72 - landingDelta * 90) * landingDelta) * 0.8 + noise * 0.25) * Math.exp(-landingDelta * 13)
      : 0;

    const windEnvelope = Math.sin(Math.PI * Math.min(1, time / duration));
    const wind = noise * 0.02 * windEnvelope;
    const sample = softClip(hoof * 0.82 + neigh * 0.9 + jumpWhoosh * 0.38 + landing * 0.68 + wind);
    view.setInt16(44 + index * 2, Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
