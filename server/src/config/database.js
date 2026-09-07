import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Up to 50 active DB connections for concurrent requests
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error if connection is not acquired within 5 seconds
  statement_timeout: 10000, // Cancel query if it runs longer than 10 seconds
});

pool.on("connect", () => {
  // Silent or debug log for pool connection
});

pool.on("error", (err, client) => {
  console.error("❌ Unexpected idle PostgreSQL pool client error:", err.message);
  // Do not exit process, connection pool will automatically manage re-connections
});

export default pool;