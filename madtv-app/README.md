# Mad TV — Sendermanager (App-Fassung)

Umbau des Einzeldatei-Spiels aus `../madtv/` zu einem richtigen Projekt.
Der Umbau ist abgeschlossen (Etappen 1–5); seitdem wächst der **Inhalt**.

Stand: **Etappe 6 abgeschlossen** — Vite + TypeScript, Spielkern herausgelöst und
testbar, Zeitschleife mit festem Zeitschritt, gezeichnete Flurszene mit
laufender Figur, eigener Zeichensatz, installierbare und offline spielbare
Ausgabe. **Alle dreizehn Räume** haben eine eigene Kulisse, Betty, Herr Raffer
und die Konkurrenz reden abhängig vom Spielverlauf mit, und während der
Ausstrahlung sieht man, was läuft, wer zuschaut und ob der Spot zählt.

Die alte `../madtv/index.html` bleibt unangetastet, bis diese Fassung sie
eingeholt hat.

## Loslegen

```bash
npm install
npm run dev            # Entwicklungsserver mit Hot Reload
npm test               # Simulationstests
npm run test:ui        # Prüfungen im echten Browser (braucht Playwright)
npm run sim            # Schwierigkeitskurve, drei Startwerte
npm run sim:breit      # dieselbe Messung mit zehn — dauert, aber sagt etwas
npm run build          # dist/         — Ordner-Build (z. B. GitHub Pages)
npm run build:single   # dist-single/  — eine einzige HTML-Datei
```

`npm run build:single` erzeugt weiterhin eine selbstständige Datei zum
Doppelklicken oder Verschicken. Solange die Grafik aus Vektoren besteht, bleibt
sie klein genug dafür.

## Aufbau

```
src/
  core/           reines TypeScript, kein DOM, keine Timer — die Simulation
    talk.ts       was Betty, Raffer und die Konkurrenz sagen
  world/          gezeichnete Szene: Flur, Fahrstuhl, Figur, Wegplanung
  ui/             Panels: Räume, Aktionen, Dialoge, Spieluhr, Zeichensatz
  assets/icons/   95 Symbole, je eine SVG-Datei
  style.css
public/           Manifest, Sinnbild, Dienstarbeiter — nur im Ordner-Build
tests/            Vitest: Engine, Wegplanung, Sendelängen, Symbole, Daten, Figuren, Balancing
  browser/ui.mjs  was nur ein echter Browser beantworten kann
```

Die Trennung ist der eigentliche Zweck dieser Etappe. `core` lässt sich in
Millisekunden über hundert Spieltage laufen lassen, ohne dass ein Browser
beteiligt ist — deshalb sind Balancing-Messungen jetzt Tests statt Handarbeit.

**Der Kern kennt keine Oberfläche.** Alles, was der Spieler sehen soll,
verlässt ihn als `GameEvent` in `game.events`; die Oberfläche holt sie im Takt
ab und macht Einblendungen, Dialoge oder Töne daraus.

**Die Weltschicht liest nur.** `world/` verändert keinen Spielstand — sie
übersetzt den Fahrstuhlzähler der Sitzung in einen Weg durch den Flur.

`tests/browser/ui.mjs` prüft, was ohne DOM nicht messbar ist: ob ein Symbol in
seiner Schachtel bleibt, ob jede überlaufende Regalwand ihre Pfeile hat, ob eine
Seite auf 390 Pixeln seitlich überläuft, ob jeder Text den Kontrastwert AA
erreicht und jede Tabulatorstation sichtbar umrandet ist. Jede einzelne Prüfung
dort steht für einen Fehler, der schon einmal da war. Der Ordner wird vor jedem
Lauf frisch gebaut, damit nie ein alter Stand geprüft wird.

Sie hat sich sofort bezahlt gemacht: Zwei Fehler in der frisch gebauten
Gegenüber-Spalte fielen erst dort auf. Der vierte Sendeplan-Reiter reicht einen
Tag weiter, als die Konkurrenz plant — `sched[tag]` war dort schlicht nicht da,
und die Spalte warf bei jedem Bild. Und der zweite war älter als die Spalte:
Jedes Neuzeichnen setzte gescrollte Regalwände auf Anfang zurück. Wer in der
Kundenkartei nach hinten blätterte, stand Sekunden später wieder bei der ersten
Karte — die Ansicht wird bei jeder Zustandsänderung neu geschrieben, spätestens
alle dreißig Spielminuten. Ohne die neuen Pfeile wäre das weiter niemandem
aufgefallen.

## Was sich gegenüber der Einzeldatei geändert hat

