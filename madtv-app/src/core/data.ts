/**
 * Statische Spieldaten. Reine Tabellen, keine Logik.
 *
 * Alle Filmtitel, Marken und Personen sind frei erfunden — es handelt sich um
 * eine eigenständige Nachbildung, nicht um eine Portierung.
 */
import type {
  Genre, GenreId, Group, Ressort, RessortId, Production, Star, Gift,
  Difficulty, DifficultyId, Floor,
} from './types';

/* ─────────── Zielgruppen ───────────
   share = Anteil an der Bevölkerung
   act   = Fernsehneigung je Halbstundenfeld, 18:00 bis 00:30 (14 Werte).
           Die Kurven stammen aus den früheren Stundenwerten; die halben
           Stunden liegen dazwischen, damit ein Film, der 20:30 beginnt,
           nicht dieselbe Ausgangslage hat wie einer um 20:00. */
export const GROUPS: readonly Group[] = [
  { id: 'kind', name: 'Kinder',      ico: 'grp-kind', share: 0.11,
    act: [0.58, 0.52, 0.46, 0.35, 0.24, 0.15, 0.07, 0.04, 0.02, 0.015, 0.01, 0.005, 0.00, 0.00] },
  { id: 'teen', name: 'Jugendliche', ico: 'grp-teen', share: 0.14,
    act: [0.30, 0.35, 0.40, 0.45, 0.50, 0.53, 0.56, 0.54, 0.52, 0.47, 0.42, 0.34, 0.26, 0.20] },
  { id: 'haus', name: 'Hausfrauen',  ico: 'grp-haus', share: 0.16,
    act: [0.46, 0.51, 0.56, 0.58, 0.60, 0.57, 0.54, 0.46, 0.38, 0.31, 0.24, 0.16, 0.09, 0.05] },
  { id: 'ang',  name: 'Angestellte', ico: 'grp-ang', share: 0.30,
    act: [0.24, 0.32, 0.40, 0.50, 0.60, 0.62, 0.63, 0.57, 0.50, 0.42, 0.34, 0.25, 0.17, 0.11] },
  { id: 'rent', name: 'Rentner',     ico: 'grp-rent', share: 0.19,
    act: [0.52, 0.57, 0.61, 0.62, 0.62, 0.56, 0.49, 0.39, 0.29, 0.22, 0.14, 0.09, 0.05, 0.03] },
  { id: 'arbl', name: 'Arbeitslose', ico: 'grp-arbl', share: 0.10,
    act: [0.40, 0.43, 0.46, 0.49, 0.51, 0.52, 0.53, 0.52, 0.51, 0.49, 0.46, 0.41, 0.36, 0.31] },
];

/** Index einer Zielgruppe in GROUPS. */
export const GIDX: Record<string, number> = {};
GROUPS.forEach((g, i) => { GIDX[g.id] = i; });

/* ─────────── Genres ───────────
   aff  = Attraktivität je Zielgruppe (Reihenfolge wie GROUPS)
   krit = Neigung zu guter Kritikerwertung
   kult = zählt als Kultursendung (Betty, Sammy) */
export const GENRES: Record<GenreId, Genre> = {
  action:  { name: 'Action',          ico: 'gen-action', aff: [0.5, 1.35, 0.50, 1.15, 0.50, 1.20], krit: -0.15, fsk: 16, kult: false },
  komoed:  { name: 'Komödie',         ico: 'gen-komoed', aff: [1.0, 1.15, 1.20, 1.15, 0.95, 1.15], krit:  0.00, fsk: 6,  kult: false },
  drama:   { name: 'Drama',           ico: 'gen-drama', aff: [0.2, 0.55, 1.25, 1.10, 1.15, 0.75], krit:  0.30, fsk: 12, kult: false },
  horror:  { name: 'Horror',          ico: 'gen-horror', aff: [0.1, 1.40, 0.35, 0.85, 0.20, 1.05], krit: -0.20, fsk: 18, kult: false },
  scifi:   { name: 'Science Fiction', ico: 'gen-scifi', aff: [0.8, 1.35, 0.45, 1.05, 0.35, 1.10], krit:  0.05, fsk: 12, kult: false },
  krimi:   { name: 'Krimi',           ico: 'gen-krimi', aff: [0.2, 0.85, 1.10, 1.25, 1.25, 0.95], krit:  0.15, fsk: 12, kult: false },
  liebe:   { name: 'Liebesfilm',      ico: 'gen-liebe', aff: [0.3, 0.70, 1.45, 0.80, 1.15, 0.85], krit:  0.00, fsk: 6,  kult: false },
  western: { name: 'Western',         ico: 'gen-western', aff: [0.5, 0.60, 0.55, 0.95, 1.40, 0.90], krit:  0.05, fsk: 12, kult: false },
  doku:    { name: 'Dokumentation',   ico: 'gen-doku', aff: [0.5, 0.45, 0.80, 1.05, 1.20, 0.60], krit:  0.45, fsk: 0,  kult: true  },
  trick:   { name: 'Trickfilm',       ico: 'gen-trick', aff: [1.6, 0.75, 0.85, 0.55, 0.45, 0.65], krit:  0.10, fsk: 0,  kult: false },
  erotik:  { name: 'Erotik',          ico: 'gen-erotik', aff: [0.0, 1.10, 0.35, 1.00, 0.45, 1.15], krit: -0.35, fsk: 18, kult: false },
  sport:   { name: 'Sport',           ico: 'gen-sport', aff: [0.6, 1.15, 0.45, 1.20, 0.95, 1.05], krit:  0.00, fsk: 0,  kult: false },
  musik:   { name: 'Musik',           ico: 'gen-musik', aff: [0.6, 1.25, 0.90, 0.90, 0.70, 0.85], krit:  0.20, fsk: 6,  kult: false },
  show:    { name: 'Show',            ico: 'gen-show', aff: [0.9, 1.00, 1.30, 1.05, 1.10, 1.10], krit: -0.10, fsk: 6,  kult: false },
  quiz:    { name: 'Quizshow',        ico: 'gen-quiz', aff: [0.7, 0.75, 1.25, 1.10, 1.30, 1.00], krit:  0.00, fsk: 0,  kult: false },
  talk:    { name: 'Talkshow',        ico: 'gen-talk', aff: [0.1, 0.60, 1.20, 1.05, 1.05, 1.05], krit:  0.15, fsk: 12, kult: false },
  kultur:  { name: 'Kultur',          ico: 'gen-kultur', aff: [0.1, 0.30, 0.70, 0.85, 1.15, 0.45], krit:  0.60, fsk: 0,  kult: true  },
  serie:   { name: 'Serie',           ico: 'gen-serie', aff: [0.8, 1.00, 1.25, 1.10, 1.00, 1.10], krit:  0.00, fsk: 12, kult: false },
};

