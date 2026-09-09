import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const email = "testworker@gmail.com";
const password = "TestPassword123!";

try {
  const result = await pool.query(
    "SELECT password_hash FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    console.log("❌ Worker not found");
    process.exit(1);
  }

  const hash = result.rows[0].password_hash;

  console.log("Email found:", email);
  console.log("Password hash exists:", !!hash);

  const matches = await bcrypt.compare(password, hash);

  if (matches) {
    console.log("✅ PASSWORD MATCHES");
  } else {
    console.log("❌ PASSWORD DOES NOT MATCH");
  }
} catch (error) {
  console.error("ERROR:", error.message);
} finally {
  await pool.end();
}