| | vorher | jetzt |
|---|---|---|
| Zufall | `Math.random()` | eigener Generator je Partie, im Spielstand mitgeführt |
| Partien | nicht reproduzierbar | gleicher Startwert → gleicher Verlauf |
| Meldungen | Kern rief `toast()`/`modal()` direkt auf | Kern liefert Ereignisdaten |
| Typen | keine | durchgehend, `strict` |
| Tests | Handarbeit im Browser | 105 Prüfungen ohne DOM, 65 im echten Browser |
| Material | 107 Filme, 15 Serien, 50 Marken, 50 Schlagzeilen | 883 Filme, 125 Serien, 200 Marken, 250 Schlagzeilen, 14 Eigenproduktionen, 7 Moderatoren, 12 Geschenke |
| Spielstände | ein Slot | 3 Slots + Autospeichern, versioniert |
| Zeitschleife | `setInterval`, ein Tick = eine Minute | `requestAnimationFrame` mit festem Zeitschritt |
| Flur | Liste mit Symbolen | gezeichnete Szene mit laufender Figur |
| Sendeplan | Textliste mit Auswahldialog | Steckwand mit Kassetten zum Ziehen |
| Sendezeit | 7 gleich lange Plätze | 14 Halbstundenfelder, Sendungen 30 Min bis 3 Std |
| Symbole | Emoji aus der Schriftart | 95 gezeichnete Vektorsymbole aus dem eigenen Satz |
| Verteilung | Datei zum Doppelklicken | zusätzlich installierbar und offline spielbar |
| Figuren | je vier feste Sätze nach einer Zahl | Sätze mit Bedingung und Rang, abhängig vom Spielverlauf |

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

## Bedienbarkeit

Fokusrahmen, `prefers-reduced-motion` und eine Klasse für nur vorgelesenen Text
standen von Anfang an. Was beim ersten systematischen Durchgang fehlte:

- **Kontrast.** `--dim2` — die leise Farbe für Beschriftungen und Nebenangaben —
  lag bei 3,3:1 auf den Panelflächen und damit unter den 4,5:1, die WCAG AA für
  kleine Schrift verlangt. Angehoben auf `#8493a6` (4,8:1), immer noch klar
  dunkler als `--dim`. Betroffen waren zwölf Textsorten auf einer einzigen
  Ansicht.
- **Meldungen.** Einblendungen erschienen und verschwanden von selbst, ohne dass
  ein Vorleseprogramm je davon erfuhr. `#toasts` ist jetzt `role="status"` mit
  `aria-live="polite"`.
- **Landmarken.** Die ganze Anwendung bestand aus `div`. Kopfzeile, Inhalt und
  Etagenleiste sind jetzt `header`, `main` und `nav`.

Geprüft wird das ab jetzt mit — die Kontrastmessung überspringt Flächen mit
Farbverlauf, weil deren Grundfarbe nirgends als einzelner Wert steht und Raten
schlechter wäre als Nichtprüfen. Der Tabulator erreicht 20 Stationen, alle
sichtbar umrandet.

## Schwierigkeitskurve

Gemessen mit `npm run sim:breit` (zehn Startwerte je Grad, solide spielender
Bot):

| Grad | Siege | Median | Spanne |
|---|---|---|---|
| leicht | 9/10 | Tag 37 | 22–62 |
| normal | 9/10 | Tag 42 | 31–87 |
| schwer, voller Werkzeugkasten | 8/10 | Tag 46 | 37–64 |
| schwer, ohne Satellit und Star | 7/10 | Tag 57 | 43–78 |

Der letzte Fall ist Absicht: Wer die Geldsenken des Spätspiels nicht nutzt,
gewinnt zwar meistens noch, aber quälend langsam — und in drei von zehn Partien
gar nicht mehr.

Diese Zahlen sind gegenüber der vorigen Messung (leicht Tag 26, normal Tag 33)
deutlich länger geworden, und zwar aus einem Grund, der nichts mit Feinschliff
zu tun hat: **Die Konkurrenz spielt jetzt überhaupt erst mit.** Siehe unten.

## Die Konkurrenz war pleite

Ein Ereignis im Spiel heißt „Weggeschnappt": Ein Konkurrenzsender kauft einen
Titel weg, den man selbst im Regal liegen sah. Beim Nachmessen kam es in
200 Spieltagen **null Mal** vor. Die Ursache lag drei Schichten tiefer.

Werbeverträge gibt es in zwei Sorten: solche, die eine Gesamtzuschauerzahl
verlangen, und solche, die eine Zahl **in einer Zielgruppe** verlangen. Die KI
verglich beides mit derselben Größe — der Gesamtzuschauerzahl. Sie unterschrieb
dadurch reihenweise Zielgruppenverträge, deren Quote sie nie erreichen konnte.
Gemessen an einem Konkurrenten über 30 Tage:

```
  -6.864k  Konventionalstrafen
    -176k  laufende Kosten
       0k  Werbeeinnahmen        ← kein einziger Spot wurde je gezählt
    +200k  Sammy-Preisgelder
```

Ab etwa Tag 7 war jeder Konkurrenzsender so tief im Minus, dass er keine Lizenz
mehr kaufte. Damit verschwand er als Gegner — lautlos, denn im Spiel sieht man
seine Kasse nicht. Der Marktanteil, den man ab Woche zwei gewann, war zu einem
guten Teil nur der Anteil zweier Sender, die sich selbst abgeschafft hatten.

