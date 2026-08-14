// vitest/config erweitert Vites defineConfig um das test-Feld,
// damit Build- und Testkonfiguration in einer Datei bleiben.
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
