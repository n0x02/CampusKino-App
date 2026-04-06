// ── Produkte ────────────────────────────────────────────────────────────────
export type Kategorie = 'Snack' | 'Getraenk' | 'Ticket' | 'Sonstiges';

export interface Produkt {
  id: number;
  sku: string;
  name: string;
  kategorie: Kategorie;
  ekp: number;
  vkp: number;
  bestand: number;
  aktiv: boolean;
}

// ── Veranstaltungen ─────────────────────────────────────────────────────────
export interface Veranstaltung {
  id: number;
  datum: string;          // ISO date string
  bezeichnung: string;
  film1?: string;
  film2?: string;
  hoersaal?: string;
  abgeschlossen: boolean;
  erstellt: string;
}

// ── Einkauf ─────────────────────────────────────────────────────────────────
export interface EinkaufPosition {
  id: number;
  veranstaltung_id: number | null;
  produkt_id: number;
  produkt_name?: string;
  produkt_sku?: string;
  menge: number;
  ekp_zum_zeitpunkt: number;
  gesamtkosten: number;
  notiz?: string;
  erstellt: string;
}

export interface EinkaufInput {
  veranstaltung_id?: number;
  produkt_id: number;
  menge: number;
  ekp_zum_zeitpunkt: number;
  notiz?: string;
}

// ── Verkauf ─────────────────────────────────────────────────────────────────
export type Zahlungsart = 'bar' | 'sumup' | 'freiticket';

export interface VerkaufPosition {
  id: number;
  veranstaltung_id: number | null;
  produkt_id: number;
  produkt_name?: string;
  produkt_sku?: string;
  menge: number;
  vkp_zum_zeitpunkt: number;
  gesamteinnahme: number;
  zahlungsart: Zahlungsart;
  notiz?: string;
  erstellt: string;
}

export interface VerkaufInput {
  veranstaltung_id?: number;
  produkt_id: number;
  menge: number;
  vkp_zum_zeitpunkt: number;
  zahlungsart: Zahlungsart;
  notiz?: string;
}

// ── Kasse ───────────────────────────────────────────────────────────────────
export type KassenTyp = 'anfang' | 'ende' | 'einzahlung' | 'entnahme';

export interface KassenEintrag {
  id: number;
  veranstaltung_id: number | null;
  zeitpunkt: string;
  typ: KassenTyp;
  betrag: number;
  muenzen_detail?: MuenzenDetail;
  notiz?: string;
}

export interface MuenzenDetail {
  '0.01'?: number; '0.02'?: number; '0.05'?: number;
  '0.10'?: number; '0.20'?: number; '0.50'?: number;
  '1.00'?: number; '2.00'?: number; '5.00'?: number;
  '10.00'?: number; '20.00'?: number; '50.00'?: number;
  '100.00'?: number;
}

// ── Bilanz ──────────────────────────────────────────────────────────────────
export interface Bilanz {
  // Einnahmen
  einnahmen_bar: number;
  einnahmen_sumup: number;
  einnahmen_gesamt: number;

  // Ausgaben / Kosten
  einkauf_gesamt: number;
  ueberschuss: number;

  // Tickets
  ticket_einnahmen: number;
  ticket_unifilm_anteil: number;    // 75%
  ticket_campuskino_anteil: number; // 25%

  // Snack & Getränke Überschuss
  snack_ueberschuss: number;
  snack_kinoteam_anteil: number;   // 80%
  snack_wingla_anteil: number;     // 20%

  // Kassenstand
  kassenanfang: number;
  kassenende_soll: number;
  kassenende_ist: number;
  kassendifferenz: number;

  // Warenbestand
  bestand_ekp: number;
  bestand_vkp: number;

  // Besucher
  besucher_total: number;
  freikarten_total: number;
}

// ── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
