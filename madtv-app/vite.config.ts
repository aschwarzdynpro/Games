// vitest/config erweitert Vites defineConfig um das test-Feld,
// damit Build- und Testkonfiguration in einer Datei bleiben.
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8'));

/**
 * Die Raumbilder aus der Einzeldatei heraushalten.
 *
 * Ein eingebettetes Bild wiegt als Daten-URI rund ein Drittel mehr als die
 * Datei selbst. Drei Räume brachten die Einzeldatei damit von 271 auf 913 KB,
 * und dreizehn hätten daraus gut zwei Megabyte gemacht — für etwas, das man
 * per E-Mail verschickt, zu viel.
 *
 * Die naheliegende Lösung wäre, die Bilder als Nebendateien danebenzulegen.
 * Dann wäre die Einzeldatei aber keine mehr, und genau das ist ihr Zweck.
 * Stattdessen fehlen die Bilder dort ganz: Ein Raum ohne Hintergrund ist keine
 * Szene, und wer keine Szene hat, zeigt sein Panel — derselbe Weg, den die
 * übrigen zehn Räume ohnehin gehen. Der Ordner-Build bleibt vollständig.
 */
function ohneRaumbilder(): Plugin {
  const LEER = '\0madtv:kein-raumbild';
  return {
    name: 'madtv:ohne-raumbilder',
    // Vor Vites eigener Behandlung von Bilddateien, sonst wird das Bild
    // längst als Baustein eingeplant, bevor wir es abfangen können.
    enforce: 'pre',
    resolveId: (id) => (id.endsWith('.webp') ? LEER : null),
    load: (id) => (id === LEER ? 'export default ""' : null),
  };
}

/**
 * Zwei Ausgabeformen aus derselben Quelle:
 *
 *   npm run build          → dist/          (Ordner-Build, z. B. für GitHub Pages)
 *   npm run build:single   → dist-single/   (eine einzige HTML-Datei zum Verschicken)
 *
 * Der Unterschied ist seit den Raumbildern nicht mehr nur die Verpackung: Die
 * Einzeldatei lässt die Bilder weg und zeigt die betroffenen Räume als Panel.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [ohneRaumbilder(), viteSingleFile()] : [],
    // Manifest, Sinnbild und Dienstarbeiter gehören zum Ordner-Build. Die
    // Einzeldatei muss eine Datei bleiben, sonst verliert sie ihren Zweck.
    publicDir: single ? false : 'public',
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      reportCompressedSize: true,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
