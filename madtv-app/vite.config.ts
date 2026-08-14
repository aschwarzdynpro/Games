// vitest/config erweitert Vites defineConfig um das test-Feld,
// damit Build- und Testkonfiguration in einer Datei bleiben.
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8'));

/**
 * Zwei Ausgabeformen aus derselben Quelle:
 *
 *   npm run build          → dist/          (Ordner-Build, z. B. für GitHub Pages)
 *   npm run build:single   → dist-single/   (eine einzige HTML-Datei zum Verschicken)
 *
 * Solange die Grafik aus Vektoren besteht, bleibt die Einzeldatei klein genug,
 * dass sich das Spiel weiterhin per Doppelklick öffnen lässt.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
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
