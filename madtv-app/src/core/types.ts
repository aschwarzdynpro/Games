/**
 * Alle Datenformen des Spielkerns an einem Ort.
 *
 * Der Kern kennt kein DOM. Was der Spieler zu sehen bekommt, verlässt ihn
 * ausschließlich als GameEvent — die Oberfläche entscheidet, ob daraus eine
 * Einblendung, ein Dialog oder ein Ton wird.
 */

export type GenreId =
  | 'action' | 'komoed' | 'drama' | 'horror' | 'scifi' | 'krimi' | 'liebe'
  | 'western' | 'doku' | 'trick' | 'erotik' | 'sport' | 'musik' | 'show'
  | 'quiz' | 'talk' | 'kultur' | 'serie';

export type GroupId = 'kind' | 'teen' | 'haus' | 'ang' | 'rent' | 'arbl';

export type RessortId = 'pol' | 'spo' | 'sho' | 'sen' | 'tec';

export type DifficultyId = 'leicht' | 'normal' | 'schwer';

export type RoomId =
  | 'foyer' | 'technik' | 'rival2' | 'rival1' | 'film' | 'werbe' | 'office'
  | 'news' | 'archiv' | 'studio' | 'bank' | 'chef' | 'betty';

export type SfxName = 'onair' | 'cash' | 'miss' | 'buy' | 'bad' | 'award' | 'love';

export interface Group {
  readonly id: GroupId;
  readonly name: string;
  readonly ico: string;
  /** Anteil an der Gesamtbevölkerung. */
  readonly share: number;
  /** Fernsehneigung je Sendeblock (18, 19, 20, 21, 22, 23, 0 Uhr). */
  readonly act: readonly number[];
}

export interface Genre {
  readonly name: string;
  readonly ico: string;
  /** Attraktivität je Zielgruppe, Reihenfolge wie GROUPS. */
  readonly aff: readonly number[];
  /** Neigung zu guter Kritikerwertung. */
  readonly krit: number;
  /** Basis-Altersfreigabe. */
  readonly fsk: number;
  /** Zählt als Kultursendung — für Betty und die Sammy-Verleihung. */
  readonly kult: boolean;
}

export interface Ressort {
  readonly id: RessortId;
  readonly name: string;
  readonly ico: string;
  readonly aff: readonly number[];
}

/** Eine Sendelizenz: gekaufter Film, gekaufte Serie oder Eigenproduktion. */
export interface Licence {
  uid: number;
  title: string;
  genre: GenreId;
  year: number;
  tier: number;
  fsk: number;
  price: number;
  /** Zuschauerwert 0–100. */
  qual: number;
  /** Kritikerwertung 0–100. */
  critic: number;
  /** Kinokasse 0–100. */
  box: number;
  /** Aktualität 0–1; sinkt beim Senden, erholt sich über Tage. */
  fresh: number;
  aired: number;
  lastDay: number;
  /** Feld der letzten Ausstrahlung — Serien binden ihr Publikum daran. */
  lastBlock: number | null;
  /**
   * Sendelänge in Halbstundenfeldern (1 = 30 Min, 6 = 3 Std).
   * Bei Serien ist das die Länge einer Folge.
   */
  lenSlots: number;
  isSerie: boolean;
  /** Folgen der gekauften Staffel. */
  eps: number;
  ep: number;
  produced: boolean;
  /** Zusatzwirkung auf Betty, nur bei Eigenproduktionen. */
  bettyBonus?: number;
}

export interface Contract {
  id: number;
  brand: string;
  product: string;
  /** Gesetzt, wenn die Mindestquote nur für diese Zielgruppe gilt. */
  group: GroupId | null;
  /** Index der Zielgruppe in GROUPS. */
  gi: number;
  minAud: number;
  spots: number;
  done: number;
  days: number;
  deadline: number;
  perSpot: number;
  penalty: number;
  tier: number;
  added: number;
}

export interface NewsItem {
  id: number;
  res: RessortId;
  text: string;
  day: number;
  /** Nachrichtenwert 0–1,2. */
  weight: number;
}

export interface Production {
  readonly id: string;
  readonly name: string;
  readonly genre: GenreId;
  readonly cost: number;
  readonly days: number;
  readonly quality: number;
  readonly betty: number;
  readonly ico: string;
  readonly desc: string;
  readonly episodes?: number;
  /** Sendelänge in Halbstundenfeldern. */
  readonly lenSlots: number;
}

export interface Star {
  readonly id: string;
  readonly name: string;
  readonly ico: string;
  readonly fee: number;
  readonly salary: number;
  readonly boost: number;
  readonly genres: readonly GenreId[];
  readonly desc: string;
}

export interface Gift {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly love: number;
  readonly ico: string;
  /** Erst ab dieser Zuneigung sinnvoll. */
  readonly min: number;
}

export interface Difficulty {
  readonly name: string;
  readonly money: number;
  readonly aiSkill: number;
  readonly winImage: number;
  readonly fireImage: number;
  readonly ico: string;
  readonly desc: string;
}

export interface Floor {
  readonly id: RoomId;
  readonly name: string;
  readonly ico: string;
  readonly sub: string;
}

/** Ergebnis eines gesendeten Blocks. */
export interface BlockResult {
  total: number;
  /** Zuschauer je Zielgruppe, Reihenfolge wie GROUPS. */
  groups: number[];
}

