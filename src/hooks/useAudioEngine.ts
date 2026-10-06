"use client";

import { useSyncExternalStore } from "react";
import { audioEngine } from "@/lib/audio-engine";

const subscribe = (fn: () => void) => audioEngine.subscribe(fn);

export function useAudioEngine() {
  const unlocked = useSyncExternalStore(subscribe, () => audioEngine.unlocked, () => false);
  const muted = useSyncExternalStore(subscribe, () => audioEngine.muted, () => false);
  const current = useSyncExternalStore(subscribe, () => audioEngine.current, () => null);
  return { engine: audioEngine, unlocked, muted, current };
}
