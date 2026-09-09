import "dotenv/config";
import pool from "../src/config/database.js";

async function fixTestClient() {
  try {
    await pool.query("UPDATE users SET role = 'client' WHERE email = 'testclient@gmail.com'");
    console.log("✅ Successfully updated testclient@gmail.com role back to 'client'");
    
    const res = await pool.query("SELECT id, name, email, role FROM users WHERE email = 'testclient@gmail.com'");
    console.table(res.rows);
  } catch (err) {
    console.error("Fix error:", err);
  } finally {
    await pool.end();
  }
}

fixTestClient();
