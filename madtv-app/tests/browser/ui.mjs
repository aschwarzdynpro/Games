/**
 * Prüfungen, die einen echten Browser brauchen.
 *
 * Alles, was der Spielkern rechnet, prüft Vitest ohne DOM. Was hier steht, ist
 * genau das, was dort nicht messbar ist: ob ein Symbol tatsächlich in seiner
 * Schachtel bleibt, ob eine Regalwand ihre Pfeile bekommt, ob eine Seite auf
 * einem schmalen Gerät seitlich überläuft. Jede einzelne Prüfung hier steht
 * für einen Fehler, der schon einmal da war.
 *
 * Aufruf: `npm run test:ui`. Der Ordner wird vorher frisch gebaut, damit nie
 * ein alter Stand geprüft wird.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = 5599;

/* ─────────── Playwright finden ─────────── */

async function ladePlaywright() {
  // Playwright ist ein CommonJS-Paket; createRequire findet es auch dann, wenn
  // es global statt im Projekt liegt.
  const req = createRequire(import.meta.url);
  const orte = [
    'playwright',
    join(ROOT, 'node_modules/playwright'),
    '/opt/node22/lib/node_modules/playwright',
  ];
  for (const ort of orte) {
    try {
      return req(ort).chromium;
    } catch { /* nächster Ort */ }
  }
  console.error(
    'Playwright ist nicht auffindbar. Diese Prüfung braucht einen Browser:\n' +
    '  npm i -D playwright && npx playwright install chromium\n' +
    'Alle übrigen Prüfungen laufen ohne Browser: npm test',
  );
  process.exit(2);
}

/* ─────────── Winziger Dateiserver ─────────── */

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

function serve() {
  const srv = createServer((req, res) => {
    const pfad = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let datei = join(DIST, normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
    if (!existsSync(datei) || statSync(datei).isDirectory()) datei = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPEN[extname(datei)] ?? 'application/octet-stream' });
    createReadStream(datei).pipe(res);
  });
  return new Promise((ok) => srv.listen(PORT, () => ok(srv)));
}

/* ─────────── Kleiner Prüfläufer ─────────── */

const fehler = [];
let zahl = 0;

function pruefe(name, bedingung, detail = '') {
  zahl++;
  if (bedingung) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fehler.push(name + (detail ? ` — ${detail}` : ''));
  }
}

/* ─────────── Ablauf im Browser ─────────── */

/** Startbildschirm überspringen und die Begrüßungsdialoge wegklicken. */
async function starte(seite) {
  await seite.goto(`http://localhost:${PORT}/`);
  await seite.waitForSelector('#gobtn');
  await seite.click('#gobtn');
  for (let i = 0; i < 5; i++) {
    if (await seite.isVisible('#modal.on')) await seite.click('#mbox .mf button:last-child');
    await seite.waitForTimeout(150);
  }
}

/** Wartet, bis der Fahrstuhl steht — die Fahrt kostet Spielminuten. */
async function angekommen(seite) {
  await seite.waitForFunction(() => window.madtv.session().elevBusy === 0, { timeout: 30_000 });
  await seite.waitForTimeout(250);
}

async function raumRundgang(seite, meldungen) {
  const etagen = await seite.evaluate(() => window.madtv.core.FLOORS.map((f) => f.name));
  for (let i = 0; i < etagen.length; i++) {
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(150);
    await seite.click(`[data-go="${i}"]`);
    await angekommen(seite);
    const zustand = await seite.evaluate(() => ({
      inhalt: !!document.querySelector('#view .room'),
      ueberlauf: document.body.scrollWidth - document.body.clientWidth,
    }));
    pruefe(`Raum «${etagen[i]}» zeichnet`, zustand.inhalt);
    pruefe(`Raum «${etagen[i]}» läuft nicht seitlich über`, zustand.ueberlauf <= 1,
      `${zustand.ueberlauf} px zu breit`);
  }
  pruefe('Rundgang ohne Konsolenfehler', meldungen.length === 0, meldungen.join(' | '));
}

