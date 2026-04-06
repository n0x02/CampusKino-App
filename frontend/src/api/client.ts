const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API Fehler');
  return json.data as T;
}

export const api = {
  // Produkte
  getProdukte: () => req<any[]>('/produkte'),
  updateProdukt: (id: number, body: object) =>
    req<any>(`/produkte/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Veranstaltungen
  getVeranstaltungen: () => req<any[]>('/veranstaltungen'),
  createVeranstaltung: (body: object) =>
    req<any>('/veranstaltungen', { method: 'POST', body: JSON.stringify(body) }),

  // Einkauf
  getEinkaeufe: (vid?: number) =>
    req<any[]>(`/einkauf${vid ? `?veranstaltung_id=${vid}` : ''}`),
  createEinkauf: (body: object) =>
    req<any>('/einkauf', { method: 'POST', body: JSON.stringify(body) }),
  deleteEinkauf: (id: number) =>
    req<any>(`/einkauf/${id}`, { method: 'DELETE' }),

  // Verkauf
  getVerkaeufe: (vid?: number) =>
    req<any[]>(`/verkauf${vid ? `?veranstaltung_id=${vid}` : ''}`),
  createVerkauf: (body: object) =>
    req<any>('/verkauf', { method: 'POST', body: JSON.stringify(body) }),
  deleteVerkauf: (id: number) =>
    req<any>(`/verkauf/${id}`, { method: 'DELETE' }),

  // Kasse
  getKasse: (vid?: number) =>
    req<any[]>(`/kasse${vid ? `?veranstaltung_id=${vid}` : ''}`),
  createKassenEintrag: (body: object) =>
    req<any>('/kasse', { method: 'POST', body: JSON.stringify(body) }),

  // Bilanz
  getBilanz: (vid?: number) =>
    req<any>(`/bilanz${vid ? `?veranstaltung_id=${vid}` : ''}`),
};