Repariert sind drei Dinge: die Zielgruppenrechnung, die Reihenfolge der
Werbeplätze (die Schleife lief von hinten, legte Spots also zuerst auf
Mitternacht) und der Maßstab für neue Verträge — jetzt zählt, was gestern
tatsächlich zugeschaut hat, nicht die Selbsteinschätzung für den besten
Sendeplatz.

Danach stehen die Konkurrenzsender bei Partieende im Plus statt bei minus
sechs Millionen, ihr Marktanteil liegt bei 20–28 statt 15 Prozent — und
„Weggeschnappt" kommt an **13 %** der Tage vor. Weil ein funktionierender
Gegner den erreichbaren Marktanteil deckelt, sind die Siegschwellen
entsprechend nachgezogen worden: 50 / 58 / 63 statt 55 / 65 / 70 Prozent.

Weil die Konkurrenz nun wieder Geld hat, baut sie auch wieder aus — gemessen
über 6 × 45 Tage 29 Mal, also etwa alle neun Tage einmal. Reichweite ist der
stärkste Imagehebel im Spiel, und diese Zahl steht sonst nur im Nachbarbüro:
Sendemast, Satellit und Starmoderator werden deshalb gemeldet.

Der Fund hatte eine Folge für die Oberfläche. Im Rivalenbüro stand seit jeher
der Hinweis, gleiches Genre zur gleichen Zeit teile die Zuschauer — beim Planen
sah man aber nur den eigenen Abend. Solange die Konkurrenz ohnehin zusammenbrach,
war das folgenlos; jetzt ist Gegenprogrammierung die eigentliche Aufgabe. Die
Steckwand hat deshalb eine dritte Spalte: für jede Halbstunde, was bei beiden
Konkurrenten läuft, mit Genre-Symbol. Trifft das eigene Genre auf dasselbe
drüben, färbt sich die Zeile. Unter 520 Pixeln Breite hat der eigene Plan
Vorrang und die Spalte verschwindet.

**Drei Startwerte sind zu wenig, um eine Kurve zu beurteilen.** Als der Katalog
auf über tausend Titel wuchs, sahen die drei Läufe von `npm run sim` nach einem
Einbruch aus: leicht plötzlich bei Tag 32–38, ein „normal"-Lauf bei Tag 67, die
Ordnung schien dahin. Mit zehn Startwerten war sie völlig intakt — die drei
Läufe hatten nur drei ungünstige Stichproben erwischt. Seitdem gibt es beide
Messungen; die schnelle für jeden Commit, die breite für jede Entscheidung.

Eine echte Verschiebung steckte trotzdem darin: Der gewachsene Katalog hatte
den Anteil guter Titel von 33,5 auf 29,8 Prozent verwässert. Die neuen Titel
sind jetzt so nachjustiert, dass die Dichte wieder stimmt.

Eine Prüfung musste dabei umgestellt werden. Sie verglich das **Spitzenimage**
mit und ohne Spätspiel-Werkzeuge — und maß damit in Wahrheit die Spieldauer:
Ein Lauf, der erst an Tag 78 gewinnt, hat 78 Tage Zeit zum Klettern; einer, der
an Tag 46 heiratet, hört genau dann auf. Je besser die Werkzeuge wirkten, desto
schlechter schnitten sie in dieser Messung ab. Gemessen wird jetzt, was die
Werkzeuge wirklich kaufen: Siegquote, Dauer bis zum Sieg und Reichweite.

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

## Zeichensatz, Übergänge, Verteilung (Etappe 5)

### Der letzte Rest Fremdgrafik

Bis hierher war jedes Symbol im Spiel ein Emoji — 78 Stück, verstreut über acht
Dateien. Neben einer gezeichneten Vektorwelt fiel das zunehmend auf, und zwar
aus drei Gründen: Emoji sehen auf jedem Betriebssystem anders aus, sie lassen
sich nicht einfärben, und im SVG-Flur saß am Türschild eine bunte Farbbitmap
mitten in einer Strichzeichnung.

Jetzt liegen **86 Symbole** als einzelne Dateien unter `src/assets/icons/`,
alle im selben Raster: 24 × 24, Strichstärke 1,8, `currentColor`, keine feste
Farbe. Der Build liest sie mit `?raw` ein, schneidet das Innenleben heraus und
hängt es als `<symbol>` in einen versteckten Sprite; gezeichnet wird nur noch
mit `<use>`. Es gibt also **keine Anfrage zur Laufzeit** — die Einzeldatei
bleibt eine Datei.

Drei Dinge daran sind mehr als Kosmetik:

- **Der Kern benennt, die Oberfläche zeichnet.** Aus `ico: '🎬'` wurde
  `ico: 'flr-film'`. Das ist kein Bild mehr, sondern ein Schlüssel — und damit
  ist der Spielkern endlich frei von Darstellung. Wo der Kern doch HTML
  schreibt (die Sammy-Verleihung), hinterlässt er einen Platzhalter
  `<i data-ic="ui-pokal"></i>`, den allein `overlay.ts` auflöst.
- **Ein Symbol, jede Farbe.** Weil alles `currentColor` benutzt, erbt jedes
  Symbol die Farbe seiner Umgebung: dasselbe Herz ist in der Kopfzeile rot, in
  der Tabelle grau und auf der Karte violett — ohne eine zweite Datei.
- **Tippfehler fallen jetzt auf.** `icon('flr-buero')` würde zur Laufzeit nur
  einen blassen Kreis zeigen, kein Fehler weit und breit. Deshalb prüft
  `tests/icons.test.ts` beide Richtungen: kein Verweis ohne Datei, keine Datei
  ohne Verweis. Möglich macht das die Namenskonvention — eine Zeichenkette der
  Form `flr-film` kann im Quelltext nichts anderes sein als ein Symbolname, und
  deshalb muss die Prüfung keine einzige Aufrufform kennen.

Eine Falle steckte im `<use>`: Ein Verweis auf ein `<symbol>` **ohne
Maßangabe füllt 100 % des umgebenden Zeichenbereichs**. Das Türschild-Symbol
wuchs damit über den kompletten Flur, sichtbar war davon nichts — es lag
außerhalb des Bildausschnitts. Seitdem trägt `iconUse()` seine Größe selbst.

### Übergänge — und zwei Fehler, die dabei auffielen

Die Panels werden bei jeder Änderung neu aus HTML gebaut, auch alle zwölf
Spielminuten zur Auffrischung der Zahlen. Eine Einblendung am Element selbst
(`.room{animation:fade}`) lief deshalb ständig wieder an: Der Raum flackerte
im Zwölf-Minuten-Takt, ohne dass etwas passiert wäre.

Die Bewegung hängt jetzt nicht mehr am Neubau, sondern am **Szenenwechsel**.
`renderView()` bildet einen Schlüssel (`tower`, `lift`, `room:film`) und
vergleicht ihn mit dem vorherigen. Nur wenn er sich ändert, wird animiert — und
die Richtung erzählt mit, was passiert ist:

| Wechsel | Bewegung |
|---|---|
| Flur → Raum | steigt von unten auf, wie durch die Tür |
| Raum → Flur | sinkt nach oben weg |
| irgendwohin → Fahrstuhl | blendet weich |
| Fahrstuhl → Raum | kommt aus der Tiefe herauf |

Der zweite Fund war ärgerlicher: Die Kopfzeile setzte **jede Spielminute ein
neues `innerHTML`** — und riss damit den Tastaturfokus aus den
Geschwindigkeitsknöpfen. Wer mit der Tastatur spielt, verlor sechzig Mal je
Sendetag seine Stelle. Sie wird jetzt einmal gebaut und danach nur noch
fortgeschrieben; ein Prüflauf hält den Fokus über einen Minutenwechsel fest.

### Verteilung

Beide Ausgabeformen bleiben, und die Trennung ist schärfer geworden:

| | `npm run build` → `dist/` | `npm run build:single` → `dist-single/` |
|---|---|---|
| Form | Ordner mit Nebendateien | eine einzige HTML-Datei |
| Zweck | Webseite, Installation | Doppelklick, Verschicken |
| Manifest, Dienstarbeiter | ja | nein |
| Offline nach dem ersten Besuch | ja | ohnehin |

Manifest und Dienstarbeiter werden **erst zur Laufzeit angehängt** und nur im
Ordner-Build (`publicDir` ist für die Einzeldatei abgeschaltet). Sonst läge
neben der einen Datei plötzlich wieder ein Ordner — und genau das ist der Zweck
dieser Ausgabeform. Über `file://` unterbleibt beides ohnehin: Dienstarbeiter
setzen einen Ursprung voraus, den eine lokale Datei nicht hat.

Der Dienstarbeiter geht **Netz zuerst, Speicher als Rückfall**. Andersherum
wäre der Start schneller, aber ein neu veröffentlichter Stand käme erst beim
zweiten Besuch an. Geprüft mit gekappter Verbindung: Titel, Stil, Startknopf
und alle 86 Symbole sind da.

Das Sinnbild für den Reiter steckt als Datenadresse in der Seite selbst — auch
das, damit die Einzeldatei ohne Nebendatei auskommt.

`.github/workflows/pages.yml` stellt die ganze Sammlung zusammen (die alten
Einzeldateien, die App-Fassung unter `madtv-app/`, die Einzeldatei daneben zum
Herunterladen) und veröffentlicht sie auf GitHub Pages. **Der Lauf ist bewusst
nur von Hand auslösbar** — ein Push soll nicht ungefragt eine Webseite ins Netz
stellen. Wer das anders will, nimmt die drei auskommentierten Zeilen unter
`on:` dazu; Voraussetzung ist außerdem, dass in den Repository-Einstellungen
unter Pages «GitHub Actions» als Quelle steht.

## Kundenkartei, Regal, mehr Material (Etappe 6, erste Runde)

Mit Etappe 5 war der Umbau durch. Von hier an geht es um Inhalt — und zwar
verzahnt: je Runde ein paar Räume mit eigener Kulisse **und** das Material, das
sie füllt. So bleibt das Spiel nach jeder Runde spielbar, statt monatelang
Baustelle zu sein.

