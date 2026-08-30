import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import hotspots from './routes/hotspots.js';
import facilities from './routes/facilities.js';
import incidents from './routes/incidents.js';
import alerts from './routes/alerts.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/hotspots', hotspots);
app.use('/api/facilities', facilities);
app.use('/api/incidents', incidents);
app.use('/api/alerts', alerts);

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend up on :${port}`));