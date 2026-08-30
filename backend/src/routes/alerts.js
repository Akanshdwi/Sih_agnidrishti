import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM alerts ORDER BY sent_at DESC LIMIT 500`);
    res.json(rows);
});

export default router;