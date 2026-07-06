import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { meal_plan_id, recipe_id, meal_date, meal_type, position } = req.body;

    if (!meal_plan_id || !recipe_id || !meal_date) {
      return res.status(400).json({ error: 'meal_plan_id, recipe_id, and meal_date are required' });
    }

    const sql = `
      insert into meal_plan_items (meal_plan_id, recipe_id, meal_date, meal_type, position)
      values ($1, $2, $3, $4, $5)
      returning id, meal_plan_id, recipe_id, meal_date, meal_type, position, created_at
    `;

    const values = [meal_plan_id, recipe_id, meal_date, meal_type || null, position ?? null];

    const { rows } = await query(sql, values);

    res.status(201).json({ item: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:meal_plan_id', async (req, res, next) => {
  try {
    const { meal_plan_id } = req.params;
    const { meal_date, meal_type } = req.query;

    let sql = `
      select
        mpi.id,
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.meal_date,
        mpi.meal_type,
        mpi.position,
        mpi.created_at,
        r.title,
        r.description,
        r.cook_time_minutes,
        r.tags
      from meal_plan_items mpi
      join recipes r on mpi.recipe_id = r.id
      where mpi.meal_plan_id = $1
    `;

    const values = [meal_plan_id];

    if (meal_date) {
      values.push(meal_date);
      sql += ` and mpi.meal_date = $${values.length}`;
    }

    if (meal_type) {
      values.push(meal_type);
      sql += ` and mpi.meal_type = $${values.length}`;
    }

    sql += ' order by mpi.meal_date asc, mpi.position asc';

    const { rows } = await query(sql, values);

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { meal_date, meal_type, position } = req.body;

    const sql = `
      update meal_plan_items
      set
        meal_date = coalesce($2, meal_date),
        meal_type = coalesce($3, meal_type),
        position = coalesce($4, position)
      where id = $1
      returning id, meal_plan_id, recipe_id, meal_date, meal_type, position, created_at
    `;

    const values = [id, meal_date || null, meal_type || null, position ?? null];

    const { rows } = await query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan item not found' });
    }

    res.json({ item: rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await query('delete from meal_plan_items where id = $1', [id]);

    res.json({ message: 'Meal plan item deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