### Ziehen wurde erst einmal herausgelöst

Die gesamte Zeigerbehandlung steckte in `board.ts` und kannte genau drei
Kartenarten der Sendetafel. Jeder weitere Raum hätte sie kopiert — samt
Ziehschwelle, Geisterkarte, Randscrollen und der Falle mit dem abgebrochenen
Fingerzug. Bei neun noch offenen Räumen lohnt sich das Herauslösen sofort.

`ui/drag.ts` kennt jetzt nur noch drei Dinge:

```
data-drag="<art>"    an der Karte      — was gezogen wird
data-drop="<name>"   am Ziel           — wo es hin darf
registerDrag(art, { accepts, drop })   — die Regel dazu
```

Die Räume steuern also nur noch Regeln bei. Und diese Regeln rufen **dieselben
Aktionen auf wie der Klickweg**: Ein Zug ist eine bequemere Art, denselben Knopf
zu drücken — nie ein zweiter Weg mit eigener Logik, die irgendwann auseinander-
läuft. Wer die Tastatur benutzt, verliert dadurch nichts.

### Werbeagentur als Kundenkartei

Statt zweier Listen liegt jetzt oben der **Koffer** mit vier Fächern und darunter
die **Kartei** mit den Angeboten. Karteikarten trägt man in ein freies Fach —
oder klickt sie an, wie bisher.

Der Reiter oben auf jeder Karte nennt die Zielgruppe, denn danach sucht man
hier: Ein Vertrag ist genau dann gut, wenn man die geforderte Gruppe ohnehin
schon erreicht.

Beim Bauen fiel eine alte Schwäche auf. Die Warnung «erreichst du nicht»
verglich die Forderung mit dem, was der Sendeplan **gerade** hergibt — an Tag 1
vor leerem Plan also mit dem Testbild. Damit war jede Karte rot und die Warnung
wertlos. Jetzt wird gegen den besten Primetime-Platz **mit dem besten eigenen
Film** gerechnet: also gegen das, was ginge, wenn man gut plant. Rot heißt
seitdem etwas.

### Archiv als Regal mit Rollwagen

Die Lizenzliste ist eine Regalwand geworden, in derselben Sprache wie die
Filmagentur: **Die Breite eines Bandes ist seine Sendelänge.** Der Streifen
unten zeigt die Frische.

Sortiert wird aber nicht nach Güte, sondern nach Frische — *einsatzbereit*,
*angespielt*, *ausgelaugt*. Das ist die Frage, die man sich im Archiv wirklich
stellt: Was trägt heute Abend noch? Unten steht der **Rollwagen zum Verleih**;
was dort landet, wird verkauft. Ein Klick auf ein Band zeigt seine Kennzahlen
samt Verkaufspreis.

### Material

| | vorher | jetzt |
|---|---|---|
| Spielfilme | 107 | 186 |
| Serien | 15 | 25 |
| Werbekunden | 50 | 100 |

Die neuen Titel füllen vor allem die dünnen Genres auf — Talkshow, Quiz, Kultur
und Western hatten drei bis fünf Titel und liefen sich schnell leer; jetzt hat
jedes Genre mindestens sechs.

Beim Auffüllen sind mir prompt drei Doppelungen durchgerutscht: zwei Marken und
ein Filmtitel, den es zweimal mit verschiedenen Jahreszahlen gab. Nichts davon
bricht den Build, es fällt erst im Spiel auf — genau die Sorte Fehler, die mit
jedem weiteren Titel wahrscheinlicher wird. `tests/data.test.ts` liest die
Tabellen deshalb jetzt so, wie der Kern sie liest, und prüft: Feldzahl,
bekannte Genres und Zielgruppen, Jahreszahlen, Folgenzahl 8–24, keine
Doppelungen, mindestens sechs Titel je Genre, mindestens acht Marken je
Zielgruppe — und dass die Spitzenklasse knapp bleibt, sonst ist sie nichts
wert.

### Zweite Runde: Drehbühne und Schaltraum

**Produktionsstudio als Drehbühne.** Über allem hängt eine Traverse mit
Scheinwerfern; ist das Studio nicht angemietet, bleibt die Bühne dunkel und der
Anmietknopf heißt «Licht an». Läuft ein Dreh, springen die Scheinwerfer auf Rot
und auf der Bühne steht eine Filmklappe mit dem Titel.

Die Drehbücher stehen daneben im Regal, und **die Dicke des Papierstapels ist
die Drehdauer** — ein Dreitäger ist sichtbar mehr Papier als ein Eintäger.
Gezogen wird auf die Bühne, geklickt geht weiter.

Die Moderatoren sind Garderobentüren mit Namensschild geworden. Wer unter
Vertrag steht, hat die Lampe an und die Tür offen; die anderen bleiben zu. Das
ist mehr als Schmuck — man sieht auf einen Blick, dass nur einer gleichzeitig
geht.

