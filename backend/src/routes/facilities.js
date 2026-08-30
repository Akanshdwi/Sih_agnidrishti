import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT id, name, type, osm_id, ST_AsGeoJSON(geom) AS geometry FROM facilities`
    );
    res.json(rows);
});

// POST /api/facilities/bulk -- feed OSM Overpass results here
router.post('/bulk', async (req, res) => {
    const facilities = req.body; // [{name, type, osm_id, geojsonPolygon}]
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const f of facilities) {
            await client.query(
                `INSERT INTO facilities (name, type, osm_id, geom)
         VALUES ($1,$2,$3, ST_SetSRID(ST_GeomFromGeoJSON($4),4326))`,
                [f.name, f.type, f.osm_id, JSON.stringify(f.geojsonPolygon)]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ inserted: facilities.length });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

export default router;