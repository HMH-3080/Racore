import { useEffect, useRef, useState } from "react";
import { FRAME_INTERVAL_MS } from "../lib/animation-frames";

/**
 * Drives a looping animation index. The interval only runs while `active`,
 * so idle components cost nothing.
 */
export function useAnimationIndex(length: number, intervalMs = FRAME_INTERVAL_MS, active = true) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, length, intervalMs]);

  return index;
}

/** Returns the current frame from a frame list, animating while active. */
export function useAnimationFrame(
  frames: readonly string[],
  intervalMs = FRAME_INTERVAL_MS,
  active = true,
) {
  const index = useAnimationIndex(frames.length, intervalMs, active);
  return frames[index] ?? frames[0] ?? "";
}

/** Live elapsed seconds since the component mounted (or since `since`). */
export function useElapsedSeconds(active = true, since?: number) {
  const startRef = useRef(since ?? Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (since !== undefined) startRef.current = since;
  }, [since]);

  useEffect(() => {
    if (!active) return;
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [active]);

  return elapsed;
}
