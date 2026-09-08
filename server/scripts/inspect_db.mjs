import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  try {
    const dbRes = await pool.query("SELECT current_database();");
    console.log("Current Database:", dbRes.rows[0].current_database);

    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log("Tables in public schema:", tablesRes.rows.map(r => r.table_name));

    for (const table of tablesRes.rows.map(r => r.table_name)) {
      const colRes = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1;",
        [table]
      );
      console.log(`\nTable [${table}] columns:`);
      console.table(colRes.rows);
    }
  } catch (err) {
    console.error("DB inspection error:", err);
  } finally {
    await pool.end();
  }
}

inspect();
