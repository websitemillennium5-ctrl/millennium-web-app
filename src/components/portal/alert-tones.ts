/**
 * Short alert sounds for the staff portal, rendered once to WAV blobs for <audio> elements. Audio elements keep
 * playing in a background tab, where browsers throttle timers and would silence anything scheduled from JavaScript.
 */

/** A short tune ([frequency, start second] per note) rendered to a WAV object URL. */
export function toneUrl(notes: [number, number][], seconds: number) {
  const rate = 22050;
  const n = Math.round(rate * seconds);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    for (const [freq, at] of notes) {
      const dt = t - at;
      if (dt >= 0 && dt < 0.18) v += Math.sin(2 * Math.PI * freq * t) * Math.min(1, dt / 0.01, (0.18 - dt) / 0.05);
    }
    pcm[i] = Math.round(v * 0.25 * 32767);
  }
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + n * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/** Looping three-note alarm for a visitor nobody has answered. */
export const alarmUrl = () =>
  toneUrl(
    [
      [880, 0],
      [1175, 0.22],
      [880, 0.44],
    ],
    1.6,
  );

/** Two-note ping for a new message in a chat this staff member is handling. */
export const pingUrl = () =>
  toneUrl(
    [
      [880, 0],
      [1175, 0.14],
    ],
    0.6,
  );

/** Rising three-note chime, played once when a new enquiry arrives. */
export const chimeUrl = () =>
  toneUrl(
    [
      [659, 0],
      [784, 0.16],
      [1047, 0.32],
    ],
    0.8,
  );

export const canNotify = () => typeof window !== "undefined" && "Notification" in window;
/** The portal is not what the person is looking at: another tab, another app, or the browser window in the background. */
export const away = () => document.visibilityState === "hidden" || !document.hasFocus();
