/**
 * Die Weltschicht: gezeichneter Flur mit Fahrstuhl und Zimmertür.
 *
 * Bewusst SVG statt Canvas. Bei gezeichneter Vektorgrafik ist SVG das native
 * Format — kein zweites Rendersystem, keine eigene Trefferflächenrechnung, und
 * Tür wie Fahrstuhl bleiben normale, fokussierbare Elemente.
 *
 * Die Höhe der Szene liegt fest, die Breite richtet sich nach dem Fenster:
 * Statt das Bild zu beschneiden oder zu verzerren, zeigt ein breiter Bildschirm
 * einfach mehr Flur. Fahrstuhl und Tür wandern anteilig mit, damit der Laufweg
 * überall sichtbar bleibt.
 *
 * Aufgebaut wird einmal, danach wird nur noch bewegt. Die Szene liegt außerhalb
 * von #view, damit das Neuzeichnen der Panels sie nicht jedes Mal zerstört.
 */
import { FLOORS } from '../core';

const NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number> = {}, text?: string,
): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Feste Höhe der Szene in Zeicheneinheiten. */
export const SCENE_H = 190;
/** Fußbodenlinie — hier stehen die Füße der Figur. */
export const GROUND = 164;

const MIN_W = 560;
const MAX_W = 1600;

export interface Geometry {
  w: number;
  liftX: number;
  doorX: number;
  /** Wo die Figur vor der Tür zum Stehen kommt. */
  standX: number;
}

/**
 * Feste Abstände statt Prozentwerte: Tür, Fahrstuhl und Figur haben eine feste
 * Größe, also müssen auch ihre Abstände fest sein. Sonst rücken sie auf
 * schmalen Bildschirmen ineinander. Breiter wird nur der Flur dazwischen.
 */
function geometryFor(width: number): Geometry {
  const w = Math.max(MIN_W, Math.min(MAX_W, Math.round(width)));
  const liftX = 68;
  const doorX = w - 130;
  return { w, liftX, doorX, standX: doorX - 86 };
}

export interface WorldState {
  floor: number;
  /** −0,5…0,5 während der Fahrt, für das Vorbeiziehen der Etagen. */
  floorOffset: number;
  charX: number;
  facing: number;
  phase: number;
  walking: boolean;
  charOpacity: number;
  /** 0 = zu, 1 = offen. */
  liftOpen: number;
  roomOpen: boolean;
}

export interface Scene {
  root: SVGSVGElement;
  geo: Geometry;
  slide: SVGGElement;
  corridors: SVGGElement[];
  doorGroup: SVGGElement;
  liftGroup: SVGGElement;
  doorLeaf: SVGGElement;
  doorLight: SVGRectElement;
  liftLeft: SVGRectElement;
  liftRight: SVGRectElement;
  liftGlow: SVGRectElement;
  signPlate: SVGRectElement;
  signText: SVGTextElement;
  signIcon: SVGTextElement;
  floorNum: SVGTextElement;
  charLayer: SVGGElement;
}

/* ─────────── Flurkulisse ─────────── */

