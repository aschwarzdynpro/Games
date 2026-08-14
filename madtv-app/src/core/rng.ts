/**
 * Deterministischer Zufall.
 *
 * Die alte Fassung benutzte Math.random(). Damit ließ sich eine Partie nie
 * reproduzieren: ein Fehler an Tag 34 war weg, sobald man neu startete, und
 * Balancing-Läufe waren nicht vergleichbar. Jeder Spielstand trägt jetzt seinen
 * Zufallszustand mit sich — gleicher Startwert, gleicher Spielverlauf.
 *
 * mulberry32: klein, schnell, statistisch für Spielzwecke mehr als ausreichend.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Zustand zum Speichern. */
  get state(): number {
    return this.s;
  }
  set state(v: number) {
    this.s = v >>> 0;
  }

  /** Gleichverteilt in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganzzahl in [min, max], beide einschließlich. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Zufälliges Element. Wirft bei leerer Liste, statt undefined zu liefern. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: leere Liste');
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Zufällig gemischte Kopie. */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  /** true mit Wahrscheinlichkeit p. */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

/**
 * Stabiler Hash für Werte, die aus einem Titel abgeleitet werden
 * (Zuschauerwert, Kritik, Kinokasse). Unabhängig vom Rng: derselbe Filmtitel
 * hat in jeder Partie dieselben Kennzahlen.
 */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
