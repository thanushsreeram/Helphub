import "dotenv/config";

if (!process.env.VERCEL) {
  process.exit(0);
}

const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    `Missing required production environment variables: ${missing.join(", ")}`,
  );
}

const databaseUrl = process.env.DATABASE_URL;
const databaseHost = new URL(databaseUrl).hostname;

if (["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error(
    "DATABASE_URL points to a local database. Configure a hosted PostgreSQL URL before deploying to Vercel.",
  );
}

console.log(
  `Production environment validated for database host ${databaseHost}`,
);
