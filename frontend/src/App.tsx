import { useState, useEffect } from 'react'
import Einkauf from './pages/Einkauf'
import Verkauf from './pages/Verkauf'
import Bilanz from './pages/Bilanz'
import { api } from './api/client'
import './app.css'

type Page = 'einkauf' | 'verkauf' | 'bilanz'

export default function App() {
  const [page, setPage] = useState<Page>('verkauf')
  const [produkte, setProdukte] = useState<any[]>([])
  const [veranstaltungen, setVeranstaltungen] = useState<any[]>([])
  const [activeVid, setActiveVid] = useState<number | undefined>(undefined)
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      const [p, v] = await Promise.all([api.getProdukte(), api.getVeranstaltungen()])
      setProdukte(p)
      setVeranstaltungen(v)
      if (!activeVid && v.length > 0) setActiveVid(v[0].id)
    } catch (e: any) {
      setError('Backend nicht erreichbar – läuft der Server?')
    }
  }

  useEffect(() => { reload() }, [])

  const nav: { key: Page; label: string; icon: string }[] = [
    { key: 'verkauf',  label: 'Verkauf',  icon: '🎟' },
    { key: 'einkauf',  label: 'Einkauf',  icon: '📦' },
    { key: 'bilanz',   label: 'Bilanz',   icon: '📊' },
  ]

  const activeV = veranstaltungen.find(v => v.id === activeVid)

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">CAMPUS<span>KINO</span></span>
          <span className="semester">SoSe 2026</span>
        </div>

        {/* Veranstaltungs-Switcher */}
        <div className="v-switcher">
          <span className="v-label">Abend:</span>
          <select
            className="v-select"
            value={activeVid ?? ''}
            onChange={e => setActiveVid(+e.target.value || undefined)}
          >
            <option value="">Alle</option>
            {veranstaltungen.map(v => (
              <option key={v.id} value={v.id}>
                {v.datum} – {v.bezeichnung}
              </option>
            ))}
          </select>
          <button className="btn-add-v" onClick={() => {
            const datum = prompt('Datum (YYYY-MM-DD)?')
            const bezeichnung = prompt('Bezeichnung?')
            if (datum && bezeichnung) {
              api.createVeranstaltung({ datum, bezeichnung }).then(reload)
            }
          }}>+ Abend</button>
        </div>

        {/* Nav */}
        <nav className="nav">
          {nav.map(n => (
            <button
              key={n.key}
              className={`nav-btn ${page === n.key ? 'active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="error-banner">
          ⚠ {error}
          <button onClick={() => { setError(''); reload() }}>Retry</button>
        </div>
      )}

      {/* Content */}
      <main className="content">
        {page === 'verkauf' && (
          <Verkauf produkte={produkte} activeVid={activeVid} onUpdate={reload} />
        )}
        {page === 'einkauf' && (
          <Einkauf produkte={produkte} activeVid={activeVid} onUpdate={reload} />
        )}
        {page === 'bilanz' && (
          <Bilanz activeVid={activeVid} activeV={activeV} />
        )}
      </main>
    </div>
  )
}
