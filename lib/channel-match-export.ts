import { channelBalance, type ChannelMatch } from "./channel-balance";
import { parseChannelMatchPreset } from "./peq-preset";
import type { Point } from "./curves";

export function channelMatchText(match: ChannelMatch) {
  if (!match.channelMatchPreset) throw new Error("No uploaded channel-match preset is attached.");
  return match.channelMatchPreset.channels.map((channel, index) => `CH: ${index}\nPreamp: ${channel.preampDb} dB\n${channel.filters.map((f, i) => `Filter ${i + 1}: ON ${f.type} Fc ${f.hz} Hz Gain ${f.gain} dB Q ${f.q}`).join("\n")}\n`).join("\n");
}

export function safeChannelMatch(value: ChannelMatch): ChannelMatch {
  const points = (rows: Point[] | undefined) => {
    if (rows === undefined) return undefined;
    if (!Array.isArray(rows) || rows.length < 10 || rows.length > 2000 || rows.some((p, i) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || p[0] < 20 || p[0] > 20000 || Math.abs(p[1]) > 200 || i > 0 && p[0] <= rows[i - 1][0])) throw new Error("Invalid channel-match response.");
    return rows.map(([hz, db]): Point => [hz, db]);
  };
  const level = (db = 0) => { if (!Number.isFinite(db) || Math.abs(db) > 200) throw new Error("Invalid channel level."); return db; };
  const match: ChannelMatch = { leftPoints: points(value.leftPoints), rightPoints: points(value.rightPoints), leftLevelDb: level(value.leftLevelDb), rightLevelDb: level(value.rightLevelDb), channelMatchMode: value.channelMatchMode === "custom" ? "custom" : "auto" };
  if (value.channelMatchPreset) match.channelMatchPreset = parseChannelMatchPreset(channelMatchText(value));
  if (!(match.leftPoints && match.rightPoints) && !(match.channelMatchMode === "custom" && match.channelMatchPreset)) throw new Error("Attach Left and Right responses or a two-channel preset first.");
  return match;
}

/** Exact stereo float32 FIR used by listening, including conservative boost headroom. */
export function channelMatchWav(match: ChannelMatch, sampleRate = 48000): ArrayBuffer {
  const result = channelBalance(safeChannelMatch(match), sampleRate);
  if (!result) throw new Error("No channel match is available.");
  const frames = result.impulses[0].length, bytes = frames * 8;
  const buffer = new ArrayBuffer(44 + bytes), view = new DataView(buffer);
  const word = (offset: number, text: string) => [...text].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
  word(0, "RIFF"); view.setUint32(4, 36 + bytes, true); word(8, "WAVE"); word(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 8, true); view.setUint16(32, 8, true); view.setUint16(34, 32, true);
  word(36, "data"); view.setUint32(40, bytes, true);
  const gain = 10 ** (-(Math.max(0, result.maxBoostDb) + 1.5) / 20);
  for (let frame = 0; frame < frames; frame++) for (let ch = 0; ch < 2; ch++) view.setFloat32(44 + frame * 8 + ch * 4, result.impulses[ch][frame] * gain, true);
  return buffer;
}

export function downloadLocalFile(name: string, contents: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function autoMatchFilename(name: string, uploaded = false) {
  const model = name.replace(/[^a-z0-9_-]/gi, "-").replace(/-+/g,"-").slice(0,70) || "headphones";
  return `${model}-${uploaded ? "uploaded-channel-match" : "YinYang-AutoMatch"}-48k.wav`;
}
