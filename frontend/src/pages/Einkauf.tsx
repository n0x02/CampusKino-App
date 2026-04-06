import { useState, useEffect } from 'react'
import { api } from '../api/client'

const fmt = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

export default function Einkauf({
  produkte, activeVid, onUpdate
}: { produkte: any[], activeVid?: number, onUpdate: () => void }) {
  const [einkaeufe, setEinkaeufe] = useState<any[]>([])
  const [form, setForm] = useState({ produkt_id: '', menge: '1', ekp: '', notiz: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    setEinkaeufe(await api.getEinkaeufe(activeVid))
  }
  useEffect(() => { load() }, [activeVid])

  const handleProduktChange = (id: string) => {
    const prod = produkte.find(p => p.id === +id)
    setForm(f => ({ ...f, produkt_id: id, ekp: prod ? String(prod.ekp) : '' }))
  }

  const submit = async () => {
    if (!form.produkt_id || !form.menge) { setErr('Produkt und Menge angeben'); return }
    setLoading(true); setErr('')
    try {
      await api.createEinkauf({
        veranstaltung_id: activeVid,
        produkt_id: +form.produkt_id,
        menge: +form.menge,
        ekp_zum_zeitpunkt: +form.ekp || 0,
        notiz: form.notiz || undefined,
      })
      setForm(f => ({ ...f, menge: '1', notiz: '' }))
      await load(); onUpdate()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  const del = async (id: number) => {
    if (!confirm('Einkauf rückgängig machen? Bestand wird angepasst.')) return
    await api.deleteEinkauf(id)
    await load(); onUpdate()
  }

  const totalKosten = einkaeufe.reduce((s, e) => s + +e.gesamtkosten, 0)

  // Bestand-Übersicht
  const warenProdukte = produkte.filter(p => p.kategorie !== 'Ticket' && p.aktiv)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Einkauf & Bestand</div>
        <span className="page-meta">{einkaeufe.length} Positionen · {fmt(totalKosten)} Einkaufskosten</span>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Einkauf Formular */}
        <div className="card">
          <div className="card-head"><span className="card-title">Einkauf erfassen</span></div>
          <div className="form">
            {err && <div style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12 }}>⚠ {err}</div>}

            <div className="field">
              <label>Produkt</label>
              <select value={form.produkt_id} onChange={e => handleProduktChange(e.target.value)}>
                <option value="">– auswählen –</option>
                <optgroup label="Snacks">
                  {produkte.filter(p => p.kategorie === 'Snack').map(p => (
                    <option key={p.id} value={p.id}>{p.sku} – {p.name} (Bestand: {p.bestand})</option>
                  ))}
                </optgroup>
                <optgroup label="Getränke">
                  {produkte.filter(p => p.kategorie === 'Getraenk').map(p => (
                    <option key={p.id} value={p.id}>{p.sku} – {p.name} (Bestand: {p.bestand})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-row cols-2">
              <div className="field">
                <label>Menge (Stück)</label>
                <input type="number" min="1" value={form.menge}
                  onChange={e => setForm(f => ({ ...f, menge: e.target.value }))} />
              </div>
              <div className="field">
                <label>Einkaufspreis / Stück (€)</label>
                <input type="number" step="0.01" min="0" value={form.ekp}
                  onChange={e => setForm(f => ({ ...f, ekp: e.target.value }))}
                  placeholder="Aus DB vorgeladen" />
              </div>
            </div>

            <div className="field">
              <label>Notiz / Beleg-Nr.</label>
              <input value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))}
                placeholder="z.B. Rewe-Beleg #1234" />
            </div>

            {form.produkt_id && form.menge && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                Gesamtkosten: <strong style={{ color: 'var(--text)' }}>
                  {fmt((+form.ekp || 0) * (+form.menge || 0))}
                </strong>
              </div>
            )}

            <button className="btn btn-primary" disabled={loading} onClick={submit}>
              {loading ? '...' : '+ Einkauf buchen'}
            </button>
          </div>
        </div>

        {/* Bestandsübersicht */}
        <div className="card">
          <div className="card-head"><span className="card-title">Aktueller Warenbestand</span></div>
          <table>
            <thead>
              <tr><th>SKU</th><th>Artikel</th><th>Bestand</th><th>EKP</th><th>VKP</th><th>BW (VKP)</th></tr>
            </thead>
            <tbody>
              {warenProdukte.map(p => (
                <tr key={p.id}>
                  <td><span className="tag">{p.sku}</span></td>
                  <td>{p.name}</td>
                  <td>
                    <span className={p.bestand <= 2 ? 'tag red' : p.bestand <= 5 ? 'tag amber' : 'tag green'}>
                      {p.bestand}
                    </span>
                  </td>
                  <td>{fmt(+p.ekp)}</td>
                  <td>{fmt(+p.vkp)}</td>
                  <td>{fmt(+p.vkp * p.bestand)}</td>
                </tr>
              ))}
              <tr className="sum-row">
                <td colSpan={5}>Gesamt BW (VKP)</td>
                <td>{fmt(warenProdukte.reduce((s, p) => s + +p.vkp * p.bestand, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Einkaufsliste */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Einkaufshistorie</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            Löschen = Bestandskorrektur
          </span>
        </div>
        {einkaeufe.length === 0
          ? <div className="empty">Noch keine Einkäufe</div>
          : <table>
            <thead>
              <tr><th>Zeit</th><th>Produkt</th><th>Menge</th><th>EKP/Stk</th><th>Gesamt</th><th>Notiz</th><th></th></tr>
            </thead>
            <tbody>
              {einkaeufe.map(e => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--muted)' }}>{new Date(e.erstellt).toLocaleDateString('de')}</td>
                  <td><strong>{e.produkt_name}</strong> <span className="tag">{e.produkt_sku}</span></td>
                  <td>{e.menge}×</td>
                  <td>{fmt(+e.ekp_zum_zeitpunkt)}</td>
                  <td><strong>{fmt(+e.gesamtkosten)}</strong></td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{e.notiz}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(e.id)}>×</button></td>
                </tr>
              ))}
              <tr className="sum-row">
                <td colSpan={4}>Gesamtkosten</td>
                <td>{fmt(totalKosten)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}
