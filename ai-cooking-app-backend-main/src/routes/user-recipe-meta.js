import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { user_id, recipe_id, is_favorite, rating, notes } = req.body;

    if (!user_id || !recipe_id) {
      return res.status(400).json({ error: 'user_id and recipe_id are required' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    const sql = `
      insert into user_recipe_meta (user_id, recipe_id, is_favorite, rating, notes)
      values ($1, $2, $3, $4, $5)
      on conflict (user_id, recipe_id)
      do update set
        is_favorite = coalesce($3, user_recipe_meta.is_favorite),
        rating = coalesce($4, user_recipe_meta.rating),
        notes = coalesce($5, user_recipe_meta.notes),
        updated_at = now()
      returning user_id, recipe_id, is_favorite, rating, notes, created_at, updated_at
    `;

    const values = [
      user_id,
      recipe_id,
      is_favorite ?? null,
      rating ?? null,
      notes ?? null
    ];

    const { rows } = await query(sql, values);

    res.status(201).json({ meta: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { favorites_only, min_rating } = req.query;

    let sql = `
      select
        user_id,
        recipe_id,
        is_favorite,
        rating,
        notes,
        created_at,
        updated_at
      from user_recipe_meta
      where user_id = $1
    `;

    const values = [user_id];

    if (favorites_only === 'true') {
      sql += ' and is_favorite = true';
    }

    if (min_rating) {
      values.push(Number(min_rating));
      sql += ` and rating >= $${values.length}`;
    }

    sql += ' order by updated_at desc';

    const { rows } = await query(sql, values);

    res.json({ metadata: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:user_id/:recipe_id', async (req, res, next) => {
  try {
    const { user_id, recipe_id } = req.params;

    const sql = `
      select
        user_id,
        recipe_id,
        is_favorite,
        rating,
        notes,
        created_at,
        updated_at
      from user_recipe_meta
      where user_id = $1 and recipe_id = $2
    `;

    const { rows } = await query(sql, [user_id, recipe_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Metadata not found' });
    }

    res.json({ meta: rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/:user_id/:recipe_id', async (req, res, next) => {
  try {
    const { user_id, recipe_id } = req.params;

    const sql = 'delete from user_recipe_meta where user_id = $1 and recipe_id = $2';

    await query(sql, [user_id, recipe_id]);

    res.json({ message: 'Metadata deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
