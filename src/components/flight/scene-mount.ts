"use client";

import { useEffect, useRef, useState } from "react";

/** How long a scene stays mounted after scrolling out of view on a phone before its GPU memory is given back. */
const LINGER_MS = 4000;
/** Pause before rebuilding a canvas whose WebGL context the browser dropped, and how many rebuilds a minute allows. */
const REBUILD_MS = 1000;
const MAX_REBUILDS = 3;

/**
 * Whether a scene's canvas should be on the page. Desktops keep it always. Phones create it as soon as the section
 * comes near the viewport and only drop it once it has been out of view for a while, so a quick scroll back and
 * forth never tears the WebGL context down and rebuilds it (every rebuild paints blank frames first). A context the
 * browser drops on its own is rebuilt after a short pause, a few times at most, so a phone that is out of GPU
 * memory doesn't flash through an endless rebuild loop.
 */
export function useSceneMount(lite: boolean, inView: boolean) {
  // "away" = out of view long enough to let the canvas go; cleared again shortly after it comes back
  const [away, setAway] = useState(false);
  const [key, setKey] = useState(0);
  const [lost, setLost] = useState(false);
  // Unmounting the canvas forces a context loss too; that one is ours and must not count as the browser's
  const tearingDown = useRef(false);
  const rebuilds = useRef<number[]>([]);

  useEffect(() => {
    if (!lite) return;
    const timer = inView
      ? window.setTimeout(() => {
          tearingDown.current = false;
          setAway(false);
        }, 0)
      : window.setTimeout(() => {
          tearingDown.current = true;
          setAway(true);
        }, LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [lite, inView]);

  const show = !lite || inView || !away;

  const onContextLost = () => {
    if (tearingDown.current) {
      tearingDown.current = false;
      return;
    }
    setLost(true);
  };

  useEffect(() => {
    if (!lost || !inView || !show) return;
    const now = Date.now();
    rebuilds.current = rebuilds.current.filter((t) => now - t < 60_000);
    if (rebuilds.current.length >= MAX_REBUILDS) return; // the sky stays; the plane sits this one out
    rebuilds.current.push(now);
    const timer = window.setTimeout(() => {
      setLost(false);
      setKey((k) => k + 1);
    }, REBUILD_MS);
    return () => window.clearTimeout(timer);
  }, [lost, inView, show]);

  return { show, key, onContextLost };
}
