// Original procedural sound created for WAAI KIDS. No third-party samples are used.
function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export default function createArabianHorseAudioUrl() {
  const sampleRate = 22050;
  const duration = 2.1;
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
  let noiseSeed = 20260628;
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    let frequency: number;
    if (time < 0.65) frequency = 310 + 260 * Math.pow(time / 0.65, 0.8);
    else if (time < 1.35) frequency = 570 - 150 * ((time - 0.65) / 0.7);
    else frequency = 420 - 210 * ((time - 1.35) / 0.75);

    const vibrato = 1 + 0.045 * Math.sin(Math.PI * 2 * 7.2 * time) + 0.018 * Math.sin(Math.PI * 2 * 13 * time);
    phase += Math.PI * 2 * frequency * vibrato / sampleRate;

    noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
    const noise = (noiseSeed / 4294967295) * 2 - 1;
    const attack = Math.min(1, time / 0.08);
    const release = Math.min(1, (duration - time) / 0.35);
    const dip = 1 - 0.42 * Math.exp(-Math.pow((time - 1.08) / 0.12, 2));
    const quiver = 0.82 + 0.18 * Math.pow(Math.sin(Math.PI * 2 * 10.5 * time), 2);
    const envelope = Math.max(0, attack * release * dip * quiver);

    const voiced = 0.62 * Math.sin(phase) + 0.23 * Math.sin(2.02 * phase) + 0.11 * Math.sin(3.05 * phase);
    const breath = 0.055 * noise * Math.sin(Math.PI * Math.min(1, time / duration));
    const sample = Math.tanh((voiced + breath) * envelope * 1.25) * 0.78;
    view.setInt16(44 + index * 2, Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