**Technik als Schaltraum.** Links ein Rundinstrument mit Zeiger für die
Reichweite, darunter ein mechanisches Zählwerk für die Tageskosten. Rechts vier
Kippschalter für die Sendemasten — gebaute stehen oben und leuchten grün, der
nächste ist gestrichelt und wartet — und ein Hebel für den Satelliten.

Ein Zeiger sagt schneller als eine Zahl, ob noch Luft nach oben ist, und genau
darum geht es in diesem Raum. Das Zählwerk daneben sagt, was das kostet: Nach
einem Mast und dem Satelliten stehen dort 073000 €/Tag, und das läuft weiter,
ob das Programm mithält oder nicht.

**Material:** 6 → 14 Eigenproduktionen (Krimireihe, Sportstudio, Hitparade,
Opernabend als reine Betty-Sendung), 3 → 7 Moderatoren.

Beim Umbau der Technik sind mir zwei Symbole aus dem Raum gefallen — Antenne
und Satellit standen vorher in Listenzeilen, die es nicht mehr gibt. Aufgefallen
ist das nicht beim Ansehen, sondern durch `tests/icons.test.ts`: «lässt keine
Datei ungenutzt liegen». Beide stehen jetzt in den Überschriften des
Schaltfelds, wo sie hingehören.

### Dritte Runde: Schalter und Verkaufstresen

Beide Räume haben eines gemeinsam: Es geht um **Besitzwechsel**. Etwas
wandert von der einen Seite des Tresens auf die andere. Genau das zeigen sie
jetzt auch.

**Bank als Schalter.** Oben das Kassenfenster mit drei Geldbündeln, unten die
eigene Aktentasche. Ein Bündel in die Tasche ziehen heißt Kredit aufnehmen —
und weil Geld in beide Richtungen fließt, erscheinen in der Tasche dieselben
Bündel zum Zurückschieben, sobald Kredit offen ist. **Die Stapelhöhe ist der
Betrag**: zwei Scheine für 100.000, fünf für eine halbe Million.

Dazwischen liegt die Kreditlinie als Balken, darunter der Kontoauszug als
Streifen aus dem Nadeldrucker, samt Perforation zum Abreißen. Das ist der
einzige Ort im Spiel, an dem Zahlen auf Papier statt auf einem Bildschirm
stehen — hier passt es.

**Kiosk als Verkaufstresen.** Die Geschenke liegen in einer Vitrine, jedes mit
einem Preisschild am Faden, darunter die Holzkante des Tresens und die eigene
Tasche. Gekauftes bleibt sichtbar darin liegen, bis man es oben bei Betty
überreicht.

Eine Regel, die vorher in einer Fußnote stand, steht jetzt an der Ware: Ein
teures Geschenk verpufft, wenn Betty einen noch nicht mag. Stücke, für die es
zu früh ist, tragen die Marke **«wirkt erst ab 38»** direkt im Regal — man
sieht beim Hinschauen, was sich heute lohnt und was nicht.

**Material:** 7 → 12 Geschenke, von der handgeschriebenen Karte für 400 € bis
zur Reise nach Venedig. Die Lücke zwischen Pralinenschachtel und Goldkette war
vorher so groß, dass es im mittleren Spiel nichts Sinnvolles zu kaufen gab.

### Vierte Runde: die Figuren

Die letzten vier Räume sind Räume mit *Personen* darin. Eine Kulisse ohne die
Figur dahinter wäre halb leer geblieben — deshalb entstanden beide zusammen.

#### Sätze mit Bedingung und Rang

Betty, Herr Raffer und die beiden Konkurrenten hatten je vier feste Sätze,
ausgewählt nach einer einzigen Zahl. Beim zweiten Besuch las sich das wie eine
Beschriftung, nicht wie eine Person.

`core/talk.ts` hält jetzt jeden Satz mit einer **Bedingung** und einem **Rang**.
Gesagt wird der ranghöchste Satz, dessen Bedingung zutrifft; bei Gleichstand
entscheidet der Zufallsgenerator der Partie, und der zuletzt gesagte Satz wird
übersprungen. Der Kern liefert dabei nur Text und **Stimmung** — die Oberfläche
macht daraus Sprechblase, Lampenfarbe und Rahmen.

Das hat zwei Folgen, die mir wichtiger sind als die Sätze selbst:

- **Es ist prüfbar.** `tests/talk.test.ts` stellt einen Zustand her und schaut
  nach, ob die richtige Figur das Richtige sagt — geprüft wird die Kennung des
  Satzes, nicht der Wortlaut, damit Formulierungen sich ändern dürfen.
- **Es reagiert auf den Verlauf, nicht auf einen Messwert.** Raffer bemerkt
  einen Absturz um vier Punkte an einem Tag und wird bei zwei Tagen unter der
  Feuergrenze konkret. Er lobt nie, solange die Entlassung im Raum steht — auch
  das ist eine Prüfung.

#### Betty schaut selbst zu

