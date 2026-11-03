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

/**
 * Browsers refuse to play sound until the person has clicked, tapped or typed on the page since it loaded, and
 * Safari only remembers that for an element it played during the gesture itself. So each alert tone is created
 * up front and, on the first gesture anywhere in the portal, played muted for an instant. From then on an alert
 * can sound the moment it arrives, even while the person is in another tab. `onUnlocked` runs once that has
 * worked, so a tone refused earlier can be started properly. Returns a function that stops listening.
 */
export function unlockOnFirstGesture(els: HTMLAudioElement[], onUnlocked?: () => void) {
  // pointerup rather than pointerdown: a touch only counts as a gesture once the finger lifts
  const events = ["pointerup", "keydown"] as const;
  const stop = () => events.forEach((e) => window.removeEventListener(e, unlock));
  let busy = false;
  const unlock = () => {
    if (busy) return;
    busy = true;
    Promise.all(
      els.map((el) => {
        if (!el.paused) return; // already sounding: nothing to unlock
        el.muted = true;
        return el
          .play()
          .then(() => {
            el.pause();
            el.currentTime = 0;
          })
          .finally(() => {
            el.muted = false;
          });
      }),
    )
      .then(() => {
        stop();
        onUnlocked?.();
      })
      .catch(() => {}) // the browser didn't count that as a gesture: wait for the next one
      .finally(() => {
        busy = false;
      });
  };
  events.forEach((e) => window.addEventListener(e, unlock));
  return stop;
}
