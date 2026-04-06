import { useState, useEffect } from 'react'
import { api } from '../api/client'

const fmt = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

const ZAHLUNGSARTEN = [
  { val: 'bar', label: 'Bar' },
  { val: 'sumup', label: 'Sum-Up' },
  { val: 'freiticket', label: 'Freiticket' },
]

export default function Verkauf({
  produkte, activeVid, onUpdate
}: { produkte: any[], activeVid?: number, onUpdate: () => void }) {
  const [verkaeufe, setVerkaeufe] = useState<any[]>([])
  const [kasse, setKasse] = useState<any[]>([])
  const [form, setForm] = useState({ produkt_id: '', menge: '1', zahlungsart: 'bar', notiz: '' })
  const [kasseForm, setKasseForm] = useState({ typ: 'anfang', betrag: '0', notiz: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    const [v, k] = await Promise.all([
      api.getVerkaeufe(activeVid),
      api.getKasse(activeVid),
    ])
    setVerkaeufe(v)
    setKasse(k)
  }

  useEffect(() => { load() }, [activeVid])

  const submit = async () => {
    if (!form.produkt_id) { setErr('Produkt wählen'); return }
    setLoading(true); setErr('')
    try {
      const prod = produkte.find(p => p.id === +form.produkt_id)
      await api.createVerkauf({
        veranstaltung_id: activeVid,
        produkt_id: +form.produkt_id,
        menge: +form.menge,
        vkp_zum_zeitpunkt: prod?.vkp ?? 0,
        zahlungsart: form.zahlungsart,
        notiz: form.notiz || undefined,
      })
      setForm(f => ({ ...f, menge: '1', notiz: '' }))
      await load(); onUpdate()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  const submitKasse = async () => {
    setLoading(true)
    try {
      await api.createKassenEintrag({
        veranstaltung_id: activeVid,
        typ: kasseForm.typ,
        betrag: +kasseForm.betrag,
        notiz: kasseForm.notiz || undefined,
      })
      setKasseForm(f => ({ ...f, betrag: '0', notiz: '' }))
      await load()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  const del = async (id: number) => {
    if (!confirm('Verkauf löschen?')) return
    await api.deleteVerkauf(id)
    await load(); onUpdate()
  }

  // Schnellzugriff Tickets
  const tickets = produkte.filter(p => p.kategorie === 'Ticket')
  const snacks  = produkte.filter(p => p.kategorie !== 'Ticket')

  // Stats
  const totalBar   = verkaeufe.filter(v => v.zahlungsart === 'bar').reduce((s, v) => s + +v.gesamteinnahme, 0)
  const totalSumup = verkaeufe.filter(v => v.zahlungsart === 'sumup').reduce((s, v) => s + +v.gesamteinnahme, 0)
  const kasseAnfang = kasse.filter(k => k.typ === 'anfang').reduce((s, k) => s + +k.betrag, 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Verkauf</div>
        <span className="page-meta">{verkaeufe.length} Positionen · {fmt(totalBar + totalSumup)} Einnahmen</span>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Schnellerfassung */}
        <div className="card">
          <div className="card-head"><span className="card-title">Neue Buchung</span></div>
          <div className="form">
            {err && <div style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12 }}>⚠ {err}</div>}

            {/* Schnell-Buttons Tickets */}
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6 }}>Ticket Schnellauswahl</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tickets.map(p => (
                  <button key={p.id} className={`btn btn-ghost btn-sm ${form.produkt_id === String(p.id) ? 'btn-primary' : ''}`}
                    onClick={() => setForm(f => ({ ...f, produkt_id: String(p.id), zahlungsart: p.vkp === 0 ? 'freiticket' : 'bar' }))}>
                    {p.name} {p.vkp > 0 ? `(${fmt(p.vkp)})` : '(kostenlos)'}
                  </button>
                ))}
              </div>
            </div>

            <hr className="divider" />

            <div className="form-row cols-2">
              <div className="field">
                <label>Produkt</label>
                <select value={form.produkt_id} onChange={e => {
                  const prod = produkte.find(p => p.id === +e.target.value)
                  setForm(f => ({ ...f, produkt_id: e.target.value, zahlungsart: prod?.vkp === 0 ? 'freiticket' : f.zahlungsart }))
                }}>
                  <option value="">– auswählen –</option>
                  <optgroup label="Tickets">
                    {tickets.map(p => <option key={p.id} value={p.id}>{p.name} · {fmt(p.vkp)}</option>)}
                  </optgroup>
                  <optgroup label="Snacks & Getränke">
                    {snacks.map(p => <option key={p.id} value={p.id}>{p.sku} – {p.name} · {fmt(p.vkp)} (Bestand: {p.bestand})</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="field">
                <label>Menge</label>
                <input type="number" min="1" value={form.menge}
                  onChange={e => setForm(f => ({ ...f, menge: e.target.value }))} />
              </div>
            </div>

            <div className="form-row cols-2">
              <div className="field">
                <label>Zahlungsart</label>
                <select value={form.zahlungsart} onChange={e => setForm(f => ({ ...f, zahlungsart: e.target.value }))}>
                  {ZAHLUNGSARTEN.map(z => <option key={z.val} value={z.val}>{z.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Notiz (optional)</label>
                <input value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} placeholder="z.B. Restposten" />
              </div>
            </div>

            {form.produkt_id && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                Summe: <strong style={{ color: 'var(--text)' }}>
                  {fmt((produkte.find(p => p.id === +form.produkt_id)?.vkp ?? 0) * (+form.menge || 0))}
                </strong> · {form.zahlungsart}
              </div>
            )}

            <button className="btn btn-primary" disabled={loading} onClick={submit}>
              {loading ? '...' : '+ Verkauf buchen'}
            </button>
          </div>
        </div>

        {/* Kasse */}
        <div className="card">
          <div className="card-head"><span className="card-title">Kassenstand</span></div>
          <div className="kasse-grid">
            <div className="kasse-cell">
              <div className="kpi-label">Bar</div>
              <div className="kpi-value">{fmt(totalBar)}</div>
            </div>
            <div className="kasse-cell">
              <div className="kpi-label">Sum-Up</div>
              <div className="kpi-value">{fmt(totalSumup)}</div>
            </div>
            <div className="kasse-cell">
              <div className="kpi-label">Kassenanfang</div>
              <div className="kpi-value">{fmt(kasseAnfang)}</div>
            </div>
          </div>
          <div className="form" style={{ borderTop: '1px solid var(--border2)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Kassenbuchung</div>
            <div className="form-row cols-3">
              <div className="field">
                <label>Typ</label>
                <select value={kasseForm.typ} onChange={e => setKasseForm(f => ({ ...f, typ: e.target.value }))}>
                  <option value="anfang">Kassenanfang</option>
                  <option value="ende">Kassenende</option>
                  <option value="einzahlung">Einzahlung</option>
                  <option value="entnahme">Entnahme</option>
                </select>
              </div>
              <div className="field">
                <label>Betrag (€)</label>
                <input type="number" step="0.01" value={kasseForm.betrag}
                  onChange={e => setKasseForm(f => ({ ...f, betrag: e.target.value }))} />
              </div>
              <div className="field">
                <label>Notiz</label>
                <input value={kasseForm.notiz} onChange={e => setKasseForm(f => ({ ...f, notiz: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={submitKasse}>Buchen</button>
            {kasse.length > 0 && (
              <table style={{ marginTop: 8 }}>
                <tbody>
                  {kasse.slice(0, 5).map(k => (
                    <tr key={k.id}>
                      <td><span className={`tag ${k.typ === 'anfang' ? 'amber' : ''}`}>{k.typ}</span></td>
                      <td>{fmt(+k.betrag)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{k.notiz}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Verkaufsliste */}
      <div className="card">
        <div className="card-head"><span className="card-title">Verkäufe</span></div>
        {verkaeufe.length === 0
          ? <div className="empty">Noch keine Verkäufe</div>
          : <table>
            <thead>
              <tr>
                <th>Zeit</th><th>Produkt</th><th>Menge</th>
                <th>VKP</th><th>Summe</th><th>Zahlung</th><th>Notiz</th><th></th>
              </tr>
            </thead>
            <tbody>
              {verkaeufe.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--muted)' }}>{new Date(v.erstellt).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><strong>{v.produkt_name}</strong><br /><span style={{ color: 'var(--muted)', fontSize: 11 }}>{v.produkt_sku}</span></td>
                  <td>{v.menge}×</td>
                  <td>{fmt(+v.vkp_zum_zeitpunkt)}</td>
                  <td><strong>{fmt(+v.gesamteinnahme)}</strong></td>
                  <td><span className={`tag ${v.zahlungsart === 'bar' ? '' : v.zahlungsart === 'sumup' ? 'green' : 'red'}`}>{v.zahlungsart}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{v.notiz}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(v.id)}>×</button></td>
                </tr>
              ))}
              <tr className="sum-row">
                <td colSpan={4}>Gesamt</td>
                <td>{fmt(verkaeufe.reduce((s, v) => s + +v.gesamteinnahme, 0))}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}