Bisher zählte für Betty nur, wie viel Kultur lief. Jetzt zählt auch, was
**stattdessen** lief: Erotik oder Horror zur besten Zeit gibt einen Abzug, und
sie sagt es am nächsten Tag. Der Abzug ist gedeckelt (höchstens −0,8 je Tag) —
er soll die Entscheidung würzen, nicht die Partie kippen.

Diese Regel hätte der Balancing-Bot nie erwischt: Er plant nichts Reißerisches
in die Primetime, die Simulationsläufe sind vor und nach der Änderung
identisch. Sie wird deshalb direkt geprüft — ein Abend mit Dokumentation muss
besser abschneiden als derselbe Abend mit einem Reißer.

In ihrem Büro steht die Zuneigung als Messbahn mit einer zweiten Marke darauf:
**dem Deckel**. Dass Bettys Zuneigung das eigene Image nie überflügelt, stand
bisher in einem Hinweistext; jetzt sieht man, wo die Bahn endet und warum.
Die Vase auf ihrem Schreibtisch füllt sich mit wachsender Zuneigung.

#### Die Konkurrenz kauft sichtbar

Gute Titel verschwanden bisher lautlos aus dem Verleih. Jeder Einkauf der
Konkurrenz ab Güteklasse 4 wird jetzt festgehalten; einen Spitzentitel meldet
eine Einblendung, und im Konkurrenzbüro steht, was sie zuletzt geholt haben —
mitsamt der passenden Bemerkung dazu.

Beim Schreiben der Prüfungen fiel auf, dass die Konkurrenz schon **vor dem
ersten Sendetag** mit Einkäufen prahlte: Der Partieaufbau lässt sie einkaufen,
bevor der Spieler das Regal je gesehen hat. Die Einblendung kommt jetzt erst ab
Tag 2.

#### Nebenbei repariert

`table.tbl th.right` gab es nicht — die Regel `.right { text-align:right }`
verlor gegen `table.tbl th`, weil die spezifischer ist. Spaltenköpfe standen
deshalb seit jeher links über rechtsbündigen Zahlen, in **jeder** Tabelle des
Spiels. Aufgefallen ist es erst am Aushang im Chefbüro, wo die Tabelle auf
hellem Papier steht.

Der Spielstand ist auf Fassung 5 gegangen. Ältere Stände laden weiter: Die
neuen Felder fangen bei null an, und eine Prüfung lädt einen Stand der
Fassung 4 ohne sie.

### Nachschlag: Material und Takt

Der Katalog ist von 211 auf **1008 Titel** gewachsen (883 Filme, 125 Serien),
dazu 200 Werbekunden und 250 Schlagzeilen. Damit wiederholt sich in einer
Partie über vierzig Sendetage praktisch nichts mehr.

Die Uhr läuft **rund anderthalbmal langsamer**: Ein Sendetag dauert jetzt echte
8 / 4,3 / 1,8 Minuten statt 5 / 2,6 / 1. Vorher blieb zwischen zwei
Werbeblöcken kaum Zeit, zwei Etagen abzuklappern — der Zeitdruck soll drücken,
nicht hetzen.

#### Ein Fehler, den erst der große Katalog gezeigt hat

`removeFromSchedules` räumt eine verlorene Lizenz bewusst nur aus
**ungesendeten** Feldern: Was gelaufen ist, bleibt im Plan stehen, sonst würde
der Rückblick lügen. Der Spielstand speicherte Programme im Sendeplan aber als
Verweis auf das eigene Archiv — und wenn der Gerichtsvollzieher einen längst
gesendeten Titel mitgenommen hatte, zeigte der Verweis ins Leere. **Nach dem
Laden stand dort Testbild.** Die Sendehistorie änderte sich durch einen
Neustart.

Der Fehler war die ganze Zeit da; sichtbar wurde er erst, als der größere
Katalog den Zufallslauf verschob und die Prüfung „übersteht Speichern und Laden
unverändert" plötzlich anschlug. Der Spielstand führt jetzt die verwaisten
Lizenzen mit — meist eine leere Liste, im Ernstfall ein, zwei Einträge. Eine
eigene Prüfung hält den Fall fest.

### Auf Sendung

Während der Ausstrahlung war die Tafel blind: Überall stand «erwartet», die
Kopfzeile zeigte Konto und Image, aber nirgends, **wer gerade zuschaut, was
gerade läuft und ob der Werbespot zählt**. Genau das ist jetzt sichtbar:

- Die Kopfzeile trägt neben der Uhr den **Titel der laufenden Sendung und ihre
  Zuschauer**, mit blinkendem roten Punkt. Nach Sendeschluss steht dort die
  Tagessumme.
- Das laufende Feld auf der Sendetafel ist rot gerahmt und trägt die Marke
  **«auf Sendung»**; das Stundenschild daneben färbt mit. Bei einer langen
  Sendung gilt das für alle ihre Felder.
- Aus «erwartet» wird während der Ausstrahlung **«schauen zu»** und danach
  «gesehen» — und zwar mit der Zahl der *gerade laufenden* halben Stunde, damit
  Karte und Kopfzeile nicht zwei verschiedene Werte zeigen.