function buildCorridor(g: SVGGElement, geo: Geometry): void {
  const { w } = geo;
  g.replaceChildren();

  g.appendChild(svg('rect', { x: 0, y: 0, width: w, height: GROUND, fill: 'url(#wallGrad)' }));
  g.appendChild(svg('rect', { x: 0, y: GROUND - 12, width: w, height: 12, fill: '#232c3a' }));
  g.appendChild(svg('rect', { x: 0, y: GROUND, width: w, height: SCENE_H - GROUND, fill: 'url(#floorGrad)' }));
  for (let x = 0; x < w + 90; x += 78) {
    g.appendChild(svg('line', {
      x1: x, y1: GROUND, x2: x - 24, y2: SCENE_H,
      stroke: 'rgba(255,255,255,.05)', 'stroke-width': 1.4,
    }));
  }

  // Deckenleuchten samt Lichtkegel, gleichmäßig über die Breite verteilt
  const lamps = Math.max(2, Math.round(w / 300));
  for (let i = 0; i < lamps; i++) {
    const x = Math.round((w * (i + 0.5)) / lamps);
    g.appendChild(svg('rect', { x: x - 30, y: 10, width: 60, height: 6, rx: 3, fill: '#3d4a5c' }));
    g.appendChild(svg('rect', { x: x - 26, y: 14, width: 52, height: 3.5, rx: 2, fill: '#ffe9b8', opacity: 0.85 }));
    g.appendChild(svg('path', {
      d: `M${x - 26} 18 L${x - 86} ${GROUND} L${x + 86} ${GROUND} L${x + 26} 18 Z`,
      fill: 'url(#lampGrad)',
    }));
  }

  // Zimmerpflanze in festem Abstand links der Tür
  const tx = geo.doorX - 168;
  g.appendChild(svg('path', { d: `M${tx - 16} ${GROUND} l6 -26 h20 l6 26 z`, fill: '#5a4632' }));
  [`M${tx} ${GROUND - 28} q-24 -16 -28 -40 q24 6 30 38`,
   `M${tx} ${GROUND - 28} q24 -16 28 -40 q-24 6 -30 38`,
   `M${tx} ${GROUND - 28} q-4 -30 2 -46 q9 18 4 46`].forEach((d) =>
    g.appendChild(svg('path', { d, fill: '#2f6b45' })));

  // Was dazwischen noch passt, hängt von der Fluglänge ab — auf schmalen
  // Bildschirmen bleibt die Wand lieber leer als überladen.
  const gap = tx - geo.liftX;
  if (gap > 300) {
    const px = Math.round(geo.liftX + gap * 0.42);
    g.appendChild(svg('rect', { x: px - 44, y: 52, width: 88, height: 58, rx: 3, fill: '#1d2431', stroke: '#3c4759', 'stroke-width': 3 }));
    g.appendChild(svg('path', { d: `M${px - 38} 104 L${px - 8} 70 L${px + 12} 92 L${px + 26} 78 L${px + 38} 104 Z`, fill: '#3b6ea5', opacity: 0.75 }));
    g.appendChild(svg('circle', { cx: px + 22, cy: 66, r: 6, fill: '#e8b45c', opacity: 0.8 }));
  }
  if (gap > 620) {
    const cx = Math.round(geo.liftX + gap * 0.75);
    g.appendChild(svg('circle', { cx, cy: 60, r: 17, fill: '#161c26', stroke: '#3c4759', 'stroke-width': 3 }));
    g.appendChild(svg('line', { x1: cx, y1: 60, x2: cx, y2: 49, stroke: '#cfd8e4', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
    g.appendChild(svg('line', { x1: cx, y1: 60, x2: cx + 8, y2: 64, stroke: '#8b98a9', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  }
}

/* ─────────── Aufbau ─────────── */

export function createScene(): Scene {
  const geo = geometryFor(1000);

  const root = svg('svg', {
    viewBox: `0 0 ${geo.w} ${SCENE_H}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Flur im Sendehochhaus',
  });

  const defs = svg('defs');
  const wall = svg('linearGradient', { id: 'wallGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
  wall.appendChild(svg('stop', { offset: 0, 'stop-color': '#141a24' }));
  wall.appendChild(svg('stop', { offset: 1, 'stop-color': '#1e2735' }));
  const floorG = svg('linearGradient', { id: 'floorGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
  floorG.appendChild(svg('stop', { offset: 0, 'stop-color': '#2a3444' }));
  floorG.appendChild(svg('stop', { offset: 1, 'stop-color': '#161d28' }));
  const lamp = svg('linearGradient', { id: 'lampGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
  lamp.appendChild(svg('stop', { offset: 0, 'stop-color': 'rgba(255,229,170,.16)' }));
  lamp.appendChild(svg('stop', { offset: 1, 'stop-color': 'rgba(255,229,170,0)' }));
  const roomG = svg('linearGradient', { id: 'roomGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
  roomG.appendChild(svg('stop', { offset: 0, 'stop-color': '#ffd89b' }));
  roomG.appendChild(svg('stop', { offset: 1, 'stop-color': '#b8823c' }));
  defs.append(wall, floorG, lamp, roomG);
  root.appendChild(defs);

  // Drei Flurkopien übereinander: beim Fahren zieht die nächste ins Bild
  const slide = svg('g');
  const corridors = [svg('g'), svg('g'), svg('g')];
  corridors[0]!.setAttribute('transform', `translate(0,${-SCENE_H})`);
  corridors[2]!.setAttribute('transform', `translate(0,${SCENE_H})`);
  corridors.forEach((c) => slide.appendChild(c));
  root.appendChild(slide);

  /* Zimmertür */
  const doorGroup = svg('g', { class: 'scene-door', role: 'button', tabindex: '0' });
  doorGroup.appendChild(svg('rect', { x: -46, y: 62, width: 92, height: 102, rx: 4, fill: '#0e131b' }));
  // Hinter der Tür brennt Licht — offen soll sie einladen, nicht wie ein Loch wirken
  const doorLight = svg('rect', { x: -42, y: 66, width: 84, height: 98, fill: 'url(#roomGrad)', opacity: 0 });
  doorGroup.appendChild(doorLight);
  const doorLeaf = svg('g');
  doorLeaf.appendChild(svg('rect', { x: -42, y: 66, width: 84, height: 98, rx: 3, fill: '#6d5334' }));
  doorLeaf.appendChild(svg('rect', { x: -33, y: 76, width: 66, height: 36, rx: 2, fill: '#7d6040' }));
  doorLeaf.appendChild(svg('rect', { x: -33, y: 120, width: 66, height: 34, rx: 2, fill: '#7d6040' }));
  doorLeaf.appendChild(svg('circle', { cx: 30, cy: 118, r: 4, fill: '#e0c070' }));
  doorGroup.appendChild(doorLeaf);
  const signPlate = svg('rect', {
    x: -78, y: 26, width: 156, height: 28, rx: 5,
    fill: '#1b2431', stroke: '#3f4c60', 'stroke-width': 2,
  });
  doorGroup.appendChild(signPlate);
  const signIcon = svg('text', { x: -64, y: 46, 'font-size': 16, 'text-anchor': 'start' }, '🖥️');
  const signText = svg('text', {
    x: 10, y: 45, 'font-size': 13.5, 'font-weight': 700, fill: '#dfe7f1',
    'text-anchor': 'middle', 'font-family': 'Inter, system-ui, sans-serif',
  }, 'Dein Büro');
  doorGroup.append(signIcon, signText);
  root.appendChild(doorGroup);

  /* Fahrstuhl */
  const liftGroup = svg('g', { class: 'scene-lift', role: 'button', tabindex: '0' });
  liftGroup.appendChild(svg('rect', { x: -54, y: 54, width: 108, height: 110, rx: 4, fill: '#0b0f16' }));
  liftGroup.appendChild(svg('rect', { x: -50, y: 58, width: 100, height: 106, fill: '#0a1a24' }));
  const liftGlow = svg('rect', { x: -50, y: 58, width: 100, height: 106, fill: '#4fd6ff', opacity: 0 });
  liftGroup.appendChild(liftGlow);
  const liftLeft = svg('rect', { x: -50, y: 58, width: 50, height: 106, fill: '#465468' });
  const liftRight = svg('rect', { x: 0, y: 58, width: 50, height: 106, fill: '#3d4a5c' });
  liftGroup.append(liftLeft, liftRight);
  liftGroup.appendChild(svg('rect', { x: -54, y: 54, width: 108, height: 110, rx: 4, fill: 'none', stroke: '#5c6b81', 'stroke-width': 4 }));
  liftGroup.appendChild(svg('rect', { x: -28, y: 22, width: 56, height: 24, rx: 4, fill: '#0b1017', stroke: '#3f4c60', 'stroke-width': 2 }));
  const floorNum = svg('text', {
    x: 0, y: 39, 'font-size': 16, 'font-weight': 800, fill: '#5aa9ff',
    'text-anchor': 'middle', 'font-family': 'Inter, system-ui, sans-serif',
  }, '7');
  liftGroup.appendChild(floorNum);
  root.appendChild(liftGroup);

  const charLayer = svg('g');
  root.appendChild(charLayer);

  const scene: Scene = {
    root, geo, slide, corridors, doorGroup, liftGroup, doorLeaf, doorLight,
    liftLeft, liftRight, liftGlow, signPlate, signText, signIcon, floorNum, charLayer,
  };
  resizeScene(scene, geo.w);
  return scene;
}

/** Auf eine neue Breite einstellen — Kulisse neu setzen, Türen umhängen. */
export function resizeScene(s: Scene, cssWidth: number, cssHeight = 0): void {
  // Die Zeichenbreite ergibt sich aus dem Seitenverhältnis des Behälters,
  // damit die Szene weder verzerrt noch beschnitten wird.
  const aspect = cssHeight > 0 ? cssWidth / cssHeight : 1000 / SCENE_H;
  s.geo = geometryFor(aspect * SCENE_H);
  s.root.setAttribute('viewBox', `0 0 ${s.geo.w} ${SCENE_H}`);
  s.corridors.forEach((c) => buildCorridor(c, s.geo));
  s.doorGroup.setAttribute('transform', `translate(${s.geo.doorX},0)`);
  s.liftGroup.setAttribute('transform', `translate(${s.geo.liftX},0)`);
}

export function updateScene(s: Scene, st: WorldState): void {
  const f = FLOORS[Math.max(0, Math.min(FLOORS.length - 1, st.floor))]!;

  s.floorNum.textContent = String(st.floor + 1);
  s.signText.textContent = f.name;
  s.signIcon.textContent = f.ico;

  s.slide.setAttribute('transform', `translate(0,${(st.floorOffset * SCENE_H).toFixed(1)})`);

  const open = Math.max(0, Math.min(1, st.liftOpen));
  s.liftLeft.setAttribute('transform', `translate(${(-open * 48).toFixed(1)},0)`);
  s.liftRight.setAttribute('transform', `translate(${(open * 48).toFixed(1)},0)`);
  s.liftGlow.setAttribute('opacity', String(0.08 + open * 0.1));

  // Die Tür schwingt auf, indem das Blatt zur Angel hin schrumpft
  s.doorLeaf.setAttribute('transform', `translate(-42,0) scale(${st.roomOpen ? 0.2 : 1},1) translate(42,0)`);
  s.doorLight.setAttribute('opacity', st.roomOpen ? '0.5' : '0');
}
