import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  const result = await pool.query(`
    SELECT
      id,
      name,
      email,
      role,
      CASE
        WHEN password_hash IS NULL THEN false
        ELSE true
      END AS has_password
    FROM users
    WHERE email = 'testworker@gmail.com';
  `);

  console.log("Worker found:");
  console.table(result.rows);
} catch (error) {
  console.error("DATABASE ERROR:");
  console.error(error.message);
} finally {
  await pool.end();
}