- Die Werbekarte zeigt nach dem Block nicht mehr die Forderung, sondern das
  Ergebnis: **gezählt** in Grün oder **verfehlt** in Rot, mit der tatsächlich
  erreichten Zuschauerzahl.
- Die Fußzeile summiert: Zuschauer bisher und gezählte Spots.

#### Der Grund, warum es überhaupt auffiel

Beim Nachschauen zeigte sich ein Fehler, der seit Etappe 4 im Spiel war. Mit
dem Halbstundenraster wurde aus sieben Sendeplätzen vierzehn — die Spieluhr
schaltete aber weiter im **Stundentakt** und benutzte die Blocknummer als
Feldnummer:

| Uhrzeit | ging auf Sendung |
|---|---|
| 18:00 | 18:00 ✓ |
| 19:00 | 18:30 |
| 20:00 | 19:00 |
| 21:00 | 19:30 |
| … | … |
| 00:00 | 21:00 |

Die Felder ab 21:30 liefen live **überhaupt nie**; sie wurden erst beim
Tagesabschluss in einem Rutsch abgerechnet. Deshalb stand um 21:54 auf der
21-Uhr-Sendung noch «erwartet» — sie war schlicht noch nicht dran.

Der Fehler war für die Bilanz folgenlos (am Tagesende lief alles nach), aber er
machte die halbe Sendezeit unbeobachtbar. Jedes Feld geht jetzt zu seiner
eigenen Zeit auf Sendung, und vier Prüfungen in `tests/length.test.ts` halten
den Takt fest — darunter der gemeldete Fall: um 21:54 läuft das 21:30-Feld.

### Auf dem Handy

Gemessen auf 390 × 664: Von der Höhe gingen **246 px an Rahmen** verloren, die
Kopfzeile brach zweizeilig um und wurde von der ersten Einblendung überdeckt,
die Fußleiste zeigte drei von neun Räumen, der Genrefilter der Filmagentur
belegte vier Zeilen, und Filmtitel standen als «Der Zir…» in einer 152 px
schmalen Spalte.

| | vorher | jetzt |
|---|---|---|
| Kopfzeile | 85 px, umgebrochen | 64 px, geordnet |
| Flurgrafik | 113 px | 78 px |
| Platz fürs Spiel | 419 px | 470 px |
| Titelspalte | 152 px | 184 px |
| Räume in der Fußleiste | 3 von 9 | alle 9 |

Die Regeln stehen in einem eigenen Block ab 700 px Breite; darüber ändert sich
nichts (geprüft bei 1280, 900, 760 und 701 px). Der Ansatz durchgehend: **Was
nicht passt, wischt seitwärts statt umzubrechen** — Genrefilter, Ablagen und
Regale sind Wischleisten. Und was nur schmückt, schrumpft: Markenschriftzug
weg, Raumnamen in der Fußleiste weg (die Symbole sind gezeichnet und
unterscheidbar, `aria-label` und `title` bleiben).

Einblendungen liegen auf dem Handy **unten** statt oben. Oben verdeckten sie
genau das, was während der Sendung wichtig ist.

#### Tippziele nachgemessen

Die Prüfung sucht Schaltflächen unter 30 px Höhe. Ergebnis vorher: Die
**Abostufen im Nachrichtenstudio waren 20 × 19 px** — zwanzig Ziele, die mit
dem Finger nicht sicher zu treffen sind. Dazu die Pfeile der Ablagen mit 22 px
und `.btn.sm` mit 30 px. Alle drei sind jetzt mindestens 32 px hoch; die
Prüfung läuft auf iPhone 12, iPhone SE und Pixel 5 durch alle zwölf Räume.

Zwei Fehler in meinem eigenen Mobilblock fielen dabei auf: ein angehängtes
Euro-Zeichen hinter einem Betrag, der schon eins hatte («8,1 Mio € €»), und ein
langer Filmtitel, der den Menüknopf in die zweite Zeile drückte. Beide sind
Teil der Messung geworden.

Zuletzt zwei Kleinigkeiten, die erst auf 320 px auffielen: «Produktionsstudio»
ragte über das Türschild im Flur hinaus (die Schriftgröße richtet sich jetzt
nach der Länge), und «gezählt 2,54 Mio» brach in der 96 px schmalen
Werbespalte mitten in der Zahl um.

Der Fingerzug auf die Sendetafel ist auf dem kleinsten Gerät (320 px) geprüft.

## Was als Nächstes läge

Damit ist die Liste aus Etappe 6 abgearbeitet: alle Räume gezeichnet, das
Material aufgefüllt, die Figuren am Leben. Was jetzt käme, wäre etwas Neues
statt etwas Fehlendes — Ton, mehrere Szenarien mit eigenen Startbedingungen,
oder eine Konkurrenz, die nicht nur redet, sondern gezielt gegen dein Programm
plant.

Die alte `../madtv/index.html` bleibt weiterhin unangetastet.

## Hinweis

Alle Filmtitel, Marken und Personen sind frei erfunden. Es handelt sich um eine
eigenständige Nachbildung der Spielmechanik, nicht um eine Portierung.
