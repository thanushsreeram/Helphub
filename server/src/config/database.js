import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const isCloudDb =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost"));

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL ? 5 : 20,
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error if connection is not acquired within 5 seconds
  statement_timeout: 10000, // Cancel query if it runs longer than 10 seconds
};

if (isCloudDb && process.env.DATABASE_URL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  // Silent or debug log for pool connection
});

pool.on("error", (err, client) => {
  console.error(
    "❌ Unexpected idle PostgreSQL pool client error:",
    err.message,
  );
  // Do not exit process, connection pool will automatically manage re-connections
});

export default pool;
