import { useState, useEffect } from 'react'
import { api } from '../api/client'

const fmt = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`
const pct = (n: number) => `${(n * 100).toFixed(0)} %`

function BRow({ label, value, sub, indent, sum, cls }: {
  label: string; value: string; sub?: string;
  indent?: boolean; sum?: boolean; cls?: string
}) {
  return (
    <div className={`b-row ${indent ? 'indent' : ''} ${sum ? 'sum' : ''}`}>
      <span className="b-label">{label}{sub && <><br /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</span></>}</span>
      <span className={`b-val ${cls ?? ''}`}>{value}</span>
    </div>
  )
}

export default function Bilanz({ activeVid, activeV }: { activeVid?: number, activeV?: any }) {
  const [bilanz, setBilanz] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setBilanz(await api.getBilanz(activeVid))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeVid])

  if (loading) return <div className="empty">Lade Bilanz…</div>
  if (!bilanz)  return <div className="empty">Keine Daten</div>

  const b = bilanz

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Bilanz</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="page-meta">{activeV ? `${activeV.datum} – ${activeV.bezeichnung}` : 'Alle Abende'}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Aktualisieren</button>
        </div>
      </div>

      {/* KPI Top */}
      <div className="three-col" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Einnahmen gesamt</div>
          <div className="kpi-value">{fmt(b.einnahmen_gesamt)}</div>
          <div className="kpi-sub">Bar: {fmt(b.einnahmen_bar)} · Sum-Up: {fmt(b.einnahmen_sumup)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Einkaufskosten</div>
          <div className="kpi-value red">{fmt(b.einkauf_gesamt)}</div>
          <div className="kpi-sub">Warenbestand VKP: {fmt(b.bestand_vkp)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Überschuss netto</div>
          <div className={`kpi-value ${b.ueberschuss >= 0 ? 'green' : 'red'}`}>{fmt(b.ueberschuss)}</div>
          <div className="kpi-sub">Besucher: {b.besucher_total} · Freikarten: {b.freikarten_total}</div>
        </div>
      </div>

      <div className="two-col">
        {/* Einnahmen / Ausgaben */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><span className="card-title">Einnahmen & Ausgaben</span></div>
            <BRow label="Ticketeinnahmen" value={fmt(b.ticket_einnahmen)} />
            <BRow label="Snack & Getränke" value={fmt(b.einnahmen_gesamt - b.ticket_einnahmen)} />
            <BRow label="Einkaufskosten Waren" value={`− ${fmt(b.einkauf_gesamt)}`} cls="neg" />
            <BRow label="Überschuss" value={fmt(b.ueberschuss)} sum cls={b.ueberschuss >= 0 ? 'pos' : 'neg'} />
          </div>

          {/* Ticketaufteilung */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><span className="card-title">Ticket-Aufteilung</span></div>
            <BRow label="Ticketeinnahmen" value={fmt(b.ticket_einnahmen)} />
            <BRow label={`UniFilm e.V. (${pct(0.75)})`} value={fmt(b.ticket_unifilm_anteil)} indent cls="neg" sub="→ Rechnung ausstellen" />
            <BRow label={`CampusKino (${pct(0.25)})`} value={fmt(b.ticket_campuskino_anteil)} indent cls="pos" />
          </div>

          {/* Snack-Aufteilung */}
          <div className="card">
            <div className="card-head"><span className="card-title">Snack-Überschuss Aufteilung</span></div>
            <BRow label="Snack-Überschuss" value={fmt(b.snack_ueberschuss)} />
            <BRow label={`KinoTeam (${pct(0.80)})`} value={fmt(b.snack_kinoteam_anteil)} indent cls="pos" />
            <BRow label={`WingLA e.V. (${pct(0.20)})`} value={fmt(b.snack_wingla_anteil)} indent cls="pos" />
          </div>
        </div>

        {/* Kasse + Bestand */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><span className="card-title">Kassenabschluss</span></div>
            <BRow label="Kassenanfang" value={fmt(b.kassenanfang)} cls="amber" />
            <BRow label="+ Bar-Einnahmen" value={fmt(b.einnahmen_bar)} cls="pos" />
            <BRow label="− Sum-Up Gebühr (1%)" value={`− ${fmt(b.einnahmen_sumup * 0.01)}`} cls="neg" />
            <BRow label="Kassenende (Soll)" value={fmt(b.kassenende_soll)} sum />
            <BRow label="Kassenende (Ist)" value={fmt(b.kassenende_ist)} />
            <BRow
              label="Kassendifferenz"
              value={fmt(b.kassendifferenz)}
              sum
              cls={Math.abs(b.kassendifferenz) < 0.5 ? 'pos' : 'neg'}
            />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><span className="card-title">Warenbestand</span></div>
            <BRow label="Bestandswert (EKP)" value={fmt(b.bestand_ekp)} />
            <BRow label="Bestandswert (VKP)" value={fmt(b.bestand_vkp)} cls="pos" />
            <BRow label="Stiller Reserven" value={fmt(b.bestand_vkp - b.bestand_ekp)} sum cls="amber" />
          </div>

          {/* Gesamtauszahlung */}
          <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div className="card-head"><span className="card-title">Gesamtauszahlung SoSe 2026</span></div>
            <BRow
              label="KinoTeam (Snack 80% + Ticket CK 80%)"
              value={fmt(b.snack_kinoteam_anteil + b.ticket_campuskino_anteil * 0.8)}
              cls="pos"
            />
            <BRow
              label="WingLA e.V. (Snack 20% + Ticket CK 20%)"
              value={fmt(b.snack_wingla_anteil + b.ticket_campuskino_anteil * 0.2)}
              cls="pos"
            />
            <BRow
              label="UniFilm e.V. (75% Tickets)"
              value={fmt(b.ticket_unifilm_anteil)}
              cls="neg"
              sub="→ Rechnung erforderlich"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