/** Filmkatalog. Aufbau: Titel | Genre | Jahr | Güteklasse 1–5 */
export const FILM_DATA: readonly string[] = `
Stirb schneller|action|1988|4
Der Terminierer|action|1984|5
Rambeau III – Rückkehr in die Hölle|action|1985|3
Kommando Kobra|action|1986|3
Explosiv – Die letzte Sekunde|action|1990|4
Faustrecht der Vorstadt|action|1979|2
Nitro City|action|1987|3
Der Söldner von Kandahar|action|1983|2
Hard Impact|action|1989|3
Feuersturm über Miami|action|1986|4
Blaulicht und Blei|action|1991|4
Die Brücke von Karachi|action|1981|2
Vier Hochzeiten und ein Umzug|komoed|1990|4
Die nackte Kanonenkugel|komoed|1988|5
Papa ist ein Außerirdischer|komoed|1986|3
Chaos im Kaufhaus|komoed|1982|2
Der Schwiegersohn von nebenan|komoed|1984|3
Zwei Kumpel und ein Kühlschrank|komoed|1979|2
Urlaub mit Hindernissen|komoed|1987|3
Die Katze im Sack|komoed|1975|2
Herr Meier räumt auf|komoed|1991|3
Onkel Ottos Erbschaft|komoed|1980|2
Der Regen von gestern|drama|1978|4
Herbstlicht|drama|1984|5
Briefe an Anna|drama|1989|4
Die letzte Fabrik|drama|1986|4
Schatten über Neustadt|drama|1982|3
Weit weg von hier|drama|1990|4
Der stille Zeuge|drama|1977|3
Zimmer ohne Aussicht|drama|1988|2
Das Erbe der Winters|drama|1991|4
Nacht der leeren Häuser|horror|1983|3
Blutmond über Prag|horror|1987|3
Der Keller|horror|1981|2
Zombie-Picknick|horror|1985|2
Das Ding aus dem Fahrstuhl|horror|1989|3
Freitag der Vierzehnte|horror|1986|2
Schrei im Nebel|horror|1978|3
Die Puppe lebt|horror|1990|4
Sternenkreuzer Orion 9|scifi|1980|4
Galaxis in Flammen|scifi|1985|3
Der Zeitkurier|scifi|1988|5
Planet der Bürokraten|scifi|1982|3
Cyberdyne Blues|scifi|1990|4
Marsmission 2087|scifi|1986|3
Die Invasion der Kaffeemaschinen|scifi|1979|2
Neon Nights 2049|scifi|1991|4
Tatmotiv Geld|krimi|1984|3
Kommissar Kluge ermittelt|krimi|1979|4
Der Fall Hoffmann|krimi|1987|3
Spurlos im Hafen|krimi|1982|3
Nachtschicht Mord|krimi|1990|4
Das Alibi|krimi|1976|3
Der Zeuge aus Zelle 7|krimi|1988|4
Die Spur führt nach Genua|krimi|1991|3
Sommer in Sorrent|liebe|1981|3
Zwei Herzen, ein Zug|liebe|1986|4
Die Braut trägt Blau|liebe|1989|4
Rendezvous um Mitternacht|liebe|1977|2
Verliebt in Lissabon|liebe|1990|4
Der Kuss im Regen|liebe|1984|3
Wiedersehen in Wien|liebe|1991|3
Der Reiter ohne Namen|western|1972|3
Staub und Blei|western|1968|3
Goldrausch am Red River|western|1975|3
Die letzte Postkutsche|western|1980|2
Duell in Silver Creek|western|1971|4
Wale des Nordmeers|doku|1989|4
Die Pyramiden von Gizeh|doku|1987|4
Straßen der Antike|doku|1990|3
Das Geheimnis der Bienen|doku|1991|3
Vulkane – Feuer der Erde|doku|1988|4
Serengeti bei Nacht|doku|1985|3
Die Seidenstraße|doku|1986|4
Käpt'n Knuffel|trick|1983|3
Die Abenteuer der Zwergmaus|trick|1979|3
Robo-Hasen|trick|1988|2
Sternenprinzessin Lila|trick|1990|4
Der kleine Drache Fips|trick|1986|3
Heiße Nächte in Nizza|erotik|1984|2
Das Model und der Fotograf|erotik|1987|2
Sündige Sommerferien|erotik|1981|1
Bikini Beach Club|erotik|1989|2
Endspiel – Der Weg zum Titel|sport|1990|4
Der Boxer vom Kiez|sport|1983|3
Formel Eins – Die Legende|sport|1988|4
Eiskalt aufs Tor|sport|1986|2
Rock im Regen – Live|musik|1985|3
Die Ballade von Jenny|musik|1982|3
Sinfonie der Nacht|musik|1989|4
Woodstack Revival|musik|1991|4
Die große Samstagsgala|show|1990|3
Wetten, das war's?|show|1989|3
Stars in der Manege|show|1987|3
Die Hitparade der Herzen|show|1986|2
Der Preis ist heiß gelaufen|quiz|1988|3
Wer weiß denn sowas noch|quiz|1991|4
Millionenfrage|quiz|1990|4
Mitternachtstalk|talk|1989|3
Der heiße Stuhl 2|talk|1991|4
Klartext um elf|talk|1990|2
Museen der Welt|kultur|1988|4
Die Oper von Mailand|kultur|1986|4
Meister der Renaissance|kultur|1990|5
Literatur am Kamin|kultur|1991|3
Ballett aus Sankt Petersburg|kultur|1989|3
Architektur der Moderne|kultur|1987|3
Straßenwölfe|action|1980|3
Der Kurier von Neapel|action|1990|4
Panzerfaust|action|1977|2
Countdown in Kapstadt|action|1989|3
Die Rache des Kickboxers|action|1987|2
Turbo Trouble|komoed|1985|4
Der Hundefänger von Buxtehude|komoed|1976|2
Drei Damen und ein Dackel|komoed|1988|3
Mein Chef, das Chamäleon|komoed|1991|4
Ferien auf dem Bauernhof|komoed|1983|2
Die Bank am Ende der Straße|komoed|1989|3
Verlorene Jahre|drama|1975|4
Der Bergdoktor von Sankt Anna|drama|1981|3
Salz auf unserer Haut|drama|1987|4
Kinder des Reviers|drama|1979|3
Wenn der Nebel steigt|drama|1990|3
Die Erben von Gut Falkenstein|drama|1985|4
Der Wechselbalg|horror|1988|3
Krallen im Dachstuhl|horror|1980|2
Die Klinik der Ratten|horror|1991|3
Blutorange|horror|1984|2
Sirius Protokoll|scifi|1983|4
Die Kolonie|scifi|1989|3
Roboter weinen nicht|scifi|1991|5
Schwarzes Loch|scifi|1977|3
Botschaft aus dem Nichts|scifi|1986|2
Der Mörder trug Handschuhe|krimi|1974|4
Blutspur im Schnee|krimi|1985|4
Inspektor Behrens und der letzte Zug|krimi|1980|3
Die Akte Lindberg|krimi|1989|4
Anruf um drei|krimi|1991|3
Tod im Wintergarten|krimi|1983|3
Ein Herz für Emilia|liebe|1979|2
Die Tänzerin von Sevilla|liebe|1983|3
Nächte in Neapel|liebe|1988|3
Zweite Chance|liebe|1991|4
Der Brief aus Kanada|liebe|1976|2
Revolverwind|western|1969|3
Der Marshal von Tucson|western|1974|3
Blut am Rio Verde|western|1978|2
Die Frau des Ranchers|western|1982|4
Colorado brennt|western|1970|3
Tiefsee – Die letzte Grenze|doku|1990|4
Die Wüste lebt noch|doku|1984|3
Wölfe in den Karpaten|doku|1991|4
Berlin – Eine Stadt erzählt|doku|1989|5
Der Nil von der Quelle bis zum Meer|doku|1986|4
Flip und Flap im Weltall|trick|1981|2
Die Schlümpfe von Schlumpfhausen|trick|1985|3
Kater Karlos große Reise|trick|1989|3
Ritter Rüdiger|trick|1991|3
Das Zauberkarussell|trick|1977|2
Nachts im Wellnesstempel|erotik|1988|2
Die Sekretärin|erotik|1985|1
Sommer, Sonne, Sünde|erotik|1990|2
Marathon der Träume|sport|1984|3
Die Wilden Kerle vom Bolzplatz|sport|1991|3
Auf dem Eis|sport|1987|2
Tour der Leiden|sport|1989|4
Bühne frei für Bernie Brass|musik|1982|4
Schlagerparade '89|musik|1989|2
Die Oper der Straße|musik|1990|4
Gitarren am Lagerfeuer|musik|1978|2
Die große Samstagsshow|show|1988|3
Kuno Kelchs Wundertüte|show|1990|4
Wetten, dass ich das kann?|show|1987|3
Zirkus der Rekorde|show|1985|2
Wer weiß was?|quiz|1986|3
Die Millionenfrage|quiz|1990|4
Buchstabensalat|quiz|1983|2
Zahlen bitte!|quiz|1991|3
Klartext mit Kurt Kranich|talk|1989|3
Der späte Stuhl|talk|1991|4
Reden wir darüber|talk|1985|2
Museum der stillen Dinge|kultur|1988|4
Schwanensee in Sankt Petersburg|kultur|1990|4
Die Bibliothek von Alexandria|kultur|1986|5
Handwerk aus fünf Jahrhunderten|kultur|1984|3
Klaviersonaten im Herbstlicht|kultur|1991|4
Der Adler von Malta|action|1979|3
Sprengsatz Mitternacht|action|1986|3
Die Faust des Nordens|action|1982|2
Höllenritt nach Casablanca|action|1984|3
Zündschnur|action|1990|4
Der letzte Konvoi|action|1977|3
Stahlgewitter über Suez|action|1981|2
Nahkampf|action|1988|3
Der Mann aus dem Feuer|action|1991|4
Sturmangriff|action|1975|2
Blitzschlag|action|1987|3
Der Kurier stirbt zweimal|action|1989|3
Feindberührung|action|1983|2
Panzerkreuzer Kaskade|action|1976|3
Der Scharfschütze von Lissabon|action|1985|4
Wüstenfalke|action|1980|2
Auf Messers Schneide|action|1991|4
Ausbruch aus Zelle 9|action|1978|3
Der Tag der Abrechnung|action|1986|4
Kampfzone Innenstadt|action|1990|2
Hetzjagd im Hafen|action|1982|3
Die Bombe tickt weiter|action|1988|3
Rückkehr des Söldners|action|1987|2
Grenzverletzung|action|1984|3
Todeszone Nordsee|action|1979|2
Der Sprengmeister|action|1991|4
Feuerprobe|action|1976|3
Schwarzes Kommando|action|1983|3
Der Fluchtwagen|action|1989|2
Angriff bei Tagesanbruch|action|1974|3
Die Bruchpiloten von Bottrop|komoed|1981|3
Mein Onkel, der Schwindler|komoed|1978|2
Alle lieben Lottchen|komoed|1985|3
Vier Rentner sehen rot|komoed|1990|4
Der Traumtänzer|komoed|1987|4
Zoff im Reihenhaus|komoed|1983|2
Herr Klotz und die Frauen|komoed|1976|2
Ein Chaot kommt selten allein|komoed|1989|3
Das schrägste Hotel der Welt|komoed|1986|3
Doktor Dussel greift ein|komoed|1974|2
Betriebsausflug ins Chaos|komoed|1991|4
Meine Schwiegermutter, das Biest|komoed|1980|3
Der Hochstapler von Hamburg|komoed|1988|4
Zwei Nasen tanken Super Plus|komoed|1984|2
Otto und der Nachbar|komoed|1979|3
Die Wohngemeinschaft|komoed|1991|4
Kleine Fische, große Klappe|komoed|1985|2
Der Pechvogel|komoed|1977|3
Urlaubsreif|komoed|1990|3
Ganoven unter sich|komoed|1982|2
Der Held vom Kegelverein|komoed|1988|3
Küss mich, Kollege|komoed|1986|3
Mein Vater, der Erfinder|komoed|1975|3
Der Millionenbetrüger von Wanne|komoed|1991|4
Familie Krause zieht um|komoed|1983|2
Das Ende der Stille|drama|1980|4
Winterreise|drama|1986|5
Die Frauen von Sankt Kilian|drama|1978|3
Kohle und Asche|drama|1974|4
Zwischen zwei Ufern|drama|1989|3
Der Verrat von Coburg|drama|1983|4
Was von uns bleibt|drama|1991|5
Die stille Fabrik|drama|1976|3
Vaters Land|drama|1985|4
Barfuß durch den Winter|drama|1981|3
Die Frau am Fenster|drama|1988|3
Ein Sommer ohne Wiederkehr|drama|1979|4
Die Zeugin|drama|1990|4
Nachtzug nach Rostock|drama|1987|3
Das Haus meiner Mutter|drama|1975|3
Der letzte Brief|drama|1984|4
Schwestern|drama|1991|4
Die Gasse hinter dem Bahnhof|drama|1977|3
Der Preis der Wahrheit|drama|1986|4
Kein Weg zurück|drama|1982|3
Die Erbschaft der Vogelsangs|drama|1989|3
Vor dem Sturm|drama|1973|4
Die Nacht der langen Schatten|horror|1980|3
Was im Moor begraben liegt|horror|1987|3
Die Bestie vom Hochmoor|horror|1976|2
Kalte Hände|horror|1990|3
Das Läuten im Turm|horror|1983|2
Der Wurm im Apfel|horror|1985|2
Blutrote Ernte|horror|1978|3
Die Kammer unter der Treppe|horror|1991|4
Nachtwache im Leichenhaus|horror|1982|2
Die Rückkehr der Toten von Ehrenfeld|horror|1988|4
Schatten hinter Glas|horror|1974|3
Der Fluch von Burg Rabenstein|horror|1979|2
Zähne in der Dunkelheit|horror|1986|2
Das Kind aus dem Brunnen|horror|1989|3
Der Kolonieplanet|scifi|1978|3
Zeitfalle|scifi|1984|4
Die Maschinen von Morgen|scifi|1990|4
Andromeda ruft nicht zurück|scifi|1981|3
Der letzte Mensch von Kepler 7|scifi|1987|3
Kristallwelten|scifi|1975|4
Aufbruch zum Nordstern|scifi|1983|2
Die Klone von Neu-Berlin|scifi|1989|3
Signal aus der Tiefe|scifi|1979|3
Roboterrevolte|scifi|1976|2
Das Tor am Rand des Alls|scifi|1991|5
Sonnensturm|scifi|1985|3
Die Rückseite des Mondes|scifi|1988|4
Terraforming Beta|scifi|1986|2
Der Doppelgänger aus dem Labor|scifi|1980|3
Vergiftete Spur|krimi|1981|4
Der Fall der schwarzen Witwe|krimi|1977|3
Mord in der Marktstraße|krimi|1988|4
Kommissar Reineke und der Tote im Kanal|krimi|1984|3
Das Schweigen der Zeugen|krimi|1990|4
Der Anwalt und der Mörder|krimi|1986|3
Tödliche Ermittlung|krimi|1975|2
Die Spur des Fälschers|krimi|1989|3
Nachtdienst im Präsidium|krimi|1982|3
Der Erpresser von Altona|krimi|1978|2
Falsches Spiel in Bonn|krimi|1991|4
Die Akte bleibt offen|krimi|1985|3
Verhör um Mitternacht|krimi|1979|3
Der Zeuge schweigt|krimi|1987|4
Blutgeld|krimi|1983|3
Spurensuche im Regen|krimi|1990|3
Die zweite Leiche|krimi|1976|2
Herzklopfen in Salzburg|liebe|1982|4
Der Sommer mit Marie|liebe|1987|4
Zwei Fremde am Meer|liebe|1979|3
Die Liebe der Buchhändlerin|liebe|1990|4
Ein Kuss zu spät|liebe|1975|2
Nachts in der Toskana|liebe|1986|3
Das Versprechen von Rügen|liebe|1991|3
Wenn Rosen blühen|liebe|1977|2
Die Braut aus dem Nachbardorf|liebe|1984|3
Zufall in Zürich|liebe|1989|3
Das Herz des Kapitäns|liebe|1980|2
Wiedersehen im Herbst|liebe|1988|4
Der Ritt nach Yuma|western|1971|3
Blei für den Sheriff|western|1968|2
Die Schlucht der Verlorenen|western|1975|3
Sattelfest|western|1973|2
Der Sohn des Revolvermanns|western|1979|3
Rauch über der Prärie|western|1966|3
Die Rache des Trappers|western|1977|2
Fort Bitterroot|western|1970|4
Der Fremde aus Nevada|western|1981|4
Goldstaub und Blut|western|1969|3
Der letzte Büffel|western|1974|4
Sturm über Wyoming|western|1972|2
Die Ozeane der Erde|doku|1988|4
Vom Korn zum Brot|doku|1983|3
Elefanten von Simbabwe|doku|1990|3
Die Alpen im Winter|doku|1986|3
Handwerk der Alten Meister|doku|1978|3
Der Regenwald atmet|doku|1991|5
Karawane durch die Sahara|doku|1982|4
Vögel über dem Wattenmeer|doku|1989|4
Das Jahr im Weinberg|doku|1985|3
Auf den Spuren der Wikinger|doku|1987|4
Die Kathedralen Europas|doku|1980|3
Leben am Polarkreis|doku|1991|4
Der Rhein von der Quelle bis zur Mündung|doku|1984|3
Fischer vor Helgoland|doku|1979|2
Bienenkönig Bruno|trick|1984|3
Die Hasenbande|trick|1987|4
Kleiner Bär, große Welt|trick|1990|3
Zauberwald|trick|1978|2
Die Rakete aus Pappe|trick|1986|3
Fips und der Weihnachtsdieb|trick|1989|3
Wolkenschaf Wilma|trick|1991|4
Der freche Kater Kalle|trick|1982|2
Piraten der Badewanne|trick|1988|3
Nachts im Schwimmbad|erotik|1986|2
Sommerhitze an der Riviera|erotik|1983|1
Die Verführung des Doktors|erotik|1989|2
Heiße Kur in Bad Windeck|erotik|1980|1
Nachbarn ohne Vorhang|erotik|1987|2
Endspurt im Olympiastadion|sport|1988|3
Der Aufstieg der Amateure|sport|1985|4
Zwei Runden bis zum Ruhm|sport|1990|4
Die Bergetappe|sport|1987|3
Schwimmen gegen die Zeit|sport|1983|2
Der Torwart|sport|1991|4
Nacht der Gitarren|musik|1986|3
Blasmusik im Kurpark|musik|1979|2
Die letzte Tournee|musik|1990|4
Orchester der Straße|musik|1988|3
Konzert im Steinbruch|musik|1985|3
Die Stimme aus Neapel|musik|1982|3
Der große Preis von Hintertupfing|show|1986|3
Bühne der Talente|show|1989|3
Tanz in den Mai|show|1984|2
Gala der Sterne|show|1991|4
Zirkus Salvatore|show|1980|3
Kopf oder Zahl|quiz|1987|3
Wissen ist Trumpf|quiz|1984|4
Das Glücksrad von Gummersbach|quiz|1990|4
Denksport für alle|quiz|1978|2
Die Antwortjäger|quiz|1988|3
Nachtgespräch|talk|1987|3
Streitgespräch am Freitag|talk|1990|3
Der grüne Sessel|talk|1984|2
Gäste im Wintergarten|talk|1988|3
Die späte Runde|talk|1991|4
Skulpturen der Moderne|kultur|1987|4
Die Malerin von Worpswede|kultur|1990|5
Theater am Stadtrand|kultur|1985|3
Poesie und Protest|kultur|1982|4
Die Orgel im Dom|kultur|1989|4
Meisterwerke aus Marmor|kultur|1978|3
Lyrik zur Nacht|kultur|1991|4
Die Bühne brennt|kultur|1986|4
Die Bestie von Bergen|action|1985|3
Alarmstufe Hafen|action|1989|3
Der Panzerknacker von Pankow|action|1991|2
Feuer über Kreta|action|1977|3
Kommando Nachtfalke|action|1983|4
Der Schatten des Attentäters|action|1980|3
Sturmflut über Cuxhaven|action|1986|3
Der Auftrag lautet Schweigen|action|1988|2
Ausnahmezustand|action|1990|4
Verfolgung auf der Autobahn|action|1979|2
Das Rennen gegen die Uhr|action|1984|3
Die Männer von Kompanie C|action|1974|3
Nachtflug nach Beirut|action|1987|3
Untergrundkrieg|action|1982|2
Der Zerstörer|action|1991|4
Die Insel der Verschollenen|action|1976|2
Fluchtpunkt Triest|action|1985|4
Der eiserne Griff|action|1978|3
Gegenschlag|action|1990|3
Sabotage im Kraftwerk|action|1983|2
Zwei Nasen und ein Erbe|komoed|1988|3
Der Zauberlehrling vom Amt|komoed|1985|2
Chaos in der Kantine|komoed|1990|3
Mein Nachbar, der Millionär|komoed|1982|4
Tante Trudes Testament|komoed|1979|2
Der falsche Doktor|komoed|1987|3
Ferien mit Schwiegermutter|komoed|1991|3
Die Rentnergang schlägt zu|komoed|1989|4
Herr Bimmelmann sucht das Glück|komoed|1977|2
Fußball ist unser Leben|komoed|1986|3
Die drei vom Trödelmarkt|komoed|1984|2
Kollege Kalauer|komoed|1990|3
Sekretärinnen sehen alles|komoed|1983|2
Der Notarzt vom Dienst|komoed|1988|3
Umzug mit Hindernissen|komoed|1991|4
Der Klavierstimmer|komoed|1975|3
Zwei Onkel für Anna|komoed|1986|3
Vollpension|komoed|1980|2
Die Klasse von 68|drama|1988|4
Grubenlicht|drama|1979|4
Was der Vater nie erzählte|drama|1991|5
Fremde Heimat|drama|1985|4
Die Näherin|drama|1976|3
Nach dem Regen|drama|1990|3
Zwei Brüder, ein Hof|drama|1983|4
Der Deichgraf|drama|1978|3
Die Stunde der Frauen|drama|1987|4
Abschied von Elisabeth|drama|1981|3
Das Zimmer über dem Laden|drama|1989|4
Wenn der Wind sich dreht|drama|1974|3
Der Trinker|drama|1986|5
Die Kinder aus Block D|drama|1991|4
Ein Leben für die Werft|drama|1982|3
Späte Rechnung|drama|1988|4
Die Frauen vom Leuchtturm|drama|1977|3
Der Mann ohne Papiere|drama|1990|4
Das Grauen kommt um sieben|horror|1984|2
Im Bauch des Hauses|horror|1988|3
Die schwarze Hochzeit|horror|1980|3
Wenn die Puppen tanzen|horror|1986|2
Kellerkinder|horror|1991|3
Der Nebel von Wangerooge|horror|1979|3
Das Auge im Spiegel|horror|1987|2
Die Ratten von Sankt Pauli|horror|1983|2
Der siebte Schrei|horror|1990|3
Winterschlaf der Toten|horror|1977|2
Der Herr der Krähen|horror|1989|4
Kalte Zellen|scifi|1986|4
Die Rebellion der Denkmaschinen|scifi|1982|4
Landung auf Titan|scifi|1988|3
Das Vermächtnis der Sternenflotte|scifi|1979|3
Zeitschleife über Wien|scifi|1990|4
Der Planet ohne Namen|scifi|1976|2
Doppelte Erde|scifi|1985|3
Kolonie im Ödland|scifi|1991|3
Die Botschaft der Vorfahren|scifi|1984|4
Schwerelos|scifi|1987|2
Der Sprung durchs Nichts|scifi|1980|3
Nachricht von Proxima|scifi|1989|4
Das letzte Alibi|krimi|1986|3
Der Tote im Weinkeller|krimi|1990|4
Mordkommission Rheinland|krimi|1983|3
Die Spur der Diamanten|krimi|1978|3
Kommissarin Bergmann ermittelt|krimi|1991|4
Der Fall der roten Schuhe|krimi|1985|3
Anschlag auf den Nachtzug|krimi|1980|2
Ein Mörder unter Kollegen|krimi|1988|4
Der Zeuge aus dem Ausland|krimi|1976|4
Blutspur nach Bremen|krimi|1989|3
Das Verhör|krimi|1984|3
Der Pate von Kreuzberg|krimi|1987|3
Undercover in Frankfurt|krimi|1991|3
Der Fälscher und die Gräfin|krimi|1982|2
Nachtblende|krimi|1979|3
Sommer der Sehnsucht|liebe|1985|4
Die Tochter des Winzers|liebe|1989|3
Ein Herz in Kopenhagen|liebe|1978|2
Der Brief, der nie ankam|liebe|1991|4
Zwei Wege, ein Ziel|liebe|1986|3
Verliebt in den Kollegen|liebe|1983|2
Die zweite Hochzeit|liebe|1990|3
Nachtwind über Sylt|liebe|1980|3
Das Café am Kanal|liebe|1988|4
Rendezvous in Prag|liebe|1976|2
Der Reiter von Rio Bravo|western|1969|4
Staub auf der Hauptstraße|western|1973|2
Das Grab in der Wüste|western|1977|3
Die Frau des Sheriffs|western|1971|3
Kupfer und Blut|western|1965|3
Der Trail nach Santa Fe|western|1980|4
Die Bande von Silver Hill|western|1975|2
Letztes Aufgebot|western|1968|3
Der Kopfgeldjäger von Tucson|western|1982|3
Nordwärts nach Montana|western|1972|4
Die Sonne über Sizilien|doku|1988|3
Vögel des Nordens|doku|1985|4
Der lange Weg der Kartoffel|doku|1981|2
Bergbauern|doku|1990|4
Zwischen den Gezeiten|doku|1987|3
Steinzeit im Museum|doku|1979|3
Das Erbe der Hanse|doku|1991|4
Löwen der Kalahari|doku|1986|4
Die Donau abwärts|doku|1984|3
Insekten unter dem Mikroskop|doku|1989|3
Vom Bergwerk zur Ruine|doku|1978|3
Wale vor Norwegen|doku|1991|4
Der kleine Igel Ignaz|trick|1985|3
Ritter Rost und der Drache|trick|1988|3
Die Maus im Uhrwerk|trick|1990|4
Papierflieger|trick|1983|2
Der Traumzug|trick|1987|3
Bärenstark und Hasenschnell|trick|1991|4
Der Zirkus der Schatten|trick|1979|2
Nachtclub Nizza|erotik|1985|2
Die Kur der Baronin|erotik|1988|1
Sonne, Sand und Skandal|erotik|1982|2
Zimmer 14|erotik|1990|2
Das Finale von Wembley|sport|1986|4
Kampf um den Titel|sport|1989|3
Die Läuferin|sport|1991|4
Sprung ins Ungewisse|sport|1984|2
Handball ist kein Ponyhof|sport|1988|3
Das Konzert im Rathaus|musik|1987|3
Jazz im Keller|musik|1984|3
Volksmusik aus dem Zillertal|musik|1990|2
Die Sängerin von Sanremo|musik|1986|3
Rockpalast Sonderausgabe|musik|1989|4
Samstagabend live|show|1988|3
Der Wunschbrunnen|show|1985|2
Nummer eins mit Anlauf|show|1991|4
Sterne über der Manege|show|1983|3
Die Quizmaschine|quiz|1989|3
Zahl oder Zunge|quiz|1986|2
Der große Städtewettkampf|quiz|1991|4
Wer wagt, gewinnt|quiz|1984|3
Zwischenruf|talk|1989|4
Am runden Tisch|talk|1986|3
Sprechstunde|talk|1991|3
Die Nachtschicht|talk|1985|2
Ausstellung ohne Publikum|kultur|1988|4
Der Bildhauer von Ulm|kultur|1985|3
Barock in Bayern|kultur|1990|4
Die Schriftstellerin|kultur|1987|5
Chorprobe|kultur|1983|3
Museum bei Nacht|kultur|1991|4
Die Fresken von Assisi|kultur|1986|4
Der Verrat von Gibraltar|action|1981|3
Sprengkommando Süd|action|1987|4
Die Jagd auf den Doppelagenten|action|1984|4
Feuerwalze|action|1978|2
Der Killer von Kopenhagen|action|1990|3
Anschlag im Alpentunnel|action|1986|3
Der Boxer und der Boss|action|1982|2
Nachtschicht in Neapel|action|1989|3
Der Panzerzug|action|1975|3
Todesfahrt nach Tanger|action|1980|2
Operation Nordwind|action|1988|3
Die Faust des Gesetzes|action|1991|4
Wüstensturm über Aden|action|1985|3
Der Draufgänger|action|1977|2
Rückzug unmöglich|action|1990|3
Onkel Emils Erben|komoed|1984|3
Der Bäcker und die Bankräuber|komoed|1989|3
Zwei linke Hände|komoed|1986|2
Die Hausmeisterin|komoed|1991|4
Verkehrte Welt in Wanne-Eickel|komoed|1981|2
Alles für die Katz|komoed|1987|4
Der Schrebergartenkrieg|komoed|1990|4
Herr Pieper hat Geburtstag|komoed|1978|2
Die Ehestreikbrecher|komoed|1985|3
Kegelclub auf Abwegen|komoed|1988|3
Der Kleiderschrank|komoed|1976|2
Mein Chef, das Chaos|komoed|1991|3
Vier Hände am Steuer|komoed|1983|2
Die Hochzeitsplaner|komoed|1990|3
Der Erbe von Gut Grünwald|drama|1987|4
Wintergerste|drama|1980|3
Das Mädchen aus der Werkssiedlung|drama|1984|4
Der Schweiger|drama|1991|5
Nach der Flut|drama|1978|3
Die Rückkehr des Sohnes|drama|1989|4
Salz und Brot|drama|1975|3
Der Tag, an dem alles kippte|drama|1986|4
Die Wirtin vom Rothenbach|drama|1982|3
Kalte Öfen|drama|1990|4
Der Schuldschein|drama|1977|3
Zwei Frauen im Krieg|drama|1988|5
Die Anstalt|drama|1985|4
Verlassene Häuser|drama|1991|3
Der Nachtportier von Zelle 12|horror|1986|2
Die Fratze im Fenster|horror|1989|3
Blutbuche|horror|1983|2
Was im Keller wohnt|horror|1991|3
Die zwölfte Stunde|horror|1978|3
Der Wolf von Wolfsburg|horror|1985|2
Grabesstille|horror|1990|3
Die Puppenklinik|horror|1987|4
Der Reaktor von Wolgast|scifi|1989|4
Sternenstaub|scifi|1983|3
Die Zeitkapsel|scifi|1986|4
Fremde Kolonisten|scifi|1979|2
Der Aufstand der Automaten|scifi|1991|4
Orbit 12|scifi|1985|3
Die Sonde vom Mars|scifi|1988|3
Weltraumbahnhof Bremerhaven|scifi|1990|4
Das Experiment Nachtblau|scifi|1982|3
Der Tote in der Tiefgarage|krimi|1988|3
Die Bank am Ende der Ermittlung|krimi|1991|4
Kommissar Hansen und der Feuerteufel|krimi|1985|3
Schüsse im Nebel|krimi|1979|3
Der Anruf des Erpressers|krimi|1990|4
Mord auf dem Wochenmarkt|krimi|1986|3
Die Zeugin aus dem Hochhaus|krimi|1983|2
Der Fall Weinberg|krimi|1989|4
Nachtstreife|krimi|1977|3
Die Spur der Sammlerin|krimi|1991|4
Tödliche Bilanz|krimi|1984|3
Zwei Herzen an der Elbe|liebe|1987|3
Die Winzerin von Bacharach|liebe|1990|4
Ein Sommer in Alicante|liebe|1982|2
Der Tanzlehrer|liebe|1985|3
Post aus Paris|liebe|1979|3
Das Versprechen im Schnee|liebe|1991|3
Die Frau vom Bäcker gegenüber|liebe|1988|4
Der Reiter von Red Rock|western|1970|3
Sturm über Nevada|western|1976|2
Der Sheriff von Silver Creek|western|1967|3
Blut am Wagenrad|western|1974|3
Die Postkutsche nach Denver|western|1979|2
Der Mann mit der Narbe|western|1971|4
Gletscher der Alpen|doku|1989|4
Der Wald erzählt|doku|1986|4
Fischerei in der Ostsee|doku|1982|3
Die Wüste Gobi|doku|1990|4
Vom Erz zum Stahl|doku|1978|3
Zugvögel|doku|1991|4
Klöster und Kräuter|doku|1985|3
Die Küsten Irlands|doku|1988|4
Der kleine Wal Willi|trick|1986|3
Zwergenland in Not|trick|1989|3
Das Fahrrad, das fliegen konnte|trick|1991|4
Mäusepolizei|trick|1984|2
Der Schneemann von nebenan|trick|1988|3
Sünde im Schwarzwald|erotik|1984|1
Nächte in Amsterdam|erotik|1989|2
Die schöne Zahnärztin|erotik|1986|2
Endkampf um Gold|sport|1987|4
Die Radrundfahrt|sport|1990|3
Trainingslager|sport|1985|2
Der Rekord|sport|1991|4
Volksfest der Blasmusik|musik|1988|2
Chansons aus Montmartre|musik|1985|3
Die Rockband aus dem Hinterhof|musik|1991|3
Symphonie in Blau|musik|1987|4
Rateteam Rheinland|show|1987|2
Der bunte Abend|show|1990|3
Talent gesucht|show|1985|3
Showtreppe|show|1989|4
Frage und Antwort|quiz|1988|4
Der Denkerclub|quiz|1985|2
Kluge Köpfe|quiz|1991|3
Gegenrede|talk|1988|3
Der Sessel bleibt leer|talk|1990|3
Zwischen den Zeilen|talk|1986|2
Bibliotheken der Welt|kultur|1989|4
Die Weberin|kultur|1986|4
Kirchenfenster|kultur|1991|3
Der Dichter aus dem Erzgebirge|kultur|1984|5
Skizzen einer Stadt|kultur|1988|3
Der Anschlag von Ankara|action|1983|4
Kommando Wüstenfuchs|action|1986|3
Die Bombenleger|action|1990|4
Fluchtweg Bodensee|action|1979|2
Der Söldner kehrt heim|action|1987|3
Alarm im Atomkraftwerk|action|1984|4
Der Rammbock|action|1991|3
Nachtjagd über der Nordsee|action|1976|3
Die Geiseln von Genf|action|1988|4
Panzerspur|action|1981|2
Der Sprengstoffkurier|action|1989|4
Feuerteufel|action|1985|3
Der Kesselflicker|komoed|1982|2
Zwei Halunken im Ruhestand|komoed|1990|3
Die Wetterfrösche|komoed|1987|3
Herr Schmitt und der Papagei|komoed|1979|2
Der Betriebsrat tobt|komoed|1991|3
Ein Zwilling zu viel|komoed|1985|3
Die Kur macht Karriere|komoed|1988|4
Hausbesetzer wider Willen|komoed|1983|2
Der Losverkäufer|komoed|1977|2
Meine Tante, die Diva|komoed|1989|3
Zoff im Zoo|komoed|1986|2
Der Kegelbruder|komoed|1991|3
Grauer Beton|drama|1983|4
Die Fabrikantentochter|drama|1988|4
Der Weg nach Süden|drama|1991|4
Winter in Wolgast|drama|1979|3
Die Sprechstundenhilfe|drama|1986|3
Was bleibt vom Sommer|drama|1990|5
Der Bruder aus dem Westen|drama|1985|4
Nachtdienst|drama|1982|3
Die Frau des Bergmanns|drama|1976|4
Der Rückzug|drama|1989|3
Zwei Jahre ohne Nachricht|drama|1991|4
Die Straße hinunter|drama|1984|3
Das Zimmer im Turm|horror|1988|3
Die Uhr schlägt dreizehn|horror|1985|2
Was auf dem Dachboden lebt|horror|1990|3
Blutmond über Hameln|horror|1982|2
Die Nacht der stummen Kinder|horror|1991|4
Der Hexenhammer|horror|1979|4
Kalter Atem|horror|1987|2
Der Turm auf Titan|scifi|1987|3
Die Erben der Erde|scifi|1990|4
Signal 27|scifi|1984|3
Der Weg zum Doppelstern|scifi|1981|2
Vakuum|scifi|1988|3
Die Stadt unter dem Eis|scifi|1991|3
Roboter Rolf|scifi|1986|2
Der Mörder von nebenan|krimi|1987|3
Die Akte Sonnenberg|krimi|1990|4
Kommissar Vogt und die stille Zeugin|krimi|1984|4
Der Raub der Krondiamanten|krimi|1978|3
Schweigepflicht|krimi|1991|4
Tote schweigen nicht|krimi|1986|3
Die Falle am Alexanderplatz|krimi|1989|3
Der Chauffeur|krimi|1982|2
Blutige Spur im Sand|krimi|1980|3
Der Prozess|krimi|1988|4
Sommernacht in Salzburg|liebe|1986|4
Die Ärztin und der Fischer|liebe|1989|3
Ein Ring aus Silber|liebe|1983|2
Der letzte Sommer am See|liebe|1991|3
Wiedersehen in Rom|liebe|1980|3
Die Lehrerin aus Lübeck|liebe|1987|3
Der Marshal ohne Stern|western|1972|3
Feuerwasser|western|1968|2
Die Schlucht der Apachen|western|1975|4
Reiter im Morgengrauen|western|1970|3
Der Goldzug|western|1978|4
Gerechtigkeit für Laredo|western|1966|2
Der Amazonas|doku|1990|4
Kraniche über der Rhön|doku|1987|4
Die Salzgärten der Bretagne|doku|1984|3
Vom Ei zum Küken|doku|1980|2
Nomaden der Mongolei|doku|1991|4
Der Bodensee im Wandel|doku|1986|3
Museen der Antike|doku|1988|3
Der Frosch auf Weltreise|trick|1987|3
Sternschnuppe Susi|trick|1990|4
Die Werkstatt der Kobolde|trick|1985|4
Kalle Kaktus|trick|1982|2
Wolkenkuckucksheim|trick|1989|3
Hotel Sonnenschein|erotik|1987|1
Die Praktikantin|erotik|1990|2
Riviera bei Nacht|erotik|1983|1
Marathon in Athen|sport|1988|3
Der Aufstieg|sport|1991|4
Zweikampf auf dem Eis|sport|1986|3
Der Sprint|sport|1989|2
Konzert der Chöre|musik|1986|3
Die Wandergitarre|musik|1983|2
Nachtmusik|musik|1990|4
Das Blasorchester|musik|1988|4
Wetten im Studio|show|1989|3
Die Showbühne|show|1986|2
Applaus für alle|show|1991|3
Rätselstunde|quiz|1987|3
Das große Los|quiz|1990|3
Kopfnuss|quiz|1985|2
Fragestunde|talk|1987|2
Der lange Abend|talk|1991|4
Rede und Gegenrede|talk|1989|3
Die Restauratorin|kultur|1990|5
Alte Meister neu gesehen|kultur|1987|4
Das Stadttheater|kultur|1985|4
Steine erzählen|kultur|1989|4
Der Komponist|kultur|1991|4
Der Sturm auf die Zentrale|action|1988|3
Zielfahndung|action|1991|3
Die Nacht der Verfolger|action|1985|3
Grenzgänger|action|1982|2
Der Sprengsatz im Koffer|action|1989|3
Feindesland|action|1979|3
Die Spur der Schmuggler|action|1986|2
Endstation Hafenbecken|action|1990|4
Der Zoowärter und die Diebe|komoed|1988|3
Zwei Damen machen Urlaub|komoed|1991|3
Der Kioskbesitzer|komoed|1985|2
Alles auf Anfang|komoed|1989|3
Die Kaffeefahrt|komoed|1986|4
Herr Wobbe wird berühmt|komoed|1983|2
Der Dachdecker vom Dienst|komoed|1990|3
Zwei Chefs zu viel|komoed|1987|4
Die letzte Werkbank|drama|1989|4
Der Fremde am Grab|drama|1986|3
Zwischen den Jahren|drama|1991|5
Die Nachbarin|drama|1984|3
Am Rand der Stadt|drama|1988|4
Der Werkstattmeister|drama|1981|3
Was Mutter verschwieg|drama|1990|3
Die Lehrerin von Wilhelmsburg|drama|1987|3
Wenn Türen zufallen|horror|1989|4
Die Kellerbar|horror|1986|2
Nachtgestalten|horror|1991|3
Der Spiegel im Flur|horror|1984|2
Die Krähen von Kalkar|horror|1988|3
Sternenwind|scifi|1989|3
Der Bunker von Alpha 4|scifi|1985|2
Die Rückkehr des Kometen|scifi|1991|4
Kolonie Erde Zwei|scifi|1987|3
Datenkrieg|scifi|1990|4
Der Fall der Bankiersfrau|krimi|1988|4
Verhör in Kiel|krimi|1985|4
Der Tote am Kanal|krimi|1991|3
Kommissarin Sander|krimi|1989|3
Die Schuld des Sohnes|krimi|1983|3
Falschgeld|krimi|1987|3
Die Zeugin von Zimmer 4|krimi|1990|3
Der Bäcker aus Bologna|liebe|1988|4
Ein Sommerabend in Wien|liebe|1990|4
Die Fährfrau|liebe|1985|3
Zwei Briefe|liebe|1991|3
Sonnenuntergang in Sorrent|liebe|1982|2
Reiter der Nacht|western|1973|3
Die Ranch am Fluss|western|1969|3
Der Duellant|western|1977|2
Wagenspur nach Westen|western|1971|4
Der Rhein von oben|doku|1989|4
Wüstenrose|doku|1986|3
Tiere der Tundra|doku|1991|4
Die Werften von Danzig|doku|1985|3
Vom Bau der Kathedralen|doku|1988|3
Die Zauberflöte für Kinder|trick|1988|3
Der kleine Roboter Rudi|trick|1991|4
Waldgeschichten|trick|1986|3
Der fliegende Teppich|trick|1984|2
Ferienhaus Fortuna|erotik|1988|2
Nachtbar Elite|erotik|1985|1
Der Endlauf|sport|1990|4
Die Turnerin|sport|1987|3
Vier Runden Vorsprung|sport|1991|3
Musikantenstadl Spezial|musik|1989|2
Die Geigerin|musik|1991|4
Sommerkonzert im Park|musik|1987|3
Der große Showpalast|show|1990|3
Bühne der Träume|show|1987|4
Das Ratespiel|quiz|1989|2
Punkt für Punkt|quiz|1991|3
Nachtcafé|talk|1990|3
Der Stuhlkreis|talk|1988|2
Der Kupferstecher|kultur|1988|4
Ausstellung im Schloss|kultur|1991|3
Der Roman einer Straße|kultur|1989|5
Handschriften aus dem Kloster|kultur|1986|4
Die Brücke am Ende der Welt|drama|1989|5
Der Kongress der Trickser|komoed|1990|5
Sternenfahrer|scifi|1988|5
Der Fall des Jahrhunderts|krimi|1991|5
Das Lied der Weite|western|1976|5
Chronik eines Sommers|kultur|1990|5
Der Untergang der Nordstern|action|1987|5
Die Nacht der langen Messer|horror|1985|4
Zwei Herzen im Dreivierteltakt|liebe|1989|5
Der Ozean und wir|doku|1991|5
Der Weltmeister|sport|1990|5
Die Zauberer von Zwiebelstadt|trick|1991|5
`.trim().split('\n');

