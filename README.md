# Games

Kleine, eigenständige Browserspiele — je eine HTML-Datei, keine Abhängigkeiten.

| Spiel | Datei | Beschreibung |
|---|---|---|
| **Mad TV — Der Sendermanager** | [`madtv/index.html`](madtv/index.html) | Wirtschaftssimulation im Sendehochhaus: Sendeplan füllen, Werbeverträge erfüllen, Quote gegen zwei Konkurrenzsender behaupten und Betty Botterbloom erobern. Hommage an den Rainbow-Arts-Klassiker von 1991. |
| **Texas Hold'em Poker** | [`poker/index.html`](poker/index.html) | No-Limit Hold'em gegen Computergegner. |
| **Memory** | [`memory.html`](memory.html) | Klassisches Kartenpaar-Suchspiel. |

Einfach die jeweilige Datei im Browser öffnen.

## In Arbeit: [`madtv-app/`](madtv-app/)

Umbau von Mad TV zu einem richtigen Projekt (Vite + TypeScript), damit die
grafische Fassung überhaupt handhabbar wird. Der Spielkern liegt dort getrennt
von der Oberfläche und ist testbar; Balancing-Messungen sind Tests statt
Handarbeit.

Über den Panels läuft inzwischen eine gezeichnete Flurszene: Fahrstuhl mit
Etagenzähler, Zimmertür mit Schild, und eine Figur, die den Weg tatsächlich
abläuft. Die Fahrzeit, die das Spiel schon immer in Spielminuten berechnet hat,
ist damit sichtbar geworden.

Die Büros haben inzwischen selbst eine Grafik: Der Sendeplan ist eine Steckwand
im Halbstundenraster, die Filmagentur eine Regalwand, in der die Schachtelbreite
die Sendelänge zeigt, das Nachrichtenstudio ein Redaktionstisch mit
Teleprompter. Überall wird gezogen statt ausgewählt. Sendungen dauern jetzt
30 Minuten bis 3 Stunden, Serien kauft man als Staffel mit 8 bis 24 Folgen —
Sendezeit ist damit die eigentliche Ware.

Auch das letzte Stück Fremdgrafik ist weg: Wo vorher 78 Emoji standen, liegen
jetzt 86 selbst gezeichnete Vektorsymbole in einem gemeinsamen Raster. Weil sie
`currentColor` benutzen, erben sie die Farbe ihrer Umgebung — dasselbe Herz ist
in der Kopfzeile rot und in der Tabelle grau.

Seit der Umbau steht, wächst der Inhalt. Inzwischen hat **jeder** Raum eine
eigene Kulisse: Die Werbeagentur ist eine Kundenkartei mit Koffer, das Archiv
eine Regalwand mit Rollwagen, das Produktionsstudio eine Drehbühne mit
Scheinwerfern und Filmklappe, die Technik ein Schaltraum mit Zeigerinstrument
und Kippschaltern, die Bank ein Schalter, über den Geldbündel in beide
Richtungen wandern, der Kiosk ein Verkaufstresen mit Vitrine. Der Fundus ist
auf 186 Filme, 25 Serien, 100 Werbekunden, 14 Eigenproduktionen, 7 Moderatoren
und 12 Geschenke gewachsen.

Und die Figuren reden mit: Betty schaut zur besten Zeit selbst zu und nimmt
Reißerisches übel, Herr Raffer wird bei fallender Quote persönlich, und die
Konkurrenz reibt einem den weggeschnappten Spitzenfilm unter die Nase. Welcher
Satz fällt, entscheidet eine Tabelle aus Bedingungen und Rängen — und die ist
geprüft.

Es gibt zwei Ausgabeformen: `npm run build` erzeugt einen Ordner, der sich
installieren lässt und nach dem ersten Besuch auch ohne Netz läuft;
`npm run build:single` weiterhin eine einzige, selbstständige HTML-Datei zum
Doppelklicken oder Verschicken. Die Einzeldatei bleibt also als Ausgabeformat
erhalten, nur nicht mehr als Quellformat. Details in
[`madtv-app/README.md`](madtv-app/README.md).

Ein Arbeitsablauf unter [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
stellt die ganze Sammlung für GitHub Pages zusammen. Er ist bewusst nur von Hand
auslösbar — ein Push soll nicht ungefragt eine Webseite veröffentlichen.

## Mad TV

**Ziel:** genug Marktanteil *und* genug Zuneigung bei Betty, um sie zu heiraten — bevor die
Konkurrenz es tut.

**Spielprinzip**

- Arbeitstag von 17:00 bis 01:00 in Echtzeit, drei Geschwindigkeiten
- Sieben Sendeblöcke ab 18:00 — je 4 Minuten Nachrichten, Sendung, 5 Minuten Werbung
- 13 Etagen mit Fahrstuhl: Filmagentur, Werbeagentur, Nachrichtenstudio, Produktionsstudio,
  Archiv, Technik, Bank, Chefbüro, Bettys Büro, Kiosk und die Büros der Konkurrenz
- Über 120 Filme und Serien mit Zuschauerwert, Kritikerurteil, Kinokasse und Altersfreigabe;
  Lizenzen nutzen sich beim Senden ab und erholen sich über Tage
- 50 Werbekunden mit Mindestquote, Zielgruppe, Frist und Konventionalstrafe
- Quotenberechnung über sechs Zielgruppen mit eigener Tagesganglinie, Genre-Vorlieben,
  Trailer-Effekt, Zuschauerfluss und dem Programm der Konkurrenz
- Täglich schwankende Genre-Konjunktur; Serien binden ihr Publikum an einen festen Sendeplatz
- Zielgruppen-Auswertung nach jedem gesendeten Block
- Sammy Awards, Auktionen mit mitbietender Konkurrenz, Bombendrohungen, Gerichtsvollzieher,
  Eigenproduktionen, Sendemasten, Satellit, Starmoderatoren und Exklusivpakete
- Drei Schwierigkeitsgrade, drei Speicherslots plus Autospeichern beim Tagesabschluss

**Steuerung:** Tasten 1–8 springen in die wichtigsten Räume, Leertaste pausiert,
Escape verlässt einen Raum. Alle Listen und Sendeplätze sind auch mit Tabulator und
Enter bedienbar.

**Echtzeitdruck** lässt sich im Menü abschalten: dann halten Auswahldialoge die Uhr an
und der Fahrstuhl kostet kaum Sendetag.

Alle Filmtitel, Marken und Personen sind frei erfunden — es handelt sich um eine
eigenständige Nachbildung der Spielmechanik, nicht um eine Portierung.
