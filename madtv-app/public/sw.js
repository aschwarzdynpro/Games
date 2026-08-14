/*
 * Offlinebetrieb.
 *
 * Das Spiel ist nach dem Laden vollständig eigenständig — es fragt keinen
 * Server mehr. Nur die Dateien selbst müssen da sein. Der Dienstarbeiter legt
 * deshalb jede erfolgreich geladene Datei ab und bedient sie beim nächsten Mal
 * aus dem Speicher, wenn das Netz fehlt.
 *
 * Bewusst «Netz zuerst, Speicher als Rückfall» statt umgekehrt: Ein neu
 * veröffentlichter Stand soll sofort ankommen und nicht erst nach einem
 * zweiten Besuch.
 */
const CACHE = 'madtv-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./index.html'))),
  );
});
