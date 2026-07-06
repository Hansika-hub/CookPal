// src/routes/recipes.js
import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET /recipes
// Optional filters: ?tag=vegan&user_id=...&limit=20&offset=0
router.get('/', async (req, res, next) => {
  try {
    const { tag, user_id, limit, offset } = req.query;

    const values = [];
    const where = [];

    if (tag) {
      values.push(tag);
      where.push(`$${values.length} = any(tags)`);
    }

    if (user_id) {
      values.push(user_id);
      where.push(`user_id = $${values.length}`);
    }

    let sql = `
      select
        id,
        user_id,
        title,
        description,
        ingredients,
        tags,
        cook_time_minutes,
        created_at
      from recipes
    `;

    if (where.length > 0) {
      sql += ' where ' + where.join(' and ');
    }

    sql += ' order by created_at desc';

    const lim = Number(limit) || 20;
    const off = Number(offset) || 0;

    values.push(lim);
    values.push(off);
    sql += ` limit $${values.length - 1} offset $${values.length}`;

    const { rows } = await query(sql, values);

    res.json({ recipes: rows });
  } catch (err) {
    next(err);
  }
});

// GET /recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      select
        id,
        user_id,
        title,
        description,
        ingredients,
        steps,
        tags,
        cook_time_minutes,
        model_name,
        source,
        created_at
      from recipes
      where id = $1
    `;

    const { rows } = await query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ recipe: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
