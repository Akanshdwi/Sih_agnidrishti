import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/hotspots?since=2026-08-01&class=Industrial+Fire
router.get('/', async (req, res) => {
  const { since, class: cls } = req.query;
  const conditions = [];
  const values = [];
  if (since) { values.push(since); conditions.push(`acq_date >= $${values.length}`); }
  if (cls) { values.push(cls); conditions.push(`classification = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id, lat, lon, satellite, acq_date, brightness_ti4, frp, confidence,
            classification, class_confidence, risk_score, facility_id, explanation
     FROM hotspots ${where} ORDER BY acq_date DESC LIMIT 5000`,
    values
  );
  res.json(rows);
});

// POST /api/hotspots  -- raw ingestion (from FIRMS pull script or ML pipeline)
router.post('/', async (req, res) => {
  const {
    lat, lon, satellite, acq_date, brightness_ti4, frp, confidence,
    classification, class_confidence, risk_score, facility_id, explanation, raw
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO hotspots
      (lat, lon, geom, satellite, acq_date, brightness_ti4, frp, confidence,
       classification, class_confidence, risk_score, facility_id, explanation, raw)
     VALUES ($1,$2, ST_SetSRID(ST_MakePoint($2,$1),4326), $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [lat, lon, satellite, acq_date, brightness_ti4, frp, confidence,
      classification, class_confidence, risk_score, facility_id, explanation, raw]
  );
  res.status(201).json({ id: rows[0].id });
});

// PATCH /api/hotspots/:id  -- ML team updates classification after model runs
router.patch('/:id', async (req, res) => {
  const { classification, class_confidence, risk_score, explanation } = req.body;
  await pool.query(
    `UPDATE hotspots SET classification=$1, class_confidence=$2, risk_score=$3, explanation=$4
     WHERE id=$5`,
    [classification, class_confidence, risk_score, explanation, req.params.id]
  );
  res.sendStatus(204);
});

export default router;