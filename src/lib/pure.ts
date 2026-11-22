import { useSyncExternalStore } from 'react'

/** Deterministic pseudo-random number in [0, 1) for visual effects (pure, so safe during render). */
export function hash01(i: number, k = 0): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// A shared one-second clock for countdowns.
let current = 0
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    current = Date.now()
    timer = setInterval(() => {
      current = Date.now()
      listeners.forEach((l) => l())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

/** Device time in ms, refreshed every second (0 before the first tick). */
export const useNow = () => useSyncExternalStore(subscribe, () => current, () => 0)
