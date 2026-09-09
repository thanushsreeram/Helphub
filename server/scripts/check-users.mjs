import "dotenv/config";
import pool from "../src/config/database.js";

async function checkUsers() {
  try {
    const res = await pool.query("SELECT id, name, email, role, is_email_verified, created_at FROM users ORDER BY id ASC");
    console.log("Registered Users in Database:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error querying users:", err);
  } finally {
    await pool.end();
  }
}

checkUsers();