/** Serien. Aufbau: Titel | Genre | Jahr | Güteklasse | Folgen */
export const SERIE_DATA: readonly string[] = `
Praxis Dr. Sommer|serie|1988|3|12
Die Rosenheimer|serie|1985|3|16
Raumpatrouille Nova|scifi|1979|4|8
Der Kommissar und ich|krimi|1986|4|13
Nachbarn & Nachbarn|komoed|1990|3|20
Hotel Seeblick|drama|1989|3|14
Die Schulhof-Gang|serie|1991|2|10
Klinik am Kurpark|drama|1987|3|18
Der Bulle von Bochum|krimi|1990|4|11
Familie Feuerstein GmbH|trick|1984|3|24
Sunset Riders|western|1978|3|9
Agenten in Aspik|action|1983|3|12
Die Küstenwache von Kiel|action|1991|3|13
Herzflimmern|liebe|1989|3|15
Galaxy Rangers|trick|1987|3|22
Der Bulle vom Bodensee|krimi|1989|4|14
Zimmer 21|drama|1991|3|12
Die Wanderpraxis|serie|1986|3|16
Sturmfrei|komoed|1990|2|22
Raumstation Kepler|scifi|1988|4|10
Die Bergrettung|serie|1991|3|18
Kanzlei Sonnenschein|serie|1987|3|20
Zwei Schwestern|drama|1985|3|13
Die Hafenkommissarin|krimi|1990|4|11
Nachbarschaftshilfe|komoed|1989|2|24
Die Schwarzwaldpraxis|serie|1988|3|16
Hafenrevier|krimi|1990|4|13
Zwei Männer, ein Wohnwagen|komoed|1989|2|20
Die Bergwacht|serie|1991|3|14
Der Landarzt von Hollental|drama|1987|3|18
Kanzlei am Marktplatz|serie|1986|3|15
Nachbarn in Not|drama|1990|3|22
Die Feuerwehr von Wiesenbach|serie|1989|2|18
Raumpatrouille Andromeda|scifi|1982|4|10
Die Pension Seeblick|komoed|1988|2|24
Kommissar Brandt|krimi|1985|4|12
Die Klinikschwestern|drama|1991|3|16
Zwischen den Etagen|serie|1990|2|20
Der Zoo von Waldheim|serie|1987|3|14
Familie Kummerfeld|komoed|1986|2|22
Die Hotelerbin|drama|1989|3|13
Streifenwagen 12|krimi|1988|3|18
Das Reisebüro|komoed|1991|3|16
Die Detektei Falkenberg|krimi|1986|3|15
Sturm über der Nordsee|drama|1990|4|11
Die Konditorei|serie|1989|2|20
Der Wachtmeister vom Dorf|krimi|1984|3|14
Wolkenkratzer 9|serie|1991|3|12
Die Tierärztin|serie|1988|3|18
Der Bahnhofsvorsteher|komoed|1987|2|24
Sanatorium Bergblick|drama|1990|3|15
Die Fährleute|serie|1989|3|16
Nachtschicht im Werk|drama|1986|4|12
Der Musiklehrer|komoed|1991|2|18
Die Erben von Falkenau|drama|1988|4|14
Zwei Kommissare für Köln|krimi|1990|3|20
Die Bäckerei Brotmann|komoed|1985|2|22
Notruf Ostseeküste|serie|1991|3|13
Der Kapitän der Möwe|serie|1987|3|16
Villa Vergissmeinnicht|drama|1989|3|14
Das Amtsgericht|serie|1990|3|18
Die Landfrauen|komoed|1988|2|20
Sternstunde des Sports|serie|1986|2|24
Der Bibliothekar|drama|1991|4|10
Die Wetterstation|serie|1989|3|15
Praxis am Park|drama|1987|3|19
Die Möbelpacker|komoed|1990|2|21
Zollamt Nord|krimi|1988|3|16
Die Wirtin der Krone|serie|1991|3|14
Der Nachtwächter|komoed|1986|2|18
Insel der Sonne|drama|1989|3|12
Die Autowerkstatt|komoed|1991|2|20
Kripo Küstenwache|krimi|1987|4|13
Das Waisenhaus|drama|1985|4|11
Die Bergsteigerin|serie|1990|3|15
Die Gärtnerei Sommerfeld|serie|1988|3|17
Zimmer frei in Zinnowitz|komoed|1990|2|22
Der Hafenarzt|drama|1989|3|14
Streife Süd|krimi|1991|3|18
Das Kaufhaus|serie|1987|3|20
Die Gutsherrin|drama|1986|4|12
Zwei Schwestern und ein Hotel|komoed|1990|2|24
Der Wildhüter|serie|1988|3|16
Die Nachtapotheke|drama|1991|3|13
Fährhaus Lindau|serie|1989|3|15
Der Uhrmacher von Glashütte|drama|1987|4|11
Die Reiterhof-Saga|serie|1990|3|19
Kommissar Kranz ermittelt|krimi|1986|3|14
Die Schneiderin|drama|1991|4|10
Betriebsfeuerwehr|serie|1988|2|21
Der Tierpfleger|komoed|1989|2|18
Die Erbengemeinschaft|drama|1990|3|13
Grenzstation Ost|krimi|1987|4|12
Die Musikschule|komoed|1991|2|20
Küstenklinik|drama|1989|3|16
Das Fundbüro|komoed|1988|2|23
Der Nachtbus|serie|1990|3|15
Die Winzerfamilie|drama|1986|3|18
Revier Rheinhafen|krimi|1991|3|14
Die Hebamme von Hiddensee|drama|1988|4|11
Sommerhaus am Deich|serie|1990|3|17
Der Antiquitätenhändler|komoed|1987|3|16
Die Bahnmeisterei|serie|1989|2|22
Klinik im Grünen|drama|1991|3|12
Der Kioskkönig|komoed|1988|2|24
Die Bergrettung Zwei|serie|1990|3|13
Das Ordnungsamt|komoed|1991|2|19
Die Fischerin von Fehmarn|drama|1987|4|10
Zentrale Nord|krimi|1989|3|15
Die Wäscherei|komoed|1986|2|20
Der Dorfschullehrer|drama|1990|3|14
Ambulanz 7|serie|1991|3|16
Die Konditorenfamilie|komoed|1988|2|21
Wachdienst Weststadt|krimi|1990|3|17
Die Malerin vom Bodensee|drama|1989|4|11
Das Ferienlager|komoed|1987|2|18
Die Speditionsfamilie|serie|1991|3|15
Der Kurschatten|komoed|1988|2|22
Klinik am Waldrand|drama|1990|3|13
Die Marktfrauen|komoed|1989|2|24
Ermittlungsgruppe Elbe|krimi|1991|4|12
Die Küstenwacht|serie|1988|3|18
Der Nachtportier|komoed|1990|2|20
Die Familienrichterin|drama|1991|4|10
Das Sägewerk|drama|1986|3|16
`.trim().split('\n');

