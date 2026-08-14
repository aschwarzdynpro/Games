# Mad TV — Sendermanager (App-Fassung)

Umbau des Einzeldatei-Spiels aus `../madtv/` zu einem richtigen Projekt.
Der Stand entspricht **Etappe 1**: Vite + TypeScript, Spielkern herausgelöst
und typisiert, Simulation testbar. Gespielt wird noch dieselbe Oberfläche.

Die alte `../madtv/index.html` bleibt unangetastet, bis diese Fassung sie
eingeholt hat.

## Loslegen

```bash
npm install
npm run dev            # Entwicklungsserver mit Hot Reload
npm test               # Simulationstests
npm run build          # dist/         — Ordner-Build (z. B. GitHub Pages)
npm run build:single   # dist-single/  — eine einzige HTML-Datei
```

`npm run build:single` erzeugt weiterhin eine selbstständige Datei zum
Doppelklicken oder Verschicken. Solange die Grafik aus Vektoren besteht, bleibt
sie klein genug dafür.

## Aufbau

```
src/
  core/     reines TypeScript, kein DOM, keine Timer — die Simulation
  ui/       Oberfläche: Räume, Aktionen, Dialoge, Spieluhr
  style.css
tests/      Vitest: Engine-Prüfungen und Balancing-Läufe
```

Die Trennung ist der eigentliche Zweck dieser Etappe. `core` lässt sich in
Millisekunden über hundert Spieltage laufen lassen, ohne dass ein Browser
beteiligt ist — deshalb sind Balancing-Messungen jetzt Tests statt Handarbeit.

**Der Kern kennt keine Oberfläche.** Alles, was der Spieler sehen soll,
verlässt ihn als `GameEvent` in `game.events`; die Oberfläche holt sie im Takt
ab und macht Einblendungen, Dialoge oder Töne daraus.

## Was sich gegenüber der Einzeldatei geändert hat

| | vorher | jetzt |
|---|---|---|
| Zufall | `Math.random()` | eigener Generator je Partie, im Spielstand mitgeführt |
| Partien | nicht reproduzierbar | gleicher Startwert → gleicher Verlauf |
| Meldungen | Kern rief `toast()`/`modal()` direkt auf | Kern liefert Ereignisdaten |
| Typen | keine | durchgehend, `strict` |
| Tests | Handarbeit im Browser | 32 automatische Prüfungen |
| Spielstände | ein Slot | 3 Slots + Autospeichern, versioniert |

Ein Fehler fiel beim Umzug auf: Nach der ersten KI-Runde fehlte das Auffrischen
des Filmmarkts, sodass der Spieler an Tag 1 vor halb leeren Regalen stand. Auf
„Schwer" war die Partie dadurch praktisch nicht zu gewinnen.

## Schwierigkeitskurve

Gemessen mit `npm run sim` (drei Startwerte je Grad, solide spielender Bot):

| Grad | Sieg um Tag | Anmerkung |
|---|---|---|
| leicht | 11–15 | |
| normal | 24–30 | |
| schwer | 28–34 | mit Satellit, Starmoderator und Exklusivpaket |
| schwer | 57–78 | ohne diese Werkzeuge — und mit 20–40 Mio € totem Kapital |

Der letzte Fall ist Absicht: Wer die Geldsenken des Spätspiels nicht nutzt,
gewinnt zwar irgendwann, aber quälend langsam.

## Nächste Etappen

2. Zeitschleife auf `requestAnimationFrame` mit festem Zeitschritt umstellen;
   Gebäudeschnitt, Fahrstuhl und laufende Figur als SVG.
3. Räume nacheinander in gezeichnete Szenen überführen, beginnend beim Büro mit
   Drag & Drop der Programmkarten auf die Sendetafel.
4. Asset-Pipeline, Übergänge, Feinschliff, Verteilung.

## Hinweis

Alle Filmtitel, Marken und Personen sind frei erfunden. Es handelt sich um eine
eigenständige Nachbildung der Spielmechanik, nicht um eine Portierung.
