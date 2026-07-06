
import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const sql = `
      insert into users (email, name)
      values ($1, $2)
      returning id, email, name, created_at
    `;

    const { rows } = await query(sql, [email, name || null]);

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    next(err);
  }
});

// GET /users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      select id, email, name, created_at
      from users
      where id = $1
    `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const lim = Number(limit) || 50;
    const off = Number(offset) || 0;

    const sql = `
      select id, email, name, created_at
      from users
      order by created_at desc
      limit $1 offset $2
    `;

    const { rows } = await query(sql, [lim, off]);

    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
