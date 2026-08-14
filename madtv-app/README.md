# Mad TV — Sendermanager (App-Fassung)

Umbau des Einzeldatei-Spiels aus `../madtv/` zu einem richtigen Projekt.
Stand: **Etappe 4** — Vite + TypeScript, Spielkern herausgelöst und testbar,
Zeitschleife mit festem Zeitschritt, gezeichnete Flurszene mit laufender Figur,
Sendeplan als Steckwand im Halbstundenraster (Sendungen dauern 30 Minuten bis
3 Stunden), Filmagentur als Regalwand und Nachrichtenstudio als Redaktionstisch.

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
| Tests | Handarbeit im Browser | 65 automatische Prüfungen |
| Spielstände | ein Slot | 3 Slots + Autospeichern, versioniert |
| Zeitschleife | `setInterval`, ein Tick = eine Minute | `requestAnimationFrame` mit festem Zeitschritt |
| Flur | Liste mit Symbolen | gezeichnete Szene mit laufender Figur |
| Sendeplan | Textliste mit Auswahldialog | Steckwand mit Kassetten zum Ziehen |
| Sendezeit | 7 gleich lange Plätze | 14 Halbstundenfelder, Sendungen 30 Min bis 3 Std |

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
| leicht | 15–22 | |
| normal | 27–38 | |
| schwer | 35–51 | mit Satellit, Starmoderator und Exklusivpaket |
| schwer | 68+ | ohne diese Werkzeuge — und mit 20–28 Mio € totem Kapital |

Der letzte Fall ist Absicht: Wer die Geldsenken des Spätspiels nicht nutzt,
gewinnt zwar irgendwann, aber quälend langsam.

## Sendetafel (Etappe 3)

Der Sendeplan ist keine Liste mehr, sondern eine Steckwand: der Abend als
Raster, darunter zwei Ablagen mit Programmkassetten und Werbeaufträgen. Karten
werden mit Maus oder Finger auf die Plätze gezogen.

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

## Sendelängen, Regalwand, Redaktionstisch (Etappe 4)

### Der Abend ist jetzt Fläche, nicht Liste

Bisher waren sieben Sendeplätze sieben gleich große Kästchen: ein Dreiminüter
kostete so viel Abend wie ein Dreistünder. Der Sendeplan läuft jetzt in
**14 Halbstundenfeldern** von 18:00 bis 00:30, und jede Sendung belegt 1 bis 6
davon:

| Länge | Felder | typisch |
|---|---|---|
| 30 Min | 1 | Magazin, Kurzdoku, Serienfolge |
| 1 Std | 2 | Show, Quiz, lange Serienfolge |
| 1:30 bis 2 Std | 3–4 | Spielfilm |
| 2:30 bis 3 Std | 5–6 | Epos, Überlänge |

Die Länge hängt am Titel, nicht am Zufall der Partie: derselbe Film ist in jedem
Spiel gleich lang (`lengthOf()` hasht Titel und Genre). Genres bringen ihre
eigene Spanne mit — Dokumentationen sind kurz, Western und Science-Fiction lang.

Serien kauft man als **Staffel mit 8 bis 24 Folgen zu je 30 oder 60 Minuten**;
der Preis richtet sich nach Folgenzahl und Folgenlänge, das Archiv zählt die
gesendete Folge weiter.

Vier Regeln, die daran hängen und die `tests/length.test.ts` festnagelt:

- **Werbung bleibt stündlich.** Der Werbeblock liegt auf dem halben Feld jeder
  Stunde; eine Sendung darf darüber hinweglaufen, Werbung läuft trotzdem.
- **Abgenutzt wird einmal je Ausstrahlung, nicht je Feld.** Sonst wäre ein
  Dreistünder nach einem Abend verbraucht.
- **Sendezeit kostet Geld.** Der Preis skaliert mit der Länge — sonst wäre der
  Dreistünder immer der günstigste Weg, den Abend zu füllen.
- **Lange Sendungen ermüden.** Jedes weitere Feld trägt gut 4 % weniger; wer den
  Abend mit einem Block zumauert, verliert hinten heraus Zuschauer.

Verdrängen ist ausdrücklich erlaubt: Wer einen Zweistünder auf ein belegtes Feld
zieht, schiebt die alte Sendung vollständig heraus — halbe Sendungen gibt es
nicht.

### Filmagentur als Regalwand

Der Verleihkatalog steht in Schachteln im Regal, und **die Schachtelbreite ist
die Sendelänge**: 56 Pixel für ein Magazin, 160 für den Dreistünder. Drei
Bretter sortieren nach Länge (bis 1 Stunde · 1½ bis 2 Stunden · ab 2½ Stunden),
schmale Schachteln tragen den Titel als Rückenaufdruck. Ein Klick zieht die
Schachtel heraus und zeigt die Kennzahlen samt Kaufknopf.

Das ist kein Schmuck: Man sieht dem Regal an, ob man einen Abend füllen kann,
bevor man einen einzigen Preis gelesen hat.

### Nachrichtenstudio als Redaktionstisch

Statt Auswahllisten liegt ein Tisch vor einem: links der **Teleprompter** mit
drei Plätzen, darunter fünf **Ressortkörbe** mit den Meldungen des Tages.
Meldungen werden in den Prompter gezogen — oder angeklickt, dann landen sie auf
dem nächsten freien Platz. Die Wirkung der Sendung steht live unter dem
Prompter, samt Hinweis, dass nur tagesaktuelle Meldungen aus einem hohen Abo
Zuschauer abziehen.

Beim Bauen fiel auf, dass drei gleiche Schlagzeilen nebeneinander im Korb wie
Kulisse aussehen. Der Meldungswurf zieht jetzt ohne Zurücklegen, gegen den
gesamten Korbinhalt der letzten drei Tage.

## Nächste Etappe

5. Asset-Pipeline, Übergänge, Feinschliff, Verteilung.

## Hinweis

Alle Filmtitel, Marken und Personen sind frei erfunden. Es handelt sich um eine
eigenständige Nachbildung der Spielmechanik, nicht um eine Portierung.
