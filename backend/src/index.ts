import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

app.listen(PORT, () => {
  console.log(`CampusKino API läuft auf http://localhost:${PORT}`);
});
