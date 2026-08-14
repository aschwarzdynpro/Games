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
geplante grafische Fassung — gezeichnetes Hochhaus, laufende Figur über die
Flure, Büros mit Drag & Drop — überhaupt handhabbar wird. Der Spielkern liegt
dort getrennt von der Oberfläche und ist testbar; Balancing-Messungen sind
Tests statt Handarbeit.

`npm run build:single` erzeugt weiterhin eine selbstständige HTML-Datei — die
Einzeldatei bleibt also als Ausgabeformat erhalten, nur nicht mehr als
Quellformat. Details in [`madtv-app/README.md`](madtv-app/README.md).

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
