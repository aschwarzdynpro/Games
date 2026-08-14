/**
 * Bindeglied zwischen Spielzustand und gezeichnetem Flur.
 *
 * Die Weltschicht liest nur — sie verändert den Spielstand nicht. Bewegung
 * entsteht aus dem Fahrstuhlzähler der Sitzung: Der Kern bezahlt Spielminuten,
 * die Szene macht daraus einen Weg.
 */
import type { RoomId } from '../core';
import { createCharacter, poseCharacter } from './character';
import type { Character } from './character';
import { GROUND, createScene, resizeScene, updateScene } from './scene';
import type { Scene, WorldState } from './scene';
import { easeInOut, planTravel, travelAt } from './travel';
import type { TravelPlan } from './travel';

const STRIDE = 32;   // Szeneneinheiten je Schritt

let scene: Scene | null = null;
let figure: Character | null = null;
let plan: TravelPlan | null = null;
let reduceMotion = false;
let visible = true;
let host: HTMLElement | null = null;

export interface WorldHooks {
  /** Etage, in der die Figur gerade steht. */
  floor: () => number;
  /** Offener Raum, oder null im Flur. */
  room: () => RoomId | null;
  /** Verbleibende Fahrminuten und Gesamtdauer der laufenden Fahrt. */
  travel: () => { busy: number; total: number; target: number | null };
  onDoor: () => void;
  onLift: () => void;
}

let hooks: WorldHooks | null = null;

export function mountWorld(container: HTMLElement, h: WorldHooks): void {
  hooks = h;
  host = container;
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  scene = createScene();
  figure = createCharacter();
  scene.charLayer.appendChild(figure.root);
  container.replaceChildren(scene.root);

  // Die Szene richtet ihre Zeichenbreite nach dem Behälter, damit sie weder
  // verzerrt noch beschnitten wird — ein breiter Bildschirm zeigt mehr Flur.
  const fit = () => {
    if (!scene) return;
    const r = container.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) resizeScene(scene, r.width, r.height);
  };
  fit();
  new ResizeObserver(fit).observe(container);

  const door = scene.root.querySelector<SVGGElement>('.scene-door');
  const lift = scene.root.querySelector<SVGGElement>('.scene-lift');
  const bind = (n: SVGGElement | null, fn: () => void, label: string) => {
    if (!n) return;
    n.setAttribute('aria-label', label);
    n.style.cursor = 'pointer';
    n.addEventListener('click', fn);
    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  };
  bind(door, h.onDoor, 'Raum betreten');
  bind(lift, h.onLift, 'Fahrstuhl rufen');
}

export function isMounted(): boolean {
  return scene !== null && visible;
}

/**
 * Flur ein- oder ausblenden. Ausgeblendet wird auch nicht mehr gerechnet —
 * wer die Grafik abschaltet, soll auch nichts dafür bezahlen.
 */
export function setWorldVisible(v: boolean): void {
  visible = v;
  host?.classList.toggle('hidden', !v);
}

export function isWorldVisible(): boolean {
  return visible;
}

/** Neue Fahrt ankündigen, damit die Szene den Weg aufteilen kann. */
export function beginTravel(from: number, to: number, totalMinutes: number): void {
  plan = planTravel(from, to, totalMinutes);
}

export function clearTravel(): void {
  plan = null;
}

/**
 * Einmal je Bild. `alpha` ist der Bruchteil der laufenden Spielminute — damit
 * bewegt sich die Figur flüssig und nicht im Minutentakt.
 */
export function updateWorld(alpha: number): void {
  if (!scene || !figure || !hooks) return;

  const { busy, total, target } = hooks.travel();
  const room = hooks.room();
  const floor = hooks.floor();

  const geo = scene.geo;
  const st: WorldState = {
    floor,
    floorOffset: 0,
    charX: geo.standX,
    facing: 1,
    phase: 0,
    walking: false,
    charOpacity: 1,
    liftOpen: 0,
    roomOpen: room !== null,
  };

  if (busy > 0 && plan) {
    const elapsed = Math.max(0, plan.total - busy + (reduceMotion ? 0 : alpha));
    const t = travelAt(plan, elapsed);

    switch (t.phase) {
      case 'toLift': {
        const e = easeInOut(t.t);
        st.charX = geo.standX + (geo.liftX - geo.standX) * e;
        st.facing = -1;
        st.walking = !reduceMotion;
        st.phase = ((geo.standX - st.charX) / STRIDE) * Math.PI;
        st.liftOpen = Math.max(0, (t.t - 0.72) / 0.28);
        st.roomOpen = false;
        break;
      }
      case 'ride': {
        st.charOpacity = 0;
        st.liftOpen = 0;
        st.roomOpen = false;
        // Die Etagen ziehen vorbei: ganzzahlige Schritte plus weicher Rest
        const span = plan.to - plan.from;
        const exact = plan.from + span * easeInOut(t.t);
        st.floor = Math.round(exact);
        st.floorOffset = Math.max(-0.5, Math.min(0.5, exact - st.floor)) * -1;
        break;
      }
      case 'toDoor': {
        const e = easeInOut(t.t);
        st.charX = geo.liftX + (geo.standX - geo.liftX) * e;
        st.facing = 1;
        st.walking = !reduceMotion;
        st.phase = ((st.charX - geo.liftX) / STRIDE) * Math.PI;
        st.floor = plan.to;
        st.liftOpen = Math.max(0, 1 - t.t / 0.28);
        st.roomOpen = false;
        break;
      }
      default: {
        st.floor = plan.to;
        break;
      }
    }
    if (target !== null && t.phase !== 'toLift') st.floor = t.phase === 'ride' ? st.floor : target;
    if (total <= 0) st.floorOffset = 0;
  }

  updateScene(scene, st);
  poseCharacter(figure, {
    x: st.charX,
    y: GROUND,
    facing: st.facing,
    phase: st.phase,
    walking: st.walking,
    opacity: st.charOpacity,
  });
}
