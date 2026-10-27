import { useSyncExternalStore } from "react";

/** Phones and tablets, whose GPUs can't afford what a desktop can (kept free of three.js so any component can import it) */
export const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const noSubscribe = () => () => {};

/** `coarse`, but false during server render and hydration so markup always matches */
export function useCoarse() {
  return useSyncExternalStore(noSubscribe, () => coarse, () => false);
}
