import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  volume: number // 0..1
  reducedMotion: boolean
  /** skip the pack opening animation and show the result at once */
  instantReveal: boolean
  set: (patch: Partial<Pick<Settings, 'volume' | 'reducedMotion' | 'instantReveal'>>) => void
}

// Device settings stay on the device.
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      volume: 0.5,
      reducedMotion: false,
      instantReveal: false,
      set: (patch) => set(patch),
    }),
    { name: 'tcge.settings' },
  ),
)