async function main() {
  const chromium = await ladePlaywright();

  console.log('Baue den Ordner …');
  const bau = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  if (bau.status !== 0) {
    console.error(bau.stdout + bau.stderr);
    process.exit(1);
  }

  const srv = await serve();
  const browser = await chromium.launch();

  /* ── Weite Ansicht: Inhalte und Bedienung ── */
  console.log('\nWeite Ansicht (1240×950)');
  const meldungen = [];
  const seite = await browser.newPage({ viewport: { width: 1240, height: 950 } });
  seite.on('pageerror', (e) => meldungen.push('Ausnahme: ' + e.message));
  seite.on('console', (m) => { if (m.type() === 'error') meldungen.push('Konsole: ' + m.text()); });

  await starte(seite);

  // Symbole. Ein <use> ohne Größe füllte einmal die ganze Szene.
  const symbole = await seite.evaluate(() => {
    const fehlend = [];
    let zuGross = 0;
    for (const u of document.querySelectorAll('use')) {
      const id = (u.getAttribute('href') ?? u.getAttribute('xlink:href') ?? '').slice(1);
      if (id && !document.getElementById(id)) fehlend.push(id);
      const r = u.getBoundingClientRect();
      if (r.width > 200 || r.height > 200) zuGross++;
    }
    return { fehlend, zuGross, gesamt: document.querySelectorAll('use').length };
  });
  pruefe('jedes Symbol hat sein <symbol>', symbole.fehlend.length === 0, symbole.fehlend.join(','));
  pruefe('kein Symbol sprengt seine Schachtel', symbole.zuGross === 0,
    `${symbole.zuGross} von ${symbole.gesamt}`);

  // Kopfzeile. Hier stand einmal «8,1 Mio € €».
  const kopf = await seite.evaluate(() => document.getElementById('topbar').innerText);
  pruefe('Kopfzeile ohne doppeltes Währungszeichen', !/€\s*€/.test(kopf), kopf.replace(/\n/g, ' '));
  pruefe('Kopfzeile zeigt die Uhr', /\d\d:\d\d/.test(kopf));

  // Lesbarkeit. Kleine Schrift braucht nach WCAG AA 4,5:1, ab 18px reichen 3:1.
  const kontrast = await seite.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Der Untergrund ist die erste gefüllte Fläche darüber. Elemente über einem
    // Farbverlauf werden übersprungen: Deren Grundfarbe steht nirgends als
    // einzelner Wert, und geraten wäre schlimmer als nicht geprüft.
    const grund = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const st = getComputedStyle(n);
        if (st.backgroundImage !== 'none') return null;
        const c = st.backgroundColor;
        if (c && !/rgba?\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return 'rgb(14,17,22)';
    };

    const schlecht = [];
    for (const el of document.querySelectorAll('#view *, #topbar *, #bottom *')) {
      if (!el.innerText?.trim() || el.children.length || el.offsetParent === null) continue;
      const st = getComputedStyle(el);
      const bg = grund(el);
      if (!bg) continue;
      const px = parseFloat(st.fontSize);
      const noetig = px >= 18 || (px >= 14 && Number(st.fontWeight) >= 700) ? 3 : 4.5;
      const a = lum(st.color), b = lum(bg);
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (k < noetig) {
        schlecht.push(`${k.toFixed(2)}:1 bei ${Math.round(px)}px — «${el.innerText.trim().slice(0, 24)}»`);
      }
    }
    return [...new Set(schlecht)];
  });
  pruefe('alle Texte erreichen den Kontrastwert AA', kontrast.length === 0,
    kontrast.slice(0, 5).join(' | '));

  // Landmarken und Meldungen — ohne die findet ein Vorleseprogramm nichts.
  const struktur = await seite.evaluate(() => ({
    lang: document.documentElement.lang,
    landmarks: ['header', 'main', 'nav'].filter((t) => document.querySelector(t)),
    live: !!document.querySelector('#toasts[aria-live]'),
    ohneNamen: [...document.querySelectorAll('button,[role="button"],[tabindex="0"]')]
      .filter((e) => !(e.innerText || '').trim() && !e.getAttribute('aria-label') && !e.title)
      .map((e) => e.className || e.tagName),
  }));
  pruefe('Seite ist als deutsch ausgezeichnet', struktur.lang === 'de', struktur.lang);
  pruefe('Kopf, Inhalt und Etagenleiste sind Landmarken', struktur.landmarks.length === 3,
    struktur.landmarks.join(','));
  pruefe('Meldungen werden vorgelesen', struktur.live);
  pruefe('jedes bedienbare Element hat einen Namen', struktur.ohneNamen.length === 0,
    struktur.ohneNamen.slice(0, 5).join(','));

  // Die Steckwand
  const tafel = await seite.evaluate(() => ({
    felder: document.querySelectorAll('.pocket.prog').length,
    werbung: document.querySelectorAll('.pocket.ad').length,
    gegen: document.querySelectorAll('.gegen').length,
    stunden: document.querySelectorAll('.bhour').length,
  }));
  pruefe('Sendeplan hat 7 Werbeplätze', tafel.werbung === 7, String(tafel.werbung));
  pruefe('Sendeplan hat 7 Stundenschilder', tafel.stunden === 7, String(tafel.stunden));
  pruefe('Gegenüber-Spalte hat 14 Halbstunden', tafel.gegen === 14, String(tafel.gegen));
  pruefe('Sendeplan hat Felder', tafel.felder > 0, String(tafel.felder));

  // Tastatur. Jede Station muss sichtbar umrandet sein, sonst weiß niemand,
  // wo er gerade steht.
  const ohneRahmen = [];
  const stationen = [];
  for (let i = 0; i < 20; i++) {
    await seite.keyboard.press('Tab');
    const f = await seite.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const st = getComputedStyle(a);
      return {
        name: (a.innerText || a.getAttribute('aria-label') || a.className || a.tagName).trim().slice(0, 24),
        rahmen: st.outlineStyle !== 'none' && st.outlineWidth !== '0px',
      };
    });
    if (!f) continue;
    stationen.push(f.name);
    if (!f.rahmen) ohneRahmen.push(f.name);
  }
  pruefe('Tabulator erreicht mindestens 15 Stationen', stationen.length >= 15, String(stationen.length));
  pruefe('jede Tabulatorstation ist sichtbar umrandet', ohneRahmen.length === 0,
    [...new Set(ohneRahmen)].slice(0, 5).join(','));

  // Regalwände: was überläuft, braucht Pfeile, und die schalten am Rand ab.
  await seite.keyboard.press('Escape');
  await seite.waitForTimeout(150);
  await seite.click('[data-go="5"]');                      // Werbeagentur
  await angekommen(seite);
  const regal = await seite.evaluate(() => {
    const r = document.querySelector('.kartei');
    const kasten = r?.closest('[data-railbox]');
    const knoepfe = [...(kasten?.querySelectorAll('[data-rail]') ?? [])];
    return {
      ueberlauf: r ? r.scrollWidth > r.clientWidth + 4 : false,
      knoepfe: knoepfe.length,
      linksAus: knoepfe[0]?.disabled === true,
      rechtsAn: knoepfe[1]?.disabled === false,
    };
  });
  pruefe('Kundenkartei läuft über', regal.ueberlauf);
  pruefe('Kundenkartei hat zwei Pfeile', regal.knoepfe === 2, String(regal.knoepfe));
  pruefe('linker Pfeil ist am Anfang aus', regal.linksAus);
  pruefe('rechter Pfeil ist am Anfang an', regal.rechtsAn);

  await seite.click('[data-railbox]:has(.kartei) [data-rail="1"]');
  await seite.waitForTimeout(700);
  const nachher = await seite.evaluate(() => ({
    pos: document.querySelector('.kartei').scrollLeft,
    linksAn: document.querySelector('[data-railbox]:has(.kartei) [data-rail="-1"]').disabled === false,
  }));
  pruefe('rechter Pfeil scrollt', nachher.pos > 20, `scrollLeft ${nachher.pos}`);
  pruefe('linker Pfeil schaltet sich danach frei', nachher.linksAn);

  await raumRundgang(seite, meldungen);
  await seite.close();

  /* ── Schmale Ansichten: nichts darf seitlich überlaufen ── */
  for (const [name, breite, hoehe] of [['schmal', 500, 800], ['Telefon', 390, 844]]) {
    console.log(`\n${name} (${breite}×${hoehe})`);
    const mm = [];
    const s = await browser.newPage({ viewport: { width: breite, height: hoehe } });
    s.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    s.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(s);

    const lage = await s.evaluate(() => ({
      ueberlauf: document.body.scrollWidth - document.body.clientWidth,
      gegenSichtbar: [...document.querySelectorAll('.gegen')].some((x) => x.offsetParent !== null),
      knopfHoehe: Math.min(...[...document.querySelectorAll('#bottom button')]
        .map((b) => b.getBoundingClientRect().height)),
    }));
    pruefe(`${name}: kein seitlicher Überlauf`, lage.ueberlauf <= 1, `${lage.ueberlauf} px`);
    pruefe(`${name}: Gegenüber-Spalte weicht dem eigenen Plan`, lage.gegenSichtbar === (breite > 520));
    pruefe(`${name}: Schaltflächen sind mindestens 32 px hoch`, lage.knopfHoehe >= 32,
      `${Math.round(lage.knopfHoehe)} px`);
    pruefe(`${name}: keine Konsolenfehler`, mm.length === 0, mm.join(' | '));
    await s.close();
  }

  await browser.close();
  srv.close();

  console.log(`\n${zahl - fehler.length}/${zahl} Prüfungen bestanden.`);
  if (fehler.length) {
    console.error('\nFehlgeschlagen:\n  ' + fehler.join('\n  '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
