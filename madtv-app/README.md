# Mad TV — Sendermanager (App-Fassung)

Umbau des Einzeldatei-Spiels aus `../madtv/` zu einem richtigen Projekt.
Stand: **Etappe 3** — Vite + TypeScript, Spielkern herausgelöst und testbar,
Zeitschleife mit festem Zeitschritt, gezeichnete Flurszene mit laufender Figur,
und der Sendeplan liegt als Steckwand vor: Programmkassetten werden auf die
Sendeplätze gezogen.

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
  world/    gezeichnete Szene: Flur, Fahrstuhl, Figur, Wegplanung
  ui/       Panels: Räume, Aktionen, Dialoge, Spieluhr
  style.css
tests/      Vitest: Engine, Wegplanung, Balancing-Läufe
```

Die Trennung ist der eigentliche Zweck dieser Etappe. `core` lässt sich in
Millisekunden über hundert Spieltage laufen lassen, ohne dass ein Browser
beteiligt ist — deshalb sind Balancing-Messungen jetzt Tests statt Handarbeit.

**Der Kern kennt keine Oberfläche.** Alles, was der Spieler sehen soll,
verlässt ihn als `GameEvent` in `game.events`; die Oberfläche holt sie im Takt
ab und macht Einblendungen, Dialoge oder Töne daraus.

**Die Weltschicht liest nur.** `world/` verändert keinen Spielstand — sie
übersetzt den Fahrstuhlzähler der Sitzung in einen Weg durch den Flur.

## Was sich gegenüber der Einzeldatei geändert hat

| | vorher | jetzt |
|---|---|---|
| Zufall | `Math.random()` | eigener Generator je Partie, im Spielstand mitgeführt |
| Partien | nicht reproduzierbar | gleicher Startwert → gleicher Verlauf |
| Meldungen | Kern rief `toast()`/`modal()` direkt auf | Kern liefert Ereignisdaten |
| Typen | keine | durchgehend, `strict` |
| Tests | Handarbeit im Browser | 45 automatische Prüfungen |
| Spielstände | ein Slot | 3 Slots + Autospeichern, versioniert |
| Zeitschleife | `setInterval`, ein Tick = eine Minute | `requestAnimationFrame` mit festem Zeitschritt |
| Flur | Liste mit Symbolen | gezeichnete Szene mit laufender Figur |
| Sendeplan | Textliste mit Auswahldialog | Steckwand mit Kassetten zum Ziehen |

Ein Fehler fiel beim Umzug auf: Nach der ersten KI-Runde fehlte das Auffrischen
des Filmmarkts, sodass der Spieler an Tag 1 vor halb leeren Regalen stand. Auf
„Schwer" war die Partie dadurch praktisch nicht zu gewinnen.

## Zeitschleife und Darstellung (Etappe 2)

Die Simulation lief bisher direkt auf `setInterval`: ein Timer-Tick war eine
Spielminute. Für Animationen taugt das nicht — bei Geschwindigkeitsstufe 1
wären das 1,6 Bilder je Sekunde. Jetzt zeichnet `requestAnimationFrame` mit
voller Bildrate, während ein Sammler die vergangene Zeit in gleich große
Spielminuten zerlegt. Gemessen: **60 Bilder/s bei laufender Simulation**.

Der zweite Punkt ist heikler und steckt in `world/travel.ts`: Eine Spielminute
dauert je nach Tempo 130 bis 620 Millisekunden. Liefe die Laufanimation stur
mit, wäre sie einmal hektisch und einmal zäh. Deshalb bekommen die beiden
Laufabschnitte einen gedeckelten Anteil am Weg, und die Fahrt schluckt den Rest
— man sieht ja die Etagen vorbeiziehen. **Die Gesamtkosten in Spielminuten
bleiben dabei exakt erhalten**; das ist die Ressource, um die gespielt wird, und
`tests/travel.test.ts` prüft genau diese Invariante.

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

## Sendetafel (Etappe 3)

Der Sendeplan ist keine Liste mehr, sondern eine Steckwand: sieben Sendeplätze,
darunter zwei Ablagen mit Programmkassetten und Werbeaufträgen. Karten werden
mit Maus oder Finger auf die Plätze gezogen.

| Zug | Wirkung |
|---|---|
| Ordner → Sendeplatz | Sendung einplanen |
| Sendeplatz → Sendeplatz | umhängen |
| Koffer → Werbeplatz | Spot einbuchen |
| Programm → Werbeplatz | wird zum Trailer |
| Platz → Ablage | zurücklegen |

Gezeichnet wird die Tafel mit HTML und CSS, nicht in SVG oder Canvas. Die Karten
tragen Filmtitel, und Text ist genau das, was SVG schlechter kann als DOM: kein
Umbruch, kein Auslassungszeichen, keine Vorlesbarkeit. Die Kulisse — Kassetten­körper,
Spulen, Schienen — entsteht aus Verläufen.

**Ziehen ist eine Zugabe, kein Ersatz.** Ein Klick auf einen Sendeplatz öffnet
weiterhin die Auswahlliste; die Tafel bleibt vollständig mit der Tastatur
bedienbar.

Drei Dinge, die beim Bauen nicht offensichtlich waren:

- **Tafel und Ablage müssen gleichzeitig sichtbar sein**, sonst zieht man ins
  Blinde. Die Sendeplätze haben deshalb eine Höhengrenze und scrollen intern.
- **Randscrollen darf nicht zu früh greifen.** Der erste Entwurf schob die
  Zeilen unter dem Zeiger weg, sobald man in die Nähe des Rands kam — die Karte
  landete eine Zeile daneben. Jetzt wird nur geschoben, wenn in die Richtung
  überhaupt noch Scrollweg übrig ist.
- **Auf dem Handy beansprucht der Browser die Wischgeste.** Karten tragen daher
  `touch-action: none`, sonst bricht er den Zug mit `pointercancel` ab. Die
  Ablagen lassen sich stattdessen über Pfeiltasten verschieben.

Während eines Zuges wird die Ansicht nicht neu gebaut — sonst löste sich die
Karte unter dem Zeiger auf.

## Weltschicht

Der Flur ist SVG, kein Canvas: Bei gezeichneter Vektorgrafik ist SVG das native
Format, es braucht kein zweites Rendersystem, und Tür wie Fahrstuhl bleiben
normale fokussierbare Elemente — die Tastaturbedienung geht nicht verloren.

Die Szene wird einmal aufgebaut und danach nur noch über Attribute bewegt; sie
liegt außerhalb von `#view`, damit das Neuzeichnen der Panels sie nicht
zerstört. Ihre Höhe steht fest, die Zeichenbreite richtet sich nach dem
Seitenverhältnis des Behälters: ein breiter Bildschirm zeigt mehr Flur, statt
das Bild zu verzerren oder zu beschneiden. Tür, Fahrstuhl und Figur haben feste
Größen und Abstände, damit sie auf schmalen Bildschirmen nicht ineinanderrücken.

