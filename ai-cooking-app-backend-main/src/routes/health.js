import { Router } from 'express';
import { checkDb } from '../db/index.js';

const router = Router();

// Simple health
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'cooking-app-backend' });
});

// DB health
router.get('/db', async (req, res, next) => {
  try {
    const nowRow = await checkDb();
    res.json({ status: 'ok', dbTime: nowRow.now });
  } catch (err) {
    next(err);
  }
});

export default router;
