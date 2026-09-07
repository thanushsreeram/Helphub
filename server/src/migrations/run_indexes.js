import fs from "fs";
import path from "path";
import pool from "../config/database.js";

async function runIndexMigration() {
  try {
    const sqlPath = path.join(process.cwd(), "src", "migrations", "add_performance_indexes.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    console.log("Running SQL migration:\n", sql);
    await pool.query(sql);
    console.log("✅ Performance indexes created successfully!");
  } catch (err) {
    console.error("❌ Index migration failed:", err);
  } finally {
    await pool.end();
  }
}

runIndexMigration();
