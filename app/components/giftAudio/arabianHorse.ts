// Original procedural sound created for WAAI KIDS. No third-party samples are used.
function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function softClip(value: number) {
  return Math.tanh(value * 1.35) * 0.82;
}

export default function createArabianHorseAudioUrl() {
  const sampleRate = 22050;
  const duration = 4.8;
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
  const hoofTimes = [0.18, 0.43, 0.68, 0.94, 1.18, 1.43, 1.68, 1.95, 2.2, 2.48, 2.75, 3.05];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967295) * 2 - 1;

    let hoof = 0;
    for (const hoofTime of hoofTimes) {
      const delta = time - hoofTime;
      if (delta >= 0 && delta < 0.12) {
        const envelope = Math.exp(-delta * 36);
        const tone = Math.sin(Math.PI * 2 * (86 - delta * 210) * delta);
        hoof += (tone * 0.72 + noise * 0.2) * envelope;
      }
    }

    const neighTime = time - 2.65;
    let neigh = 0;
    if (neighTime >= 0 && neighTime < 1.85) {
      const rise = Math.min(1, neighTime / 0.16);
      const fall = Math.min(1, (1.85 - neighTime) / 0.34);
      const contour = neighTime < 0.62
        ? 300 + 360 * Math.pow(neighTime / 0.62, 0.78)
        : neighTime < 1.22
          ? 660 - 150 * ((neighTime - 0.62) / 0.6)
          : 510 - 240 * ((neighTime - 1.22) / 0.63);
      const vibrato = 1 + 0.052 * Math.sin(Math.PI * 2 * 7.6 * neighTime) + 0.018 * Math.sin(Math.PI * 2 * 13.2 * neighTime);
      phase += Math.PI * 2 * contour * vibrato / sampleRate;
      const voiced = 0.62 * Math.sin(phase) + 0.22 * Math.sin(2.04 * phase) + 0.1 * Math.sin(3.1 * phase);
      const breath = noise * 0.06 * Math.sin(Math.PI * neighTime / 1.85);
      const quiver = 0.78 + 0.22 * Math.pow(Math.sin(Math.PI * 2 * 9.8 * neighTime), 2);
      neigh = (voiced + breath) * rise * fall * quiver;
    }

    const windEnvelope = Math.sin(Math.PI * Math.min(1, time / duration));
    const wind = noise * 0.022 * windEnvelope;
    const sample = softClip(hoof * 0.82 + neigh * 0.86 + wind);
    view.setInt16(44 + index * 2, Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