/** Werbekunden. Aufbau: Marke | Produkt | Zielgruppe */
export const BRANDS: readonly string[] = `
Blubb Cola|Erfrischungsgetränk|teen
Knusperix|Frühstücksflocken|kind
Vroom Motors|Mittelklassewagen|ang
Silberlöffel|Fertigsuppen|haus
Turbo Waschmittel|Vollwaschmittel|haus
Dr. Pillmann|Kopfschmerztabletten|rent
Gigabyte 386|Heimcomputer|ang
Fluffy|Katzenfutter|rent
Nordsee-Bank|Sparbrief|ang
Bellissimo|Tiefkühlpizza|teen
Gummiflitzer|Turnschuhe|teen
Opa Lehmanns|Kräuterlikör|rent
Kuschelweich Plus|Weichspüler|haus
Titan Rasierer|Nassrasierer|ang
Weitblick Reisen|Busreise ins Grüne|rent
Blitzblank|Scheuermilch|haus
Mondrakete|Spielzeugbausatz|kind
Ferdis Fritten|Imbisskette|arbl
Hydra Duschgel|Duschgel|teen
Amigo Kaugummi|Kaugummi|kind
Panther Energy|Energydrink|teen
Kaiser Pils|Bier|arbl
Goldrand Kaffee|Röstkaffee|rent
Zwergnase|Babynahrung|haus
Astra Versicherung|Lebensversicherung|ang
Rapido Reifen|Winterreifen|ang
Schoko Bär|Schokoriegel|kind
Pinguin Eiscreme|Speiseeis|kind
Windrose Zigaretten|Zigaretten|arbl
Tempo Nudeln|Instantnudeln|arbl
Vitalis|Multivitaminsaft|haus
Nova Kosmetik|Anti-Falten-Creme|haus
Bohrmax|Heimwerkerbedarf|ang
Dackel Hundefutter|Hundefutter|rent
Sirius Uhren|Armbanduhr|ang
Wolke 7|Matratzen|rent
Bytec Software|Textverarbeitung|ang
Frostfrei|Kühlschränke|haus
Rocket Sport|Fitnessstudio|teen
Perle Mineralwasser|Mineralwasser|haus
Tornado Staubsauger|Staubsauger|haus
Piccolo Sekt|Sekt|arbl
Sunny Sonnenmilch|Sonnenmilch|teen
Hammerpreis Markt|Discounter|arbl
Lorbeer Zahnpasta|Zahncreme|kind
Kondor Fluglinie|Billigflüge|ang
Bärenstark Klebstoff|Alleskleber|kind
Diva Parfum|Damenparfum|haus
Granit Baumarkt|Baumarkt|ang
Wunschlos Möbel|Möbelhaus|haus
Fluffo Weichspüler|Weichspüler|haus
Krallmann Werkzeug|Akkuschrauber|ang
Fernblick Reisen|Busreise ins Grüne|rent
Zwergenland|Bauklötze|kind
Prallo Kaugummi|Kaugummi|teen
Herzhaft & Co.|Wurstwaren|haus
Nordlicht Bier|Pilsener|arbl
Spuli Spülmaschine|Geschirrspüler|haus
Rasant Rasierer|Nassrasierer|ang
Bunte Blase|Limonade|kind
Vitaflex Turnschuh|Sportschuh|teen
Kanzlei Vorsicht|Rechtsschutz|ang
Grabesruh|Sterbevorsorge|rent
Wolkenweich Matratzen|Federkernmatratze|rent
Rasenmaxe|Rasenmäher|ang
Trallala Schallplatten|Schlagerplatten|rent
Klarsicht|Fensterreiniger|haus
Kraftmeier Proteinriegel|Eiweißriegel|teen
Pixelpower|Spielkonsole|kind
Kummerkasten Versicherung|Hausratpolice|ang
Fettarm Margarine|Halbfettmargarine|haus
Bärenstark Kleber|Alleskleber|ang
Süßholz Bonbons|Lutschbonbons|kind
Hüpfburg Freizeitpark|Tageskarte|kind
Donnerkeil Motorrad|Straßenmaschine|teen
Wachhund Alarmanlage|Einbruchmelder|ang
Torfrock Gummistiefel|Gartenstiefel|rent
Bierbaum Bratwurst|Rostbratwurst|arbl
Zackzack Kurierdienst|Paketversand|ang
Milde Sorte Tee|Kräutertee|rent
Kicker Klaus|Fußballmagazin|arbl
Frisch & Fröhlich|Joghurtdrink|haus
Meisterlack|Wandfarbe|ang
Nimmersatt Tiefkühl|Fertigpizza|arbl
Silberpfeil Fahrrad|Rennrad|teen
Ohrwurm Kassetten|Leerkassetten|teen
Kleiderbügel Mode|Herrenanzug|ang
Puppenstube|Puppenhaus|kind
Rentnerglück|Seniorenresidenz|rent
Schaumkrone|Duschgel|haus
Tempolimit Reifen|Winterreifen|ang
Naschkatze|Schokoriegel|kind
Beinfrei Strumpfhosen|Feinstrumpfhose|haus
Kabelsalat Elektronik|Verlängerungskabel|arbl
Wackelpudding|Dessertpulver|kind
Hammerhart Baumarkt|Werkzeugkoffer|ang
Fernweh Fluglinie|Ferienflieger|ang
Stubenrein Tiernahrung|Katzenfutter|rent
Krachbumm Feuerwerk|Silvesterbatterie|arbl
Wattebausch Windeln|Babywindeln|haus
Knabberfix|Erdnussflips|kind
Sprudelmax|Mineralwasser|haus
Lederherz Schuhe|Wanderstiefel|rent
Tempokraft|Energiedrink|teen
Bürostuhl Bequem|Drehstuhl|ang
Krümelmonster Backmischung|Rührkuchen|haus
Nachtruhe Ohrstöpsel|Gehörschutz|arbl
Federleicht Daunen|Bettdecke|rent
Zebrastreifen Reisebus|Städtereise|rent
Blitzlicht Kameras|Kompaktkamera|ang
Waldmeister Brause|Limonade|kind
Hanteltraum|Kurzhantelset|teen
Zahnfee Zahnpasta|Kinderzahncreme|kind
Grillmeister Karl|Holzkohlegrill|arbl
Seifenblase|Duschbad|haus
Rasenfein Dünger|Rasendünger|ang
Tanzschuh Trude|Ballschuhe|rent
Turbotinte|Füllfederhalter|teen
Hausfreund Versicherung|Haftpflicht|ang
Käseglocke Feinkost|Schnittkäse|haus
Kettenblitz Fahrradöl|Kettenöl|teen
Sonnenschirm Süd|Balkonschirm|rent
Notizblitz|Haftnotizen|ang
Zuckerwatte Zora|Jahrmarktsüßes|kind
Nachtlicht Nelli|Kindernachtlicht|kind
Bohnerwachs Berta|Bodenpflege|haus
Fernsehsessel Fred|Relaxsessel|rent
Wollknäuel|Strickgarn|haus
Trommelfeuer|Schlagzeugset|teen
Klemmbrett Klaus|Büromaterial|ang
Salzstange Sally|Salzgebäck|arbl
Reifenteufel|Sommerreifen|ang
Kaminfeuer Kamine|Kaminofen|rent
Gummiente Gustav|Badespielzeug|kind
Pfannkuchen Paul|Fertigteig|haus
Schwitzkasten|Sauna-Aufguss|arbl
Klingelton Telefone|Tischtelefon|ang
Wanderlust Rucksäcke|Trekkingrucksack|teen
Puderquaste|Gesichtspuder|haus
Zinnfigur Zacharias|Sammelfiguren|rent
Bleistiftspitzer Bruno|Schulbedarf|kind
Ölwechsel Otto|Motoröl|ang
Federball Fritz|Badmintonset|teen
Kaffeeklatsch|Filterkaffee|rent
Nudelholz Nora|Küchenhelfer|haus
Rostfrei Töpfe|Kochtopfset|haus
Sicherheitsnadel|Nähzubehör|haus
Bierdeckel Benno|Partybedarf|arbl
Regenschirm Rudi|Taschenschirm|ang
Malkasten Mia|Wasserfarben|kind
Kopfhörer Kurt|Bügelkopfhörer|teen
Wanderstock Werner|Gehstock|rent
Aktenkoffer Adler|Lederkoffer|ang
Schnürsenkel Schulz|Schuhzubehör|arbl
Bratapfel Bäckerei|Winterbackwaren|haus
Windmühle Mehl|Weizenmehl|haus
Schlittschuh Schmidt|Kufenschuhe|teen
Handschuh Hanna|Wollhandschuhe|rent
Tintenfass|Schreibtinte|ang
Knallbonbon|Partyknaller|kind
Sparschwein Sparkasse|Jugendkonto|teen
Vollkorn Volker|Körnerbrot|rent
Fußmatte Franz|Türmatten|haus
Schraubstock Simon|Werkbank|ang
Lolliturm|Lutscher|kind
Trockenhaube Trixi|Haartrockner|haus
Radiowecker Rolf|Uhrenradio|ang
Bratwurstbude Bruno|Imbissbedarf|arbl
Nagellack Nadine|Nagellack|haus
Zeltplatz Zander|Campingurlaub|arbl
Fahrradkorb Frieda|Gepäckträgerkorb|rent
Tischtennis Theo|Kellerplatte|teen
Bohnenkaffee Bremen|Röstkaffee|ang
Gartenzwerg Günter|Gartendeko|rent
Kaugummiblase|Bubblegum|kind
Eierbecher Emma|Frühstückszubehör|haus
Motorroller Mona|Kleinkraftrad|teen
Krawattenknoten|Herrenkrawatte|ang
Lupenreine Brillen|Lesebrille|rent
Bierzeltgarnitur|Festzeltmöbel|arbl
Pflasterstein Paul|Gehwegplatten|ang
Schaukelpferd Sandy|Holzspielzeug|kind
Wärmflasche Wilma|Bettflasche|rent
Fernrohr Ferdinand|Feldstecher|teen
Marmeladenglas Meier|Konfitüre|haus
Werkzeugkiste Willi|Handwerkerkoffer|arbl
Schlafsack Sigi|Daunenschlafsack|teen
Nagelbürste Norbert|Handpflege|ang
Kartoffelsack Kalle|Speisekartoffeln|haus
Kreidetafel Konrad|Schultafel|kind
Kompressor Konrad|Druckluft|ang
Strickjacke Stefan|Wollstrickjacke|rent
Discokugel|Partybeleuchtung|teen
Suppenwürfel Susi|Brühwürfel|haus
Blechdose Bodo|Vorratsdosen|arbl
Zaunlatte Zenker|Gartenzaun|ang
Gummistiefel Gustav|Regenstiefel|kind
Angelrute Arnold|Süßwasserrute|rent
Nachthemd Nele|Nachtwäsche|haus
Autoradio Achim|Kassettenradio|teen
`.trim().split('\n');

