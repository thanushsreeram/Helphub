import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || "";
const isLocalDb = /(^|localhost|127\.0\.0\.1|::1)(:|\/|$)/i.test(
  databaseUrl.replace(/^\w+:\/\//, ""),
);
const isCloudDb = Boolean(databaseUrl) && !isLocalDb;

const configuredPoolMax = Number(process.env.DB_POOL_MAX);
const defaultPoolMax = process.env.VERCEL ? 3 : 10;

const poolConfig = {
  connectionString: databaseUrl,
  // Keep each serverless instance small. A large pool per instance can exhaust
  // the shared Postgres connection limit when traffic causes instances to scale.
  max:
    Number.isInteger(configuredPoolMax) && configuredPoolMax > 0
      ? configuredPoolMax
      : defaultPoolMax,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
  query_timeout: 15000,
  allowExitOnIdle: true,
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
