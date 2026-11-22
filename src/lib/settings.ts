import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  volume: number // 0..1
  reducedMotion: boolean
  /** skip the pack opening animation and show the result at once */
  instantReveal: boolean
  /** feature tours finished on this device, as `${playerId}:${feature}` */
  seenTours: string[]
  set: (patch: Partial<Pick<Settings, 'volume' | 'reducedMotion' | 'instantReveal'>>) => void
  seeTour: (key: string) => void
}

// Device settings stay on the device.
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      volume: 0.5,
      reducedMotion: false,
      instantReveal: false,
      seenTours: [],
      set: (patch) => set(patch),
      seeTour: (key) => set((s) => (s.seenTours.includes(key) ? s : { seenTours: [...s.seenTours, key] })),
    }),
    { name: 'tcge.settings' },
  ),
)
