import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
import aiRouter from './routes/ai.js';
import { errorHandler } from './middleware/errorHandler.js';
import recipesRouter from './routes/recipes.js';
import usersRouter from './routes/users.js';
import userRecipeMetaRouter from './routes/user-recipe-meta.js';
import mealPlansRouter from './routes/meal-plans.js';
import mealPlanItemsRouter from './routes/meal-plan-items.js';

import { query } from './db/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/ai', aiRouter);
app.use('/recipes', recipesRouter);
app.use('/users', usersRouter);
app.use('/user-recipe-meta', userRecipeMetaRouter);
app.use('/meal-plans', mealPlansRouter);
app.use('/meal-plan-items', mealPlanItemsRouter);

// Global error handler (after routes)
app.use(errorHandler);

// Start server
app.listen(config.port, '127.0.0.1', async () => {
  console.log(`Server running on port ${config.port}`);
  try {
    // Migration: Alter user_id column to TEXT if it was previously created as INT
    await query(`ALTER TABLE family_meal_plans ALTER COLUMN user_id TYPE TEXT;`).catch(() => {});
    await query(`
      CREATE TABLE IF NOT EXISTS family_meal_plans (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        family_members JSONB NOT NULL,
        ingredients TEXT[] NOT NULL,
        meal_plan JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database family_meal_plans table verified/created.');
  } catch (err) {
    console.error('Failed to create family_meal_plans table:', err);
  }
});
