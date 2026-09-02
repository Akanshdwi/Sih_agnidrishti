import { Router } from 'express';
import { pool } from '../db.js';
import { dispatchAlert } from '../notify.js';

const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM incidents ORDER BY created_at DESC LIMIT 500`);
        res.json(rows);
    } catch (err) { next(err); }
});

// POST /api/incidents -- multi-agent pipeline pushes final verdict here
router.post('/', async (req, res, next) => {
    try {
        const { hotspot_id, agent1, agent2, agent3, status, threat_priority } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO incidents (hotspot_id, agent1, agent2, agent3, status, threat_priority)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [hotspot_id, agent1, agent2, agent3, status, threat_priority]
        );
        const incidentId = rows[0].id;

        if (status === 'VALIDATED') {
            await dispatchAlert(incidentId, threat_priority);
        }
        res.status(201).json({ id: incidentId });
    } catch (err) { next(err); }
});

export default router;