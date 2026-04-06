import pool from '../db/pool.js';
import type {
  Produkt, EinkaufInput, VerkaufInput, KassenEintrag,
  Bilanz, EinkaufPosition, VerkaufPosition
} from '../types/index.js';

// ────────────────────────────────────────────────────────────
// PRODUKTE
// ────────────────────────────────────────────────────────────
export async function getAllProdukte(): Promise<Produkt[]> {
  const res = await pool.query(
    'SELECT * FROM produkte WHERE aktiv = true ORDER BY kategorie, sku'
  );
  return res.rows;
}

export async function updateProdukt(
  id: number,
  fields: Partial<Pick<Produkt, 'name' | 'ekp' | 'vkp' | 'bestand'>>
): Promise<Produkt> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = $${i++}`);
    vals.push(v);
  }
  vals.push(id);
  const res = await pool.query(
    `UPDATE produkte SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return res.rows[0];
}

// ────────────────────────────────────────────────────────────
// VERANSTALTUNGEN
// ────────────────────────────────────────────────────────────
export async function getAllVeranstaltungen() {
  const res = await pool.query(
    'SELECT * FROM veranstaltungen ORDER BY datum DESC'
  );
  return res.rows;
}

export async function createVeranstaltung(input: {
  datum: string; bezeichnung: string;
  film1?: string; film2?: string; hoersaal?: string;
}) {
  const res = await pool.query(
    `INSERT INTO veranstaltungen (datum, bezeichnung, film1, film2, hoersaal)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [input.datum, input.bezeichnung, input.film1, input.film2, input.hoersaal]
  );
  return res.rows[0];
}

// ────────────────────────────────────────────────────────────
// EINKAUF  – Business Rules:
//   • Bestand wird erhöht
//   • EKP wird zum Zeitpunkt des Einkaufs gespeichert
// ────────────────────────────────────────────────────────────
export async function createEinkauf(input: EinkaufInput): Promise<EinkaufPosition> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Position anlegen
    const res = await client.query(
      `INSERT INTO einkauf_positionen
         (veranstaltung_id, produkt_id, menge, ekp_zum_zeitpunkt, notiz)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [input.veranstaltung_id ?? null, input.produkt_id,
       input.menge, input.ekp_zum_zeitpunkt, input.notiz ?? null]
    );

    // 2. Bestand erhöhen
    await client.query(
      'UPDATE produkte SET bestand = bestand + $1 WHERE id = $2',
      [input.menge, input.produkt_id]
    );

    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getEinkaeufe(veranstaltungId?: number): Promise<EinkaufPosition[]> {
  const where = veranstaltungId
    ? 'WHERE e.veranstaltung_id = $1'
    : '';
  const params = veranstaltungId ? [veranstaltungId] : [];
  const res = await pool.query(
    `SELECT e.*, p.name AS produkt_name, p.sku AS produkt_sku
     FROM einkauf_positionen e
     JOIN produkte p ON p.id = e.produkt_id
     ${where}
     ORDER BY e.erstellt DESC`,
    params
  );
  return res.rows;
}

export async function deleteEinkauf(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bestand zurückdrehen
    const pos = await client.query(
      'SELECT produkt_id, menge FROM einkauf_positionen WHERE id = $1', [id]
    );
    if (pos.rows.length === 0) throw new Error('Einkauf nicht gefunden');

    await client.query(
      'UPDATE produkte SET bestand = GREATEST(bestand - $1, 0) WHERE id = $2',
      [pos.rows[0].menge, pos.rows[0].produkt_id]
    );
    await client.query('DELETE FROM einkauf_positionen WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ────────────────────────────────────────────────────────────
// VERKAUF  – Business Rules:
//   • Bestand wird reduziert (außer bei Freitickets ohne Ware)
//   • VKP zum Zeitpunkt gespeichert
//   • Tickets laufen über T_001/T_002/T_003
// ────────────────────────────────────────────────────────────
export async function createVerkauf(input: VerkaufInput): Promise<VerkaufPosition> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bestand prüfen (Tickets haben keinen physischen Bestand)
    const prod = await client.query('SELECT * FROM produkte WHERE id = $1', [input.produkt_id]);
    if (prod.rows.length === 0) throw new Error('Produkt nicht gefunden');
    const p: Produkt = prod.rows[0];

    const hatBestand = p.kategorie !== 'Ticket';
    if (hatBestand && p.bestand < input.menge) {
      throw new Error(`Nicht genug Bestand für "${p.name}" (Bestand: ${p.bestand}, gewünscht: ${input.menge})`);
    }

    // 1. Verkauf anlegen
    const res = await client.query(
      `INSERT INTO verkauf_positionen
         (veranstaltung_id, produkt_id, menge, vkp_zum_zeitpunkt, zahlungsart, notiz)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [input.veranstaltung_id ?? null, input.produkt_id,
       input.menge, input.vkp_zum_zeitpunkt, input.zahlungsart, input.notiz ?? null]
    );

    // 2. Bestand senken (nur physische Waren)
    if (hatBestand) {
      await client.query(
        'UPDATE produkte SET bestand = bestand - $1 WHERE id = $2',
        [input.menge, input.produkt_id]
      );
    }

    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getVerkaeufe(veranstaltungId?: number): Promise<VerkaufPosition[]> {
  const where = veranstaltungId ? 'WHERE v.veranstaltung_id = $1' : '';
  const params = veranstaltungId ? [veranstaltungId] : [];
  const res = await pool.query(
    `SELECT v.*, p.name AS produkt_name, p.sku AS produkt_sku, p.kategorie
     FROM verkauf_positionen v
     JOIN produkte p ON p.id = v.produkt_id
     ${where}
     ORDER BY v.erstellt DESC`,
    params
  );
  return res.rows;
}

export async function deleteVerkauf(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pos = await client.query(
      `SELECT v.*, p.kategorie FROM verkauf_positionen v
       JOIN produkte p ON p.id = v.produkt_id
       WHERE v.id = $1`, [id]
    );
    if (pos.rows.length === 0) throw new Error('Verkauf nicht gefunden');
    const row = pos.rows[0];

    // Bestand zurückgeben (nur physische Waren)
    if (row.kategorie !== 'Ticket') {
      await client.query(
        'UPDATE produkte SET bestand = bestand + $1 WHERE id = $2',
        [row.menge, row.produkt_id]
      );
    }
    await client.query('DELETE FROM verkauf_positionen WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ────────────────────────────────────────────────────────────
// KASSE
// ────────────────────────────────────────────────────────────
export async function getKassenEintraege(veranstaltungId?: number): Promise<KassenEintrag[]> {
  const where = veranstaltungId ? 'WHERE veranstaltung_id = $1' : '';
  const params = veranstaltungId ? [veranstaltungId] : [];
  const res = await pool.query(
    `SELECT * FROM kassenstand ${where} ORDER BY zeitpunkt DESC`, params
  );
  return res.rows;
}

export async function createKassenEintrag(input: {
  veranstaltung_id?: number; typ: string;
  betrag: number; muenzen_detail?: object; notiz?: string;
}): Promise<KassenEintrag> {
  const res = await pool.query(
    `INSERT INTO kassenstand (veranstaltung_id, typ, betrag, muenzen_detail, notiz)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [input.veranstaltung_id ?? null, input.typ, input.betrag,
     input.muenzen_detail ? JSON.stringify(input.muenzen_detail) : null,
     input.notiz ?? null]
  );
  return res.rows[0];
}

// ────────────────────────────────────────────────────────────
// BILANZ  – Kernlogik
// ────────────────────────────────────────────────────────────
const UNIFILM_ANTEIL  = 0.75;
const CAMPUSKINO_ANTEIL = 0.25;
const KINOTEAM_ANTEIL = 0.80;
const WINGLA_ANTEIL   = 0.20;
const SUMUP_GEBUEHR   = 0.01; // 1%

export async function getBilanz(veranstaltungId?: number): Promise<Bilanz> {
  const whereV = veranstaltungId ? 'WHERE veranstaltung_id = $1' : '';
  const params = veranstaltungId ? [veranstaltungId] : [];

  // Verkäufe aggregiert
  const verkauf = await pool.query(
    `SELECT
       p.kategorie,
       v.zahlungsart,
       SUM(v.gesamteinnahme) AS summe,
       SUM(v.menge) AS menge
     FROM verkauf_positionen v
     JOIN produkte p ON p.id = v.produkt_id
     ${whereV}
     GROUP BY p.kategorie, v.zahlungsart`,
    params
  );

  // Einkäufe aggregiert
  const einkauf = await pool.query(
    `SELECT SUM(gesamtkosten) AS summe FROM einkauf_positionen ${whereV}`,
    params
  );

  // Kasse
  const kasse = await pool.query(
    `SELECT typ, SUM(betrag) AS summe FROM kassenstand ${whereV} GROUP BY typ`,
    params
  );

  // Bestand
  const bestand = await pool.query(
    `SELECT SUM(bestand * ekp) AS bestand_ekp, SUM(bestand * vkp) AS bestand_vkp
     FROM produkte WHERE aktiv = true`
  );

  // --- Aggregieren ---
  let ticket_einnahmen = 0;
  let snack_einnahmen = 0;
  let einnahmen_bar = 0;
  let einnahmen_sumup = 0;
  let freikarten = 0;
  let besucher = 0;

  for (const row of verkauf.rows) {
    const s = parseFloat(row.summe ?? 0);
    const m = parseInt(row.menge ?? 0);
    if (row.kategorie === 'Ticket') {
      if (row.zahlungsart === 'freiticket') freikarten += m;
      else ticket_einnahmen += s;
      besucher += m;
    } else {
      snack_einnahmen += s;
    }
    if (row.zahlungsart === 'bar') einnahmen_bar += s;
    if (row.zahlungsart === 'sumup') einnahmen_sumup += s;
  }

  const einkauf_gesamt = parseFloat(einkauf.rows[0]?.summe ?? 0);
  const einnahmen_gesamt = ticket_einnahmen + snack_einnahmen;
  const ueberschuss = einnahmen_gesamt - einkauf_gesamt;
  const snack_ueberschuss = snack_einnahmen - einkauf_gesamt;

  let kassenanfang = 0;
  let kassenende_ist = 0;

  for (const row of kasse.rows) {
    const b = parseFloat(row.summe ?? 0);
    if (row.typ === 'anfang') kassenanfang = b;
    if (row.typ === 'ende') kassenende_ist = b;
  }

  const sumup_gebuehr = einnahmen_sumup * SUMUP_GEBUEHR;
  const kassenende_soll = kassenanfang + einnahmen_bar - sumup_gebuehr;

  return {
    einnahmen_bar,
    einnahmen_sumup,
    einnahmen_gesamt,
    einkauf_gesamt,
    ueberschuss,

    ticket_einnahmen,
    ticket_unifilm_anteil:    ticket_einnahmen * UNIFILM_ANTEIL,
    ticket_campuskino_anteil: ticket_einnahmen * CAMPUSKINO_ANTEIL,

    snack_ueberschuss: Math.max(snack_ueberschuss, 0),
    snack_kinoteam_anteil: Math.max(snack_ueberschuss, 0) * KINOTEAM_ANTEIL,
    snack_wingla_anteil:   Math.max(snack_ueberschuss, 0) * WINGLA_ANTEIL,

    kassenanfang,
    kassenende_soll,
    kassenende_ist,
    kassendifferenz: kassenende_ist - kassenende_soll,

    bestand_ekp: parseFloat(bestand.rows[0]?.bestand_ekp ?? 0),
    bestand_vkp: parseFloat(bestand.rows[0]?.bestand_vkp ?? 0),

    besucher_total: besucher,
    freikarten_total: freikarten,
  };
}
