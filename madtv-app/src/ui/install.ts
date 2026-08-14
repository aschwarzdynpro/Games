/**
 * Verteilung: installierbar und offline spielbar.
 *
 * Das Spiel gibt es in zwei Ausgabeformen, und nur eine davon darf Nebendateien
 * haben. Die Einzeldatei zum Doppelklicken oder Verschicken muss eine Datei
 * bleiben — ein Manifest oder ein Dienstarbeiter daneben würde genau das
 * kaputtmachen. Beides wird deshalb erst zur Laufzeit angehängt, und nur im
 * Ordner-Build.
 *
 * Über `file://` geht ohnehin keins von beidem: Dienstarbeiter setzen einen
 * Ursprung voraus, den eine lokale Datei nicht hat.
 */

const isSingle = import.meta.env.MODE === 'single';
const isHttp = typeof location !== 'undefined' && location.protocol.startsWith('http');

export function setupInstall(): void {
  if (isSingle || !isHttp) return;

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = new URL('manifest.webmanifest', document.baseURI).href;
  document.head.appendChild(link);

  if (!('serviceWorker' in navigator)) return;
  // Erst nach dem Laden anmelden: Der Dienstarbeiter soll den Start nicht
  // ausbremsen, sondern nur den zweiten Besuch retten.
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI).href, { scope: './' })
      .catch(() => { /* ohne Offlinebetrieb läuft das Spiel genauso */ });
  });
}

/** Fassung und Ausgabeform, für die Fußzeile der Einstellungen. */
export function buildInfo(): string {
  return `Fassung ${__APP_VERSION__} · ${isSingle ? 'Einzeldatei' : 'Ordner-Build'}`;
}
