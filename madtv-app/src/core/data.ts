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
Blaulicht und Blei|action|1991|3
Die Brücke von Karachi|action|1981|2
Vier Hochzeiten und ein Umzug|komoed|1990|4
Die nackte Kanonenkugel|komoed|1988|5
Papa ist ein Außerirdischer|komoed|1986|3
Chaos im Kaufhaus|komoed|1982|2
Der Schwiegersohn von nebenan|komoed|1984|3
Zwei Kumpel und ein Kühlschrank|komoed|1979|2
Urlaub mit Hindernissen|komoed|1987|3
Die Katze im Sack|komoed|1975|2
Herr Meier räumt auf|komoed|1991|4
Onkel Ottos Erbschaft|komoed|1980|2
Der Regen von gestern|drama|1978|4
Herbstlicht|drama|1984|5
Briefe an Anna|drama|1989|4
Die letzte Fabrik|drama|1986|4
Schatten über Neustadt|drama|1982|3
Weit weg von hier|drama|1990|3
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
Kommissar Kluge ermittelt|krimi|1979|3
Der Fall Hoffmann|krimi|1987|4
Spurlos im Hafen|krimi|1982|3
Nachtschicht Mord|krimi|1990|4
Das Alibi|krimi|1976|3
Der Zeuge aus Zelle 7|krimi|1988|4
Die Spur führt nach Genua|krimi|1991|3
Sommer in Sorrent|liebe|1981|3
Zwei Herzen, ein Zug|liebe|1986|3
Die Braut trägt Blau|liebe|1989|4
Rendezvous um Mitternacht|liebe|1977|2
Verliebt in Lissabon|liebe|1990|4
Der Kuss im Regen|liebe|1984|3
Wiedersehen in Wien|liebe|1991|3
Der Reiter ohne Namen|western|1972|4
Staub und Blei|western|1968|3
Goldrausch am Red River|western|1975|3
Die letzte Postkutsche|western|1980|2
Duell in Silver Creek|western|1971|3
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
Woodstack Revival|musik|1991|3
Die große Samstagsgala|show|1990|3
Wetten, das war's?|show|1989|4
Stars in der Manege|show|1987|3
Die Hitparade der Herzen|show|1986|2
Der Preis ist heiß gelaufen|quiz|1988|3
Wer weiß denn sowas noch|quiz|1991|4
Millionenfrage|quiz|1990|4
Mitternachtstalk|talk|1989|3
Der heiße Stuhl 2|talk|1991|3
Klartext um elf|talk|1990|2
Museen der Welt|kultur|1988|4
Die Oper von Mailand|kultur|1986|4
Meister der Renaissance|kultur|1990|5
Literatur am Kamin|kultur|1991|3
Ballett aus Sankt Petersburg|kultur|1989|4
Architektur der Moderne|kultur|1987|3
Straßenwölfe|action|1980|3
Der Kurier von Neapel|action|1990|4
Panzerfaust|action|1977|2
Countdown in Kapstadt|action|1989|3
Die Rache des Kickboxers|action|1987|2
Turbo Trouble|komoed|1985|3
Der Hundefänger von Buxtehude|komoed|1976|2
Drei Damen und ein Dackel|komoed|1988|3
Mein Chef, das Chamäleon|komoed|1991|4
Ferien auf dem Bauernhof|komoed|1983|2
Die Bank am Ende der Straße|komoed|1989|3
Verlorene Jahre|drama|1975|4
Der Bergdoktor von Sankt Anna|drama|1981|3
Salz auf unserer Haut|drama|1987|4
Kinder des Reviers|drama|1979|3
Wenn der Nebel steigt|drama|1990|4
Die Erben von Gut Falkenstein|drama|1985|3
Der Wechselbalg|horror|1988|3
Krallen im Dachstuhl|horror|1980|2
Die Klinik der Ratten|horror|1991|3
Blutorange|horror|1984|2
Sirius Protokoll|scifi|1983|4
Die Kolonie|scifi|1989|3
Roboter weinen nicht|scifi|1991|5
Schwarzes Loch|scifi|1977|3
Botschaft aus dem Nichts|scifi|1986|2
Der Mörder trug Handschuhe|krimi|1974|3
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
Der Nil von der Quelle bis zum Meer|doku|1986|3
Flip und Flap im Weltall|trick|1981|2
Die Schlümpfe von Schlumpfhausen|trick|1985|3
Kater Karlos große Reise|trick|1989|4
Ritter Rüdiger|trick|1991|3
Das Zauberkarussell|trick|1977|2
Nachts im Wellnesstempel|erotik|1988|2
Die Sekretärin|erotik|1985|1
Sommer, Sonne, Sünde|erotik|1990|2
Marathon der Träume|sport|1984|3
Die Wilden Kerle vom Bolzplatz|sport|1991|3
Auf dem Eis|sport|1987|2
Tour der Leiden|sport|1989|4
Bühne frei für Bernie Brass|musik|1982|3
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