/* ─────────── Nachrichtenressorts ─────────── */
export const RESSORTS: readonly Ressort[] = [
  { id: 'pol', name: 'Politik & Wirtschaft', ico: 'res-pol', aff: [0.1, 0.35, 0.75, 1.30, 1.35, 0.85] },
  { id: 'spo', name: 'Sport',                ico: 'gen-sport', aff: [0.6, 1.30, 0.45, 1.20, 1.00, 1.10] },
  { id: 'sho', name: 'Show & Klatsch',       ico: 'res-sho', aff: [0.5, 1.15, 1.45, 0.80, 0.95, 1.15] },
  { id: 'sen', name: 'Sensationen',          ico: 'res-sen', aff: [0.7, 1.25, 1.05, 0.95, 1.05, 1.30] },
  { id: 'tec', name: 'Technik & Kultur',     ico: 'res-tec', aff: [0.5, 0.70, 0.55, 1.20, 0.95, 0.60] },
];

export const HEADLINES: Record<RessortId, readonly string[]> = {
  pol: [
    'Steuerreform sorgt für Streit im Parlament',
    'Kanzler kündigt Sparpaket an',
    'Börsenkurse brechen um 4 Prozent ein',
    'Bürgermeister tritt überraschend zurück',
    'Neue Zölle belasten den Export',
    'Streik im öffentlichen Dienst beginnt',
    'Rentenkasse meldet Milliardenloch',
    'Handelsabkommen nach Marathonsitzung unterzeichnet',
    'Arbeitslosenquote sinkt leicht',
    'Koalition streitet über Haushalt',
    'Regierungserklärung sorgt für Tumult',
    'Opposition fordert Neuwahlen',
    'Haushaltssperre über Nacht verhängt',
    'Minister tritt nach Affäre zurück',
    'Tarifverhandlungen ergebnislos vertagt',
    'Inflationsrate steigt auf sechs Prozent',
    'Gipfeltreffen in Genf verschoben',
    'Neues Ladenschlussgesetz beschlossen',
    'Autoindustrie meldet Kurzarbeit',
    'Werften kämpfen um Aufträge',
    'Bundesbank hebt den Leitzins an',
    'Streit um Sonntagsarbeit eskaliert',
    'Kommunen melden leere Kassen',
    'Große Koalition wackelt',
    'Zollstreit mit Übersee spitzt sich zu',
    'Rekordernte drückt die Erzeugerpreise',
    'Bergwerk vor der Schließung',
    'Rentenreform passiert den Bundesrat',
    'Mehrwertsteuer soll steigen',
    'Wahlbeteiligung auf Tiefstand',
    'Untersuchungsausschuss eingesetzt',
    'Landtag beschließt Sparhaushalt',
    'Post erhöht das Briefporto',
    'Volksbegehren erreicht Quorum',
    'Schiffbau erhält Staatshilfe',
    'Kanzler reist nach Übersee',
    'Fischereiquoten neu verteilt',
    'Handelsbilanz erstmals im Minus',
    'Bauwirtschaft meldet Auftragsloch',
    'Ministerin kündigt Schulreform an',
    'Streik legt den Nahverkehr lahm',
    'Grenzkontrollen werden gelockert',
    'Subventionen für Kohle gekürzt',
    'Parteitag endet im Eklat',
    'Neue Umweltauflagen für Chemiewerke',
    'Arbeitsamt meldet Rekordandrang',
    'Zinsen für Bausparer sinken',
    'Regierung dementiert Rücktrittsgerüchte',
    'Stadtrat kippt umstrittenes Bauprojekt',
    'Beamtenbund droht mit Protesten',
  ],
  spo: [
    'Sensationssieg im Pokalfinale',
    'Rekordtransfer erschüttert die Liga',
    'Marathonläuferin bricht Weltrekord',
    'Dopingskandal erschüttert den Radsport',
    'Trainerwechsel beim Tabellenletzten',
    'Boxweltmeister verteidigt Titel',
    'Formelrennen endet im Chaos',
    'Nationalelf verliert Testspiel',
    'Olympiabewerbung offiziell eingereicht',
    'Schiedsrichter nach Fehlpfiff suspendiert',
    'Absteiger feuert den gesamten Vorstand',
    'Torjäger fällt monatelang aus',
    'Vereinspräsident tritt zurück',
    'Neuer Stadionname sorgt für Ärger',
    'Handballer holen den Europapokal',
    'Schwimmerin knackt den Landesrekord',
    'Skispringer stürzt bei der Vierschanzentournee',
    'Boxkampf endet in der ersten Runde',
    'Ruderachter gewinnt vor Kopenhagen',
    'Tennisturnier wegen Regens verschoben',
    'Trainerlegende geht in den Ruhestand',
    'Amateurclub wirft Erstligisten aus dem Pokal',
    'Rekordablöse für Zwanzigjährigen',
    'Eishockeyfinale geht in die Verlängerung',
    'Radprofi gesteht Medikamentenmissbrauch',
    'Fanausschreitungen nach dem Derby',
    'Leichtathletin läuft Weltjahresbestzeit',
    'Zweite Liga bekommt neuen Sponsor',
    'Turnerin gewinnt zweimal Gold',
    'Verband kündigt Regeländerung an',
    'Torwart wechselt zum Erzrivalen',
    'Marathon zieht Rekordfeld an',
    'Segler kentert vor Helgoland',
    'Basketballer verpassen die Endrunde',
    'Sportplatz wird für Millionen saniert',
    'Fußballerinnen fordern eigene Liga',
    'Motorradrennen nach Unfall abgebrochen',
    'Judoka holt überraschend Bronze',
    'Ringer wird disqualifiziert',
    'Schiedsrichterin leitet erstmals ein Männerspiel',
    'Vereinsheim brennt vor dem Saisonstart',
    'Nationaltrainer nominiert vier Debütanten',
    'Turnhalle wegen Baumängeln gesperrt',
    'Gewichtheber verfehlt den Rekord knapp',
    'Sportstudio zeigt erstmals Zeitlupen',
    'Fechter gewinnt das Finale im Stechen',
    'Rodelbahn wird zur Weltmeisterschaft umgebaut',
    'Reitturnier lockt Zehntausende an',
    'Der Aufsteiger trainiert im Nebel',
    'Kanute gewinnt nach zehn Jahren wieder',
  ],
  sho: [
    'Popstar heiratet heimlich auf Ibiza',
    'Diva verlässt Filmset im Streit',
    'Schauspielerpaar trennt sich nach 12 Jahren',
    'Neuer Trend: Schulterpolster sind zurück',
    'Millionengage für Werbespot enthüllt',
    'Talkmaster wechselt den Sender',
    'Modenschau in Mailand sorgt für Aufsehen',
    'Sänger sagt Tournee kurzfristig ab',
    'Adelsspross in Nachtclub gesichtet',
    'Ex-Model eröffnet Restaurantkette',
    'Schlagerstar sagt alle Auftritte ab',
    'Filmpaar heiratet auf einer Alm',
    'Fernsehkoch eröffnet eigenes Lokal',
    'Sängerin verklagt ihre Plattenfirma',
    'Erbstreit in der Industriellenfamilie',
    'Model wechselt in die Politik',
    'Talkgast verlässt das Studio im Streit',
    'Schauspielerin adoptiert Zwillinge',
    'Popgruppe löst sich nach zehn Jahren auf',
    'Grand-Prix-Vorentscheid sorgt für Ärger',
    'Kostümprobe endet mit Nähmaschinenschaden',
    'Fernsehpreis geht an eine Unbekannte',
    'Komiker gibt Karriereende bekannt',
    'Rockstar kauft ein Schloss in der Eifel',
    'Filmfestival eröffnet mit Skandalfilm',
    'Diva verlangt goldene Wasserhähne',
    'Moderatorenpaar trennt sich vor laufender Kamera',
    'Sängerin singt Playback und gibt es zu',
    'Serienstar dreht künftig in Übersee',
    'Modenschau bricht wegen Sturm ab',
    'Neue Frisur begeistert die Boulevardpresse',
    'Fernsehballett bekommt neue Kostüme',
    'Tänzerin wird zur Jurypräsidentin',
    'Autogrammstunde endet im Gedränge',
    'Filmpremiere ohne Hauptdarsteller',
    'Sängerknabe wird über Nacht berühmt',
    'Klatschreporter gewinnt vor Gericht',
    'Villa der Schlagerkönigin steht zum Verkauf',
    'Kaffeefahrt mit Prominenten enttäuscht Gäste',
    'Fernsehgarten platzt aus allen Nähten',
    'Bühnenbildner gewinnt internationalen Preis',
    'Starfriseur eröffnet zwanzigsten Salon',
    'Nachwuchsband gewinnt Talentwettbewerb',
    'Comeback nach zwölf Jahren Pause',
    'Fotograf verkauft Bilder an die Konkurrenz',
    'Filmcrew streikt wegen der Verpflegung',
    'Schauspieler lehnt Millionengage ab',
    'Neues Duett stürmt die Hitparade',
    'Gala wird kurzfristig verlegt',
    'Kritiker verreißt die neue Show',
  ],
  sen: [
    'Ufo über dem Stadtpark gesichtet',
    'Bankräuber flieht mit Tretroller',
    'Riesenwels in Badesee gefangen',
    'Mann lebt drei Wochen im Kaufhaus',
    'Meteorit schlägt in Gartenlaube ein',
    'Papagei verrät Einbrecher',
    'Zoo-Elefant spaziert durch Innenstadt',
    'Schatzfund bei Bauarbeiten',
    'Lottogewinner meldet sich nicht',
    'Geisterhaus entpuppt sich als Marderbau',
    'Blitz schlägt in Kirchturm ein',
    'Elefant büxt aus dem Zirkus aus',
    'Goldschatz beim Baggern gefunden',
    'Riesenhagel zerstört Gewächshäuser',
    'Zwei Freunde überleben Lawine',
    'Bienenschwarm legt Innenstadt lahm',
    'Mann rettet Hund aus zugefrorenem See',
    'Erdrutsch verschüttet Landstraße',
    'Kuh wandert über die Autobahn',
    'Meteoritensplitter im Vorgarten entdeckt',
    'Hausboot treibt führerlos den Fluss hinab',
    'Nebelwand verursacht Massenkarambolage',
    'Kanaldeckel fliegen durch Druckwelle',
    'Feuerwehr rettet Katze aus dem Schornstein',
    'Alter Bunker unter Schulhof entdeckt',
    'Sturm reißt Kirchturmspitze ab',
    'Schlange im Supermarktregal gefunden',
    'Ballonfahrer landet auf einem Sportplatz',
    'Dachlawine verfehlt Passanten knapp',
    'Verschollener Wanderer nach Tagen gefunden',
    'Mysteriöse Lichter über dem Moor',
    'Riesenkürbis bricht den Landesrekord',
    'Fischschwarm färbt den Hafen silbern',
    'Uraltes Wrack im Watt aufgetaucht',
    'Zwei Zwillingspaare in einer Nacht geboren',
    'Kellerfund entpuppt sich als Kunstwerk',
    'Traktor rollt fahrerlos ins Dorf',
    'Regenguss verwandelt Marktplatz in einen See',
    'Storchennest bringt Vierlinge hervor',
    'Wildschweine plündern Bäckerei',
    'Uhrturm bleibt seit Tagen stehen',
    'Riesenpilz wächst im Stadtpark',
    'Feuerball über der Bucht gesichtet',
    'Zug hält wegen Schafherde',
    'Alter Brief nach sechzig Jahren zugestellt',
    'Mann gewinnt zweimal im selben Monat',
    'Baumhaus überlebt schweren Sturm',
    'Nashorn im Zoo bekommt Zwillinge',
    'Handwerker findet Münzen in der Wand',
    'Bahnhofsuhr geht seit Wochen falsch',
  ],
  tec: [
    'Neuer Heimcomputer mit 4 Megabyte vorgestellt',
    'Forscher entschlüsseln Erbgut der Fruchtfliege',
    'Sonde sendet erste Bilder vom Mars',
    'Museum zeigt verschollenes Gemälde',
    'Roboterarm operiert erstmals allein',
    'Ozonloch wächst schneller als erwartet',
    'Bibliothek digitalisiert Handschriften',
    'Neues Teleskop nimmt Betrieb auf',
    'Elektroauto schafft 300 Kilometer',
    'Archäologen finden römisches Bad',
    'Neuer Großrechner geht in Betrieb',
    'Forscher entschlüsseln alte Inschrift',
    'Windräder liefern erstmals Netzstrom',
    'Ausgrabung legt Römerstraße frei',
    'Impfstoff besteht die erste Prüfung',
    'Satellitenbild zeigt schmelzende Gletscher',
    'Bibliothek digitalisiert ihre Bestände',
    'Museum eröffnet neuen Ostflügel',
    'Tiefseeroboter erreicht Rekordtiefe',
    'Universität meldet Durchbruch in der Optik',
    'Denkmalschutz stoppt Abrissbagger',
    'Restaurierung des Altars abgeschlossen',
    'Erste Glasfaserleitung verlegt',
    'Astronomen entdecken neuen Kometen',
    'Klärwerk arbeitet künftig biologisch',
    'Archiv findet verschollene Partitur',
    'Solardach versorgt ganze Schule',
    'Sprachforscher retten aussterbenden Dialekt',
    'Ausstellung zeigt frühe Fernsehtechnik',
    'Neue Brücke ohne einen Nagel gebaut',
    'Labor züchtet widerstandsfähigen Weizen',
    'Handschrift aus dem Mittelalter entziffert',
    'Windkanal für Fahrräder eröffnet',
    'Sternwarte lädt zur langen Nacht',
    'Kernforscher warnen vor Zeitplan',
    'Papierlose Buchhaltung setzt sich durch',
    'Schiff fährt erstmals mit Flüssiggas',
    'Mikroskop macht Zellteilung sichtbar',
    'Denkmal wird Stein für Stein versetzt',
    'Theater probt mit neuer Lichttechnik',
    'Wetterdienst bekommt neues Radar',
    'Fundstück verändert die Stadtgeschichte',
    'Roboterarm montiert erstmals allein',
    'Meeresforscher kartieren die Rinne',
    'Alte Orgel klingt nach zwanzig Jahren wieder',
    'Kompaktkassette bekommt Konkurrenz',
    'Ingenieure bauen leiseren Zug',
    'Feldstudie zählt Insekten am Waldrand',
    'Gebärdensprache kommt ins Programm',
    'Nachbau eines Wikingerboots sticht in See',
  ],
};

