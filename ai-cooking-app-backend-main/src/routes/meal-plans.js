import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { user_id, title, description, start_date, end_date } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const sql = `
      insert into meal_plans (user_id, title, description, start_date, end_date)
      values ($1, $2, $3, $4, $5)
      returning id, user_id, title, description, start_date, end_date, created_at
    `;

    const values = [user_id, title, description || null, start_date || null, end_date || null];

    const { rows } = await query(sql, values);

    res.status(201).json({ meal_plan: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { limit, offset } = req.query;

    const lim = Number(limit) || 20;
    const off = Number(offset) || 0;

    const sql = `
      select
        id,
        user_id,
        title,
        description,
        start_date,
        end_date,
        created_at
      from meal_plans
      where user_id = $1
      order by start_date desc, created_at desc
      limit $2 offset $3
    `;

    const { rows } = await query(sql, [user_id, lim, off]);

    res.json({ meal_plans: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/detail/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const planSql = `
      select id, user_id, title, description, start_date, end_date, created_at
      from meal_plans
      where id = $1
    `;

    const { rows: planRows } = await query(planSql, [id]);

    if (planRows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const itemsSql = `
      select
        mpi.id,
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.meal_date,
        mpi.meal_type,
        mpi.position,
        mpi.created_at,
        r.title,
        r.cook_time_minutes,
        r.tags
      from meal_plan_items mpi
      join recipes r on mpi.recipe_id = r.id
      where mpi.meal_plan_id = $1
      order by mpi.meal_date asc, mpi.position asc
    `;

    const { rows: items } = await query(itemsSql, [id]);

    res.json({
      meal_plan: planRows,
      items
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date } = req.body;

    const sql = `
      update meal_plans
      set
        title = coalesce($2, title),
        description = coalesce($3, description),
        start_date = coalesce($4, start_date),
        end_date = coalesce($5, end_date)
      where id = $1
      returning id, user_id, title, description, start_date, end_date, created_at
    `;

    const { rows } = await query(sql, [id, title || null, description || null, start_date || null, end_date || null]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ meal_plan: rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await query('delete from meal_plans where id = $1', [id]);

    res.json({ message: 'Meal plan deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
