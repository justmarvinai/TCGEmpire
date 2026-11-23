// All sound is synthesised in code: short chip-style tones on one pentatonic scale, no audio files.
import { useSettings } from './settings.ts'

interface Tone {
  /** start frequency in Hz (for noise: filter frequency) */
  f: number
  /** glide target in Hz */
  to?: number
  /** start offset in seconds */
  at?: number
  /** duration in seconds */
  d: number
  type?: OscillatorType | 'noise'
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
  flip: [{ f: 900, to: 1400, d: 0.035, type: 'triangle', v: 0.35 }],
  tear: [
    // foil crinkle, then the rip
    { f: 6000, d: 0.03, type: 'noise', v: 0.3 },
    { f: 5200, at: 0.05, d: 0.03, type: 'noise', v: 0.25 },
    { f: 6400, at: 0.09, d: 0.03, type: 'noise', v: 0.3 },
    { f: 3200, to: 900, at: 0.13, d: 0.22, type: 'noise', v: 0.55 },
    { f: 1800, to: 500, at: 0.21, d: 0.18, type: 'noise', v: 0.4 },
  ],
  newcard: [{ f: G5, d: 0.05, type: 'triangle', v: 0.25 }],
  rare: [
    { f: E5, d: 0.07, type: 'square', v: 0.25 },
    { f: A5, at: 0.07, d: 0.12, type: 'square', v: 0.25 },
  ],
  holo: [
    { f: C5, d: 0.07, type: 'triangle', v: 0.35 },
    { f: E5, at: 0.06, d: 0.07, type: 'triangle', v: 0.35 },
    { f: G5, at: 0.12, d: 0.07, type: 'triangle', v: 0.35 },
    { f: C6, at: 0.18, d: 0.2, type: 'triangle', v: 0.35 },
    { f: E6, at: 0.22, d: 0.25, type: 'sine', v: 0.2 },
  ],
  alternative: [
    { f: D5, d: 0.08, type: 'square', v: 0.25 },
    { f: G5, at: 0.07, d: 0.08, type: 'square', v: 0.25 },
    { f: A5, at: 0.14, d: 0.08, type: 'square', v: 0.25 },
    { f: D5 * 2, at: 0.21, d: 0.3, type: 'square', v: 0.25 },
    { f: A5 * 2, at: 0.27, d: 0.3, type: 'sine', v: 0.2 },
  ],
  ultra: [
    { f: 110, to: 55, d: 0.35, type: 'triangle', v: 0.6 },
    { f: C5, at: 0.05, d: 0.1, type: 'square', v: 0.28 },
    { f: E5, at: 0.13, d: 0.1, type: 'square', v: 0.28 },
    { f: G5, at: 0.21, d: 0.1, type: 'square', v: 0.28 },
    { f: C6, at: 0.29, d: 0.45, type: 'square', v: 0.28 },
    { f: E6, at: 0.29, d: 0.45, type: 'triangle', v: 0.2 },
    { f: G6, at: 0.36, d: 0.4, type: 'sine', v: 0.18 },
  ],
  grail: [
    { f: 82, to: 41, d: 0.6, type: 'triangle', v: 0.7 },
    { f: 4000, to: 600, d: 0.5, type: 'noise', v: 0.35 },
    { f: C5, at: 0.15, d: 0.12, type: 'square', v: 0.28 },
    { f: E5, at: 0.25, d: 0.12, type: 'square', v: 0.28 },
    { f: G5, at: 0.35, d: 0.12, type: 'square', v: 0.28 },
    { f: C6, at: 0.45, d: 0.12, type: 'square', v: 0.28 },
    { f: E6, at: 0.55, d: 0.12, type: 'square', v: 0.28 },
    { f: G6, at: 0.65, d: 0.9, type: 'square', v: 0.26 },
    { f: C6, at: 0.65, d: 0.9, type: 'triangle', v: 0.26 },
    { f: E6 * 2, at: 0.8, d: 0.7, type: 'sine', v: 0.16 },
  ],
  charge: [{ f: 180, to: 1100, d: 1.2, type: 'sawtooth', v: 0.18 }],
  stamp: [
    { f: 140, to: 60, d: 0.12, type: 'square', v: 0.5 },
    { f: 2400, to: 800, d: 0.06, type: 'noise', v: 0.3 },
  ],
  bottle: [{ f: 1400, to: 2100, d: 0.06, type: 'triangle', v: 0.3 }],
  sold: [
    { f: 2600, to: 1200, d: 0.05, type: 'noise', v: 0.3 },
    { f: G5, at: 0.04, d: 0.07, type: 'square', v: 0.25 },
    { f: G6, at: 0.1, d: 0.35, type: 'triangle', v: 0.3 },
    { f: C6, at: 0.1, d: 0.35, type: 'sine', v: 0.2 },
  ],
  outbid: [
    { f: G5, d: 0.12, type: 'square', v: 0.22 },
    { f: D5, at: 0.13, d: 0.12, type: 'square', v: 0.22 },
    { f: C5, to: C5 * 0.92, at: 0.26, d: 0.4, type: 'square', v: 0.22 },
  ],
  alarm: [
    { f: 700, to: 1100, d: 0.25, type: 'square', v: 0.18 },
    { f: 1100, to: 700, at: 0.25, d: 0.25, type: 'square', v: 0.18 },
    { f: 700, to: 1100, at: 0.5, d: 0.25, type: 'square', v: 0.18 },
    { f: 1100, to: 700, at: 0.75, d: 0.25, type: 'square', v: 0.18 },
  ],
  quest: [
    { f: 140, to: 60, d: 0.1, type: 'square', v: 0.4 },
    { f: G5, at: 0.06, d: 0.07, type: 'square', v: 0.26 },
    { f: C6, at: 0.13, d: 0.07, type: 'square', v: 0.26 },
    { f: E6, at: 0.2, d: 0.07, type: 'square', v: 0.26 },
    { f: G6, at: 0.27, d: 0.3, type: 'triangle', v: 0.28 },
  ],
  shard: [{ f: 5000, to: 1500, d: 0.15, type: 'noise', v: 0.45 }],
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
let lastAny = -1e9

/** Plays a preset. `soft` sounds (toasts) stay silent when another sound just started: one action, one sound. */
export function sfx(name: SfxName, soft = false) {
  const volume = useSettings.getState().volume
  if (volume <= 0 || typeof AudioContext === 'undefined') return
  // Throttle repeats so fast clicking never turns into noise.
  const nowMs = performance.now()
  if (soft && nowMs - lastAny < 250) return
  if (nowMs - (lastPlayed.get(name) ?? -1e9) < 40) return
  lastPlayed.set(name, nowMs)
  lastAny = nowMs

  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const t0 = ctx.currentTime + 0.005
  const jitter = 1 + (Math.random() - 0.5) * 0.03 // slight pitch variation against fatigue

  for (const tone of PRESETS[name] as Tone[]) {
    const gain = ctx.createGain()
    const start = t0 + (tone.at ?? 0)
    const peak = (tone.v ?? 0.3) * volume * 0.6
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.d)
    gain.connect(ctx.destination)

    if (tone.type === 'noise') {
      // Filtered white noise: paper tearing, shards, impacts.
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 0.8
      filter.frequency.setValueAtTime(tone.f, start)
      if (tone.to) filter.frequency.exponentialRampToValueAtTime(tone.to, start + tone.d)
      src.connect(filter).connect(gain)
      src.start(start)
      src.stop(start + tone.d + 0.02)
      continue
    }
    const osc = ctx.createOscillator()
    osc.type = tone.type ?? 'square'
    osc.frequency.setValueAtTime(tone.f * jitter, start)
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to * jitter, start + tone.d)
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + tone.d + 0.02)
  }
}

let noise: AudioBuffer | undefined
function noiseBuffer(ac: AudioContext) {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}
