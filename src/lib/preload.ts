/**
 * Tiny rendezvous between the preloader and the things it waits on. A task (e.g. a 3D scene that has
 * compiled its shaders) calls `signalReady(key)`; the preloader awaits `whenReady(key)`. Either side
 * can arrive first.
 */
type Entry = { promise: Promise<void>; resolve: () => void };

const entries = new Map<string, Entry>();

function entry(key: string) {
  let e = entries.get(key);
  if (!e) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    e = { promise, resolve };
    entries.set(key, e);
  }
  return e;
}

export function signalReady(key: string) {
  entry(key).resolve();
}

export function whenReady(key: string) {
  return entry(key).promise;
}

/** Fired on window once the preloader has lifted */
export const PRELOAD_DONE = "millennium:preload-done";