/* ─────────── Eigenproduktionen ─────────── */
export const PRODUCTIONS: readonly Production[] = [
  { id: 'kultur_heute', name: 'Kultur heute',       genre: 'kultur', cost: 32_000,  days: 1, quality: 62, betty: 9, ico: 'gen-kultur', lenSlots: 1,
    desc: 'Bettys eigenes Kulturmagazin. Eine halbe Stunde, wenig Quote, viel Herz.' },
  { id: 'talk_spaet',   name: 'Spätschicht-Talk',   genre: 'talk',   cost: 45_000,  days: 1, quality: 58, betty: 2, ico: 'gen-talk', lenSlots: 2,
    desc: 'Billige Gäste, große Klappe. Eine Stunde, läuft spät gut.' },
  { id: 'quiz_gross',   name: 'Die Millionenfalle', genre: 'quiz',   cost: 120_000, days: 2, quality: 74, betty: 1, ico: 'gen-quiz', lenSlots: 2,
    desc: 'Teure Studioshow mit hohem Quotenpotenzial. Eine Stunde.' },
  { id: 'show_samstag', name: 'Mad Samstagsshow',   genre: 'show',   cost: 180_000, days: 2, quality: 80, betty: 2, ico: 'gen-show', lenSlots: 4,
    desc: 'Die große Gala über zwei Stunden. Frisst Geld, bringt Zuschauer.' },
  { id: 'doku_eigen',   name: 'Report Spezial',     genre: 'doku',   cost: 70_000,  days: 2, quality: 66, betty: 6, ico: 'gen-doku', lenSlots: 1,
    desc: 'Seriöse Eigenrecherche, eine halbe Stunde. Kritiker mögen das.' },
  { id: 'serie_soap',   name: 'Bergblick – Soap',   genre: 'serie',  cost: 95_000,  days: 2, quality: 64, betty: 0, ico: 'gen-serie', lenSlots: 1,
    desc: 'Endlos-Soap, 12 Folgen zu je 30 Minuten am Stück produziert.', episodes: 12 },
  { id: 'magazin_mo',   name: 'Montagsmagazin',     genre: 'doku',   cost: 26_000,  days: 1, quality: 54, betty: 4, ico: 'gen-doku', lenSlots: 1,
    desc: 'Was die Woche bringt, in dreißig Minuten. Billig und solide.' },
  { id: 'kochshow',     name: 'Töpfe & Tratsch',    genre: 'show',   cost: 58_000,  days: 1, quality: 61, betty: 3, ico: 'gen-show', lenSlots: 2,
    desc: 'Gekocht wird nebenbei, geredet wird viel. Hausfrauen lieben es.' },
  { id: 'krimi_reihe',  name: 'Tatort Hafenstraße', genre: 'krimi',  cost: 210_000, days: 3, quality: 79, betty: 3, ico: 'gen-krimi', lenSlots: 3,
    desc: 'Eigener Fernsehkrimi, anderthalb Stunden. Teuer, aber sehr stark.' },
  { id: 'kinder_club',  name: 'Der Knopfclub',      genre: 'trick',  cost: 40_000,  days: 1, quality: 59, betty: 2, ico: 'gen-trick', lenSlots: 1,
    desc: 'Kinderstunde mit Puppen und Bastelecke. Läuft nur früh.' },
  { id: 'sport_studio', name: 'Das Sportstudio',    genre: 'sport',  cost: 88_000,  days: 1, quality: 68, betty: 1, ico: 'gen-sport', lenSlots: 2,
    desc: 'Ergebnisse, Torwand, Studiogäste. Eine Stunde, sichere Quote.' },
  { id: 'musik_parade', name: 'Hitparade live',     genre: 'musik',  cost: 135_000, days: 2, quality: 71, betty: 4, ico: 'gen-musik', lenSlots: 3,
    desc: 'Playback, Blumen und Konfetti — anderthalb Stunden Samstagabend.' },
  { id: 'oper_abend',   name: 'Opernabend',         genre: 'kultur', cost: 165_000, days: 2, quality: 52, betty: 16, ico: 'gen-kultur', lenSlots: 4,
    desc: 'Zwei Stunden Hochkultur. Kaum Zuschauer — aber Betty schmilzt dahin.' },
  { id: 'serie_klinik', name: 'Notaufnahme Nord',   genre: 'serie',  cost: 175_000, days: 3, quality: 73, betty: 2, ico: 'gen-serie', lenSlots: 2,
    desc: 'Eigene Krankenhausserie, 10 Folgen zu je einer Stunde.', episodes: 10 },
];

