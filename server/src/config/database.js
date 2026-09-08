import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || "";
const isLocalDb = /(^|localhost|127\.0\.0\.1|::1)(:|\/|$)/i.test(
  databaseUrl.replace(/^\w+:\/\//, ""),
);
const isCloudDb = Boolean(databaseUrl) && !isLocalDb;

const poolConfig = {
  connectionString: databaseUrl,
  max: Number(
    process.env.DB_POOL_MAX ||
      (process.env.VERCEL || process.env.NODE_ENV === "production" ? 10 : 20),
  ),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // 15 seconds to accommodate Render free-tier cold starts
  statement_timeout: 15000,
};

if (isCloudDb || process.env.NODE_ENV === "production") {
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