Der Gang der Figur entsteht aus Drehungen an Schulter und Hüfte, nicht aus
Einzelbildern — das spart eine Sprite-Pipeline und bleibt bei jeder Auflösung
scharf. Die Schrittphase hängt am zurückgelegten Weg, nicht an der Uhr, damit
die Füße nicht über den Boden rutschen. Bei `prefers-reduced-motion` steht die
Figur still und wird nur versetzt.

## Einstellungen

Im Menü unter *Einstellungen* (und schon auf dem Startbildschirm):

| Schalter | Wirkung |
|---|---|
| Echtzeitdruck | Auswahldialoge halten die Uhr nicht an, der Fahrstuhl kostet volle Fahrzeit |
| Ton | kurze Signale bei Sendestart, Werbeerlös und Quotenalarm |
| Flurgrafik | der gezeichnete Flur über den Panels; ausgeschaltet wird er auch nicht mehr berechnet |

## Nächste Etappen

4. Weitere Räume grafisch: Filmagentur als Regalwand, Nachrichtenstudio als
   Redaktionstisch.
5. Asset-Pipeline, Übergänge, Feinschliff, Verteilung.

## Hinweis

Alle Filmtitel, Marken und Personen sind frei erfunden. Es handelt sich um eine
eigenständige Nachbildung der Spielmechanik, nicht um eine Portierung.