/* ─────────── Starmoderatoren (Geldsenke fürs Spätspiel) ─────────── */
export const STARS: readonly Star[] = [
  { id: 'kuno',  name: 'Kuno Kelch',        ico: 'mod-kuno', fee: 1_200_000, salary: 65_000,  boost: 0.14,
    genres: ['show', 'quiz', 'talk'],
    desc: 'Der Mann mit dem Lachen. Hebt Shows, Quiz und Talk.' },
  { id: 'rita',  name: 'Rita Sonnenschein', ico: 'mod-rita', fee: 2_200_000, salary: 110_000, boost: 0.20,
    genres: ['show', 'quiz', 'talk', 'musik'],
    desc: 'Publikumsliebling. Teuer, aber jeder schaltet ein.' },
  { id: 'harms', name: 'Dr. Harms',         ico: 'mod-harms', fee: 1_600_000, salary: 80_000,  boost: 0.26,
    genres: ['doku', 'kultur', 'talk'],
    desc: 'Feuilleton-Legende. Kultur mit ihm wirkt doppelt auf Betty.' },
  { id: 'bodo',  name: 'Bodo Brenner',      ico: 'mod-bodo', fee: 900_000,   salary: 48_000,  boost: 0.12,
    genres: ['sport', 'action'],
    desc: 'Schreit sich durch jede Übertragung. Günstig, laut, wirksam.' },
  { id: 'vera',  name: 'Vera Vogt',         ico: 'mod-vera', fee: 1_400_000, salary: 72_000,  boost: 0.17,
    genres: ['krimi', 'drama', 'doku'],
    desc: 'Die ernste Stimme des Hauses. Hebt alles, was Haltung hat.' },
  { id: 'pepe',  name: 'Pepe Prantl',       ico: 'mod-pepe', fee: 1_050_000, salary: 55_000,  boost: 0.15,
    genres: ['komoed', 'show', 'musik'],
    desc: 'Kalauer am Fließband. Das Publikum lacht trotzdem jedes Mal.' },
  { id: 'gloria', name: 'Gloria Grahn',     ico: 'mod-gloria', fee: 2_600_000, salary: 130_000, boost: 0.22,
    genres: ['show', 'liebe', 'serie', 'talk'],
    desc: 'Der ganz große Name. Ruinös teuer und jeden Pfennig wert.' },
];