/**
 * Ein Halbstundenfeld des Sendeplans.
 *
 * Eine Sendung über mehrere Felder trägt sich in jedes davon ein; nur das
 * erste hat `start = true` und kennt die Länge. So bleibt die Quotenrechnung
 * feldweise, ohne dass sie die Sendung zerlegen muss.
 */
export interface Slot {
  prog: Licence | null;
  /** Erstes Feld dieser Sendung? */
  start: boolean;
  /** Länge der Sendung in Feldern; nur im Startfeld gesetzt. */
  len: number;
  /** Belegter Werbeplatz — verweist auf einen Vertrag im Koffer. */
  ad: { id: number; brand: string } | null;
  /** Statt Werbung ein Trailer für eine spätere Sendung. */
  trailer: Licence | null;
  aired: boolean;
  res: BlockResult | null;
}

export interface Channel {
  name: string;
  isAI: boolean;
  money: number;
  credit: number;
  licences: Licence[];
  contracts: Contract[];
  /** Sendeplan je Tag; Schlüssel ist die Tagesnummer. */
  sched: Record<number, Slot[]>;
  newsSub: Record<RessortId, number>;
  /** Höchste am Tag eingestellte Abostufe — Grundlage der Abrechnung. */
  newsSubMax: Record<RessortId, number>;
  newsShow: NewsItem[];
  star: Star | null;
  transmitters: number;
  satellite: boolean;
  studio: boolean;
  /** Marktanteil in Prozent; die drei Sender ergeben zusammen 100. */
  image: number;
  /** Bettys Zuneigung 0–100, gedeckelt durch image. */
  love: number;
  aiSkill: number;
  lastAud: number[];
  todayAud: number[];
  audHist: number[];
  awards: number;
  culturePoints: number;
  newsPoints: number;
  primePoints: number;
  lowImageDays: number;
  /** Kulturwirkung des laufenden Tages auf Betty. */
  cultureToday: number;
  /** Was Betty am laufenden Tag missfallen hat — Reißerisches zur besten Zeit. */
  trashToday: number;
  /** Marktanteil des Vortags, für den Trend in den Figurenreden. */
  lastImage: number;
}

/** Ein Einkauf der Konkurrenz, den der Spieler mitbekommen soll. */
export interface Snipe {
  day: number;
  channel: string;
  title: string;
  genre: GenreId;
  price: number;
  tier: number;
}

export interface Auction extends Licence {
  bid: number;
  leader: string | null;
  rounds: number;
  closed: boolean;
  /** Richtpreis, an dem sich die Gebotsgrenzen der Konkurrenz orientieren. */
  guide: number;
}

export interface LogEntry {
  day: number;
  block: number;
  aud: number;
  share: number;
  title: string;
}

export interface Stats {
  revenue: number;
  costs: number;
  filmsBought: number;
  contractsDone: number;
  contractsFailed: number;
}

export interface Options {
  timePressure: boolean;
  sound: boolean;
  /** Gezeichneter Flur über den Panels. */
  world: boolean;
}

export interface ProductionRun {
  def: Production;
  left: number;
  no: number;
}

export interface EndState {
  win: boolean;
  title: string;
  ico: string;
  text: string;
}

/* ─────────── Meldungen des Kerns an die Oberfläche ─────────── */

export type ToastLevel = 'good' | 'bad' | 'warn' | 'info';

export interface DialogButton {
  t: string;
  cls?: string;
}

export type GameEvent =
  | { kind: 'toast'; level: ToastLevel; title: string; text: string }
  | { kind: 'dialog'; ico: string; who: string; title: string; html: string; buttons?: DialogButton[] }
  | { kind: 'sfx'; name: SfxName }
  | { kind: 'blockAired'; day: number; block: number };

/* ─────────── Gesamtzustand ─────────── */

export interface Game {
  diff: DifficultyId;
  D: Difficulty;
  opt: Options;

  day: number;
  weekday: number;
  week: number;
  /** Minuten seit Mitternacht; der Arbeitstag läuft von 17:00 bis 01:00 (=1500). */
  time: number;

  rng: import('./rng').Rng;
  seed: number;

  catalog: Licence[];
  market: Licence[];
  adMarket: Contract[];
  newsPool: Record<RessortId, NewsItem[]>;
  auction: Auction | null;
  auctionWarned: boolean;
  /** Genre-Konjunktur: Multiplikator je Genre, driftet täglich. */
  trend: Record<GenreId, number>;

  player: Channel;
  ch: Channel[];

  production: ProductionRun | null;
  productionNo: number;
  packageTaken: boolean;
  gifts: Gift[];

  terrorSign: 'self' | 'rival1' | 'rival2';
  terrorDay: number;
  pendingTerror: boolean;
  /** Gerichtsvollzieher steht am nächsten Tagesabschluss vor der Tür. */
  bailiff: boolean;

  /** Was die Konkurrenz zuletzt sichtbar weggekauft hat. */
  snipes: Snipe[];
  /** Zuletzt gesagter Satz je Figur — verhindert Wiederholungen. */
  saidLast: Record<string, string>;

  log: LogEntry[];
  stats: Stats;

  over: boolean;
  end: EndState | null;

  /** Wird von der Oberfläche geleert. */
  events: GameEvent[];

  uid: number;
}
