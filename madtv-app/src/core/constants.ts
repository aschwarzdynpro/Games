/** Spielweite Konstanten — hier stellt man an der Simulation, nicht im Code. */

/** Haushalte im Sendegebiet. */
export const POP = 42_000_000;

/** Sendeblöcke pro Abend. */
export const BLOCKS = 7;

/** Anfangsstunde jedes Blocks. */
export const BLOCK_H = [18, 19, 20, 21, 22, 23, 0] as const;

/** Arbeitsbeginn 17:00 in Minuten seit Mitternacht. */
export const DAY_START = 17 * 60;

/** Feierabend 01:00, als Fortsetzung des Vortages gerechnet. */
export const DAY_END = 25 * 60;

export const WEEKDAYS = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag',
] as const;

/** Minuten Werbung am Ende jedes Blocks. */
export const AD_MINUTES = 5;

/** Minuten Nachrichten am Anfang jedes Blocks. */
export const NEWS_MINUTES = 4;

/** Millisekunden je Spielminute, je Geschwindigkeitsstufe. */
export const SPEEDS: Record<number, number> = { 1: 620, 2: 330, 3: 130 };

export const RIVAL_NAMES = ['Brain TV', 'Kanal Kaputt'] as const;

/** Tageskosten je Abostufe eines Nachrichtenressorts. */
export const NEWS_COST = [0, 4_000, 11_000, 26_000] as const;

/** Aktualitätsgüte je Abostufe. */
export const NEWS_QUAL = [0, 0.45, 0.72, 1.0] as const;

/**
 * "Fernseher aus" tritt als vierter Wettbewerber an. Ohne diesen Term würden
 * sich die drei Sender immer die gesamte Bevölkerung teilen, egal wie schlecht
 * das Programm ist.
 */
export const ATTR_OFF = 1.15;

/** Höchstzahl gleichzeitiger Werbeverträge im Koffer. */
export const MAX_CONTRACTS = 4;

/** Kreditrahmen der Bank. */
export const MAX_CREDIT = 2_000_000;

/** Ab hier stellt die Bank den Kredit fällig. */
export const BANKRUPT_AT = -1_000_000;

/** Preis des Exklusivpakets in der Filmagentur. */
export const PACKAGE_COST = 3_200_000;

/** Einmalige Anzahlung fürs Produktionsstudio. */
export const STUDIO_RENT = 250_000;

export const COST_TRANSMITTER_DAY = 18_000;
export const COST_SATELLITE_DAY = 55_000;
export const COST_STUDIO_DAY = 40_000;
export const PRICE_TRANSMITTER = 380_000;
export const PRICE_SATELLITE = 900_000;
export const MAX_TRANSMITTERS = 4;

/** Tageszins auf den Kredit. */
export const INTEREST_DAY = 0.006;