/* ─────────── Geschenke für Betty ─────────── */
export const GIFTS: readonly Gift[] = [
  { id: 'blume',  name: 'Rosenstrauß',       cost: 2_500,     love: 2,  ico: 'gsh-blume', min: 0 },
  { id: 'pralin', name: 'Pralinenschachtel', cost: 6_000,     love: 3,  ico: 'gsh-pralin', min: 0 },
  { id: 'parfum', name: 'Flakon «Diva»',     cost: 22_000,    love: 6,  ico: 'gsh-parfum', min: 15 },
  { id: 'kette',  name: 'Goldkette',         cost: 75_000,    love: 11, ico: 'gsh-kette', min: 30 },
  { id: 'pelz',   name: 'Pelzmantel',        cost: 210_000,   love: 18, ico: 'gsh-pelz', min: 45 },
  { id: 'sport',  name: 'Sportwagen',        cost: 600_000,   love: 26, ico: 'gsh-auto', min: 60 },
  { id: 'ring',   name: 'Diamantring',       cost: 1_400_000, love: 40, ico: 'gsh-ring', min: 78 },
  { id: 'karte',  name: 'Handgeschriebene Karte', cost: 400,   love: 1,  ico: 'gsh-karte', min: 0 },
  { id: 'buch',   name: 'Gedichtband, signiert',  cost: 14_000, love: 5, ico: 'gsh-buch', min: 8 },
  { id: 'platte', name: 'Schallplatte von 1962',  cost: 38_000, love: 8, ico: 'gsh-platte', min: 22 },
  { id: 'uhr',    name: 'Armbanduhr in Gold',     cost: 130_000, love: 14, ico: 'gsh-uhr', min: 38 },
  { id: 'reise',  name: 'Reise nach Venedig',     cost: 340_000, love: 22, ico: 'gsh-reise', min: 52 },
];

/* ─────────── Etagen, Index 0 = unten ─────────── */
export const FLOORS: readonly Floor[] = [
  { id: 'foyer',   name: 'Foyer & Kiosk',     ico: 'flr-foyer', sub: 'Geschenke für Betty' },
  { id: 'technik', name: 'Technik',           ico: 'flr-technik', sub: 'Sendemasten & Satellit' },
  { id: 'rival2',  name: 'Büro Kanal 2',      ico: 'flr-rival', sub: 'Konkurrenz' },
  { id: 'rival1',  name: 'Büro Kanal 1',      ico: 'flr-rival', sub: 'Konkurrenz' },
  { id: 'film',    name: 'Filmagentur',       ico: 'flr-film', sub: 'Filme & Serien kaufen' },
  { id: 'werbe',   name: 'Werbeagentur',      ico: 'flr-werbe', sub: 'Werbeverträge' },
  { id: 'office',  name: 'Dein Büro',         ico: 'flr-office', sub: 'Sendeplan & Bilanz' },
  { id: 'news',    name: 'Nachrichtenstudio', ico: 'flr-news', sub: 'Abos & Sendung' },
  { id: 'archiv',  name: 'Archiv',            ico: 'flr-archiv', sub: 'Programmordner' },
  { id: 'studio',  name: 'Produktionsstudio', ico: 'flr-studio', sub: 'Eigenproduktionen' },
  { id: 'bank',    name: 'Bank',              ico: 'flr-bank', sub: 'Kredit & Zinsen' },
  { id: 'chef',    name: 'Chefbüro',          ico: 'flr-chef', sub: 'Herr Raffer' },
  { id: 'betty',   name: 'Bettys Büro',       ico: 'flr-betty', sub: 'Betty Botterbloom' },
];

/* ─────────── Schwierigkeitsgrade ─────────── */
export const DIFFS: Record<DifficultyId, Difficulty> = {
  leicht: { name: 'Leicht', money: 1_200_000, aiSkill: 0.62, winImage: 55, fireImage: 8,  ico: 'dif-leicht',
            desc: 'Viel Startkapital, gutmütige Konkurrenz.' },
  normal: { name: 'Normal', money: 800_000,   aiSkill: 0.80, winImage: 65, fireImage: 12, ico: 'dif-normal',
            desc: 'So war es 1991 gedacht.' },
  schwer: { name: 'Schwer', money: 520_000,   aiSkill: 0.95, winImage: 70, fireImage: 13, ico: 'dif-schwer',
            desc: 'Zwei Haie im selben Hochhaus.' },
};
