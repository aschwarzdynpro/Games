/**
 * Die Figur, die durch die Flure läuft.
 *
 * Gezeichnet, nicht gepixelt: der Gang entsteht aus Drehungen an Schulter und
 * Hüfte, nicht aus Einzelbildern. Das spart eine Sprite-Pipeline und bleibt bei
 * jeder Auflösung scharf — der Preis ist ein etwas schematischer Gang, was zum
 * Stil der Figur passt.
 *
 * Maße in Szeneneinheiten; die Füße stehen auf y = 0.
 */

const NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export interface Character {
  root: SVGGElement;
  private_: {
    flip: SVGGElement;
    bob: SVGGElement;
    armBack: SVGGElement;
    armFront: SVGGElement;
    legBack: SVGGElement;
    legFront: SVGGElement;
    briefcase: SVGGElement;
  };
}

export function createCharacter(): Character {
  const root = svg('g', { class: 'figure' });
  const flip = svg('g');
  const bob = svg('g');

  // Schatten bleibt außerhalb der Wipp-Gruppe, sonst hüpft er mit
  root.appendChild(svg('ellipse', {
    cx: 0, cy: 1, rx: 15, ry: 4, fill: 'rgba(0,0,0,.35)',
  }));

  const legBack = svg('g', { transform: 'rotate(0)' });
  legBack.appendChild(svg('rect', { x: -4, y: -1, width: 8, height: 27, rx: 4, fill: '#2f3b4d' }));
  legBack.appendChild(svg('rect', { x: -6, y: 22, width: 13, height: 6, rx: 3, fill: '#1b2330' }));

  const legFront = svg('g', { transform: 'rotate(0)' });
  legFront.appendChild(svg('rect', { x: -4, y: -1, width: 8, height: 27, rx: 4, fill: '#3b4a60' }));
  legFront.appendChild(svg('rect', { x: -6, y: 22, width: 13, height: 6, rx: 3, fill: '#232c3b' }));

  const legs = svg('g', { transform: 'translate(0,-26)' });
  legs.appendChild(legBack);
  legs.appendChild(legFront);

  const armBack = svg('g');
  armBack.appendChild(svg('rect', { x: -3.5, y: -2, width: 7, height: 23, rx: 3.5, fill: '#c9552f' }));
  const armFront = svg('g');
  armFront.appendChild(svg('rect', { x: -3.5, y: -2, width: 7, height: 23, rx: 3.5, fill: '#e26b41' }));
  armFront.appendChild(svg('circle', { cx: 0, cy: 21, r: 3.6, fill: '#f0c39a' }));

  // Aktentasche in der vorderen Hand — Programmdirektor eben
  const briefcase = svg('g', { transform: 'translate(0,0)' });
  briefcase.appendChild(svg('rect', { x: -7, y: 21, width: 14, height: 11, rx: 2, fill: '#6b4a2a' }));
  briefcase.appendChild(svg('rect', { x: -7, y: 24, width: 14, height: 1.6, fill: '#4a3320' }));
  armFront.appendChild(briefcase);

  const torso = svg('g', { transform: 'translate(0,-52)' });
  torso.appendChild(svg('rect', { x: -11, y: 0, width: 22, height: 30, rx: 7, fill: '#e26b41' }));
  torso.appendChild(svg('rect', { x: -11, y: 20, width: 22, height: 10, rx: 4, fill: '#c9552f' }));
  // Kragen
  torso.appendChild(svg('path', { d: 'M-6 0 L0 8 L6 0 Z', fill: '#f6f1e6' }));

  const head = svg('g', { transform: 'translate(0,-52)' });
  head.appendChild(svg('rect', { x: -3, y: -6, width: 6, height: 8, rx: 3, fill: '#f0c39a' }));
  head.appendChild(svg('circle', { cx: 0, cy: -16, r: 11, fill: '#f7cfa6' }));
  head.appendChild(svg('path', {
    d: 'M-11 -18 a11 11 0 0 1 22 0 q-4 -6 -11 -5 q-7 -1 -11 5 Z', fill: '#4a3524',
  }));
  head.appendChild(svg('circle', { cx: 4.5, cy: -15, r: 1.4, fill: '#2a1d12' }));
  head.appendChild(svg('path', { d: 'M2 -10 q3 1.5 6 0', stroke: '#c98b62', 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }));

  bob.appendChild(legs);
  bob.appendChild(armBack);
  bob.appendChild(torso);
  bob.appendChild(head);
  bob.appendChild(armFront);

  armBack.setAttribute('transform', 'translate(0,-44)');
  armFront.setAttribute('transform', 'translate(0,-44)');

  flip.appendChild(bob);
  root.appendChild(flip);

  return { root, private_: { flip, bob, armBack, armFront, legBack, legFront, briefcase } };
}

export interface Pose {
  /** Position in Szeneneinheiten. */
  x: number;
  y: number;
  /** 1 = nach rechts, -1 = nach links. */
  facing: number;
  /** Schrittphase in Radiant; bei 0 steht die Figur. */
  phase: number;
  walking: boolean;
  /** 0 = unsichtbar (z. B. in der Kabine). */
  opacity: number;
}

export function poseCharacter(c: Character, p: Pose): void {
  const { flip, bob, armBack, armFront, legBack, legFront } = c.private_;

  c.root.setAttribute('transform', `translate(${p.x.toFixed(2)},${p.y.toFixed(2)})`);
  c.root.style.opacity = String(p.opacity);
  flip.setAttribute('transform', `scale(${p.facing},1)`);

  if (!p.walking) {
    bob.setAttribute('transform', 'translate(0,0)');
    legBack.setAttribute('transform', 'rotate(-3)');
    legFront.setAttribute('transform', 'rotate(3)');
    armBack.setAttribute('transform', 'translate(0,-44) rotate(6)');
    armFront.setAttribute('transform', 'translate(0,-44) rotate(-6)');
    return;
  }

  const swing = Math.sin(p.phase);
  const leg = swing * 27;
  const arm = -swing * 21;
  // Der Körper hebt sich zweimal je Schrittzyklus
  const lift = -Math.abs(Math.cos(p.phase)) * 1.8;

  bob.setAttribute('transform', `translate(0,${lift.toFixed(2)})`);
  legBack.setAttribute('transform', `rotate(${(-leg).toFixed(1)})`);
  legFront.setAttribute('transform', `rotate(${leg.toFixed(1)})`);
  armBack.setAttribute('transform', `translate(0,-44) rotate(${(-arm).toFixed(1)})`);
  armFront.setAttribute('transform', `translate(0,-44) rotate(${arm.toFixed(1)})`);
}
