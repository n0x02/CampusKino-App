import { Router } from 'express';
import * as svc from '../services/campuskino.service.js';

const r = Router();

// ── Produkte ────────────────────────────────────────────────
r.get('/produkte', async (_req, res) => {
  try { res.json({ data: await svc.getAllProdukte() }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

r.patch('/produkte/:id', async (req, res) => {
  try {
    const p = await svc.updateProdukt(+req.params.id, req.body);
    res.json({ data: p });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Veranstaltungen ─────────────────────────────────────────
r.get('/veranstaltungen', async (_req, res) => {
  try { res.json({ data: await svc.getAllVeranstaltungen() }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

r.post('/veranstaltungen', async (req, res) => {
  try { res.status(201).json({ data: await svc.createVeranstaltung(req.body) }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Einkauf ─────────────────────────────────────────────────
r.get('/einkauf', async (req, res) => {
  try {
    const vid = req.query.veranstaltung_id ? +req.query.veranstaltung_id : undefined;
    res.json({ data: await svc.getEinkaeufe(vid) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

r.post('/einkauf', async (req, res) => {
  try { res.status(201).json({ data: await svc.createEinkauf(req.body) }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

r.delete('/einkauf/:id', async (req, res) => {
  try { await svc.deleteEinkauf(+req.params.id); res.json({ data: { ok: true } }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Verkauf ─────────────────────────────────────────────────
r.get('/verkauf', async (req, res) => {
  try {
    const vid = req.query.veranstaltung_id ? +req.query.veranstaltung_id : undefined;
    res.json({ data: await svc.getVerkaeufe(vid) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

r.post('/verkauf', async (req, res) => {
  try { res.status(201).json({ data: await svc.createVerkauf(req.body) }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

r.delete('/verkauf/:id', async (req, res) => {
  try { await svc.deleteVerkauf(+req.params.id); res.json({ data: { ok: true } }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Kasse ────────────────────────────────────────────────────
r.get('/kasse', async (req, res) => {
  try {
    const vid = req.query.veranstaltung_id ? +req.query.veranstaltung_id : undefined;
    res.json({ data: await svc.getKassenEintraege(vid) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

r.post('/kasse', async (req, res) => {
  try { res.status(201).json({ data: await svc.createKassenEintrag(req.body) }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Bilanz ───────────────────────────────────────────────────
r.get('/bilanz', async (req, res) => {
  try {
    const vid = req.query.veranstaltung_id ? +req.query.veranstaltung_id : undefined;
    res.json({ data: await svc.getBilanz(vid) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default r;
