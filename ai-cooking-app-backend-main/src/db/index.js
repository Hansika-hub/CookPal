import pkg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function checkDb() {
  const res = await query('SELECT NOW()');
  return res.rows[0];
}
