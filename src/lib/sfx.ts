// All sound is synthesised in code: short chip-style tones on one pentatonic scale, no audio files.
import { useSettings } from './settings.ts'

interface Tone {
  /** start frequency in Hz */
  f: number
  /** glide target in Hz */
  to?: number
  /** start offset in seconds */
  at?: number
  /** duration in seconds */
  d: number
  type?: OscillatorType
  /** relative volume 0..1 */
  v?: number
}

// C major pentatonic
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568

const PRESETS = {
  click: [{ f: 660, to: 880, d: 0.04, type: 'square', v: 0.25 }],
  toggle: [{ f: 440, to: 660, d: 0.06, type: 'triangle', v: 0.4 }],
  open: [
    { f: C5, d: 0.07, type: 'triangle', v: 0.4 },
    { f: G5, at: 0.05, d: 0.09, type: 'triangle', v: 0.4 },
  ],
  coin: [
    { f: A5, d: 0.06, type: 'square', v: 0.3 },
    { f: E6, at: 0.06, d: 0.18, type: 'square', v: 0.3 },
  ],
  success: [
    { f: C5, d: 0.08, type: 'square', v: 0.28 },
    { f: E5, at: 0.07, d: 0.08, type: 'square', v: 0.28 },
    { f: G5, at: 0.14, d: 0.16, type: 'square', v: 0.28 },
  ],
  error: [
    { f: 160, to: 90, d: 0.16, type: 'sawtooth', v: 0.35 },
    { f: 120, to: 70, at: 0.12, d: 0.2, type: 'sawtooth', v: 0.3 },
  ],
  notify: [
    { f: E5, d: 0.07, type: 'triangle', v: 0.45 },
    { f: A5, at: 0.08, d: 0.14, type: 'triangle', v: 0.45 },
  ],
  levelup: [
    { f: C5, d: 0.09, type: 'square', v: 0.3 },
    { f: E5, at: 0.08, d: 0.09, type: 'square', v: 0.3 },
    { f: G5, at: 0.16, d: 0.09, type: 'square', v: 0.3 },
    { f: C6, at: 0.24, d: 0.3, type: 'square', v: 0.3 },
    { f: G6, at: 0.3, d: 0.25, type: 'triangle', v: 0.25 },
    { f: D5, at: 0.24, d: 0.3, type: 'triangle', v: 0.2 },
  ],
} satisfies Record<string, Tone[]>

export type SfxName = keyof typeof PRESETS
export const SFX_NAMES = Object.keys(PRESETS) as SfxName[]

let ctx: AudioContext | undefined
const lastPlayed = new Map<SfxName, number>()

export function sfx(name: SfxName) {
  const volume = useSettings.getState().volume
  if (volume <= 0 || typeof AudioContext === 'undefined') return
  // Throttle repeats so fast clicking never turns into noise.
  const nowMs = performance.now()
  if (nowMs - (lastPlayed.get(name) ?? -1e9) < 40) return
  lastPlayed.set(name, nowMs)

  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const t0 = ctx.currentTime + 0.005
  const jitter = 1 + (Math.random() - 0.5) * 0.03 // slight pitch variation against fatigue

  for (const tone of PRESETS[name] as Tone[]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = t0 + (tone.at ?? 0)
    const peak = (tone.v ?? 0.3) * volume * 0.6
    osc.type = tone.type ?? 'square'
    osc.frequency.setValueAtTime(tone.f * jitter, start)
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to * jitter, start + tone.d)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.d)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + tone.d + 0.02)
  }
}
