/**
 * Tonsignale, vollständig synthetisiert — keine Audiodateien, damit die
 * Einzeldatei-Ausgabe klein bleibt.
 */
import type { SfxName } from '../core';

interface Voice {
  f: number[];
  t: number;
  type: OscillatorType;
  gain: number;
}

const SFX: Record<SfxName, Voice> = {
  onair: { f: [220, 330, 440],       t: 0.10, type: 'triangle', gain: 0.16 },
  cash:  { f: [880, 1320],           t: 0.07, type: 'square',   gain: 0.09 },
  miss:  { f: [300, 190],            t: 0.11, type: 'sawtooth', gain: 0.09 },
  buy:   { f: [520, 780],            t: 0.06, type: 'triangle', gain: 0.10 },
  bad:   { f: [240, 150, 110],       t: 0.13, type: 'sawtooth', gain: 0.12 },
  award: { f: [523, 659, 784, 1047], t: 0.11, type: 'triangle', gain: 0.14 },
  love:  { f: [659, 880, 1047],      t: 0.12, type: 'sine',     gain: 0.14 },
};

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function playSfx(name: SfxName): void {
  if (!enabled) return;
  const s = SFX[name];
  if (!s) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    s.f.forEach((freq, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      const t0 = ctx!.currentTime + i * s.t;
      o.type = s.type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(s.gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.t);
      o.connect(g);
      g.connect(ctx!.destination);
      o.start(t0);
      o.stop(t0 + s.t + 0.02);
    });
  } catch {
    // Ton ist Beiwerk — daran darf das Spiel nie scheitern.
  }
}
