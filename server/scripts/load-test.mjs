const baseUrl = (
  process.env.LOAD_TEST_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_SECONDS || 60);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 100);
const thinkTimeMs = Number(process.env.LOAD_TEST_THINK_TIME_MS || 1250);
const email = process.env.LOAD_TEST_EMAIL;
const password = process.env.LOAD_TEST_PASSWORD;

if (!Number.isInteger(durationSeconds) || durationSeconds < 1) {
  throw new Error("LOAD_TEST_DURATION_SECONDS must be a positive integer");
}

if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("LOAD_TEST_CONCURRENCY must be a positive integer");
}

if (!Number.isInteger(thinkTimeMs) || thinkTimeMs < 0) {
  throw new Error("LOAD_TEST_THINK_TIME_MS must be a non-negative integer");
}

const requestTimeoutMs = 10000;
const latencies = [];
let requests = 0;
let errors = 0;
let timeouts = 0;
let token = process.env.LOAD_TEST_TOKEN || "";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const latency = performance.now() - started;
    latencies.push(latency);
    requests += 1;

    if (!response.ok) {
      errors += 1;
    }

    return response;
  } catch (error) {
    requests += 1;
    errors += 1;
    if (error.name === "AbortError") {
      timeouts += 1;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function authenticate() {
  if (token || !email || !password) return;

  const response = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!response || !response.ok) {
    throw new Error(
      "Load-test login failed; provide a valid token or credentials",
    );
  }

  const data = await response.json();
  token = data.token || "";
  if (!token) {
    throw new Error("Load-test login response did not contain a token");
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
}

await authenticate();

const startedAt = Date.now();
const endsAt = startedAt + durationSeconds * 1000;
const publicScenario = ["/api/health", "/api/services"];
const protectedScenario = ["/api/bookings", "/api/services"];
const scenario = token ? protectedScenario : publicScenario;

async function worker(workerId) {
  let requestIndex = workerId;
  while (Date.now() < endsAt) {
    const path = scenario[requestIndex % scenario.length];
    await request(path);
    requestIndex += concurrency;
    if (thinkTimeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, thinkTimeMs));
    }
  }
}

await Promise.all(
  Array.from({ length: concurrency }, (_, index) => worker(index)),
);

const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
const report = {
  baseUrl,
  durationSeconds: Math.round(elapsedSeconds * 100) / 100,
  concurrency,
  thinkTimeMs,
  scenario,
  authenticated: Boolean(token),
  totalRequests: requests,
  requestsPerSecond: Math.round((requests / elapsedSeconds) * 100) / 100,
  averageLatencyMs: latencies.length
    ? Math.round(
        (latencies.reduce((sum, value) => sum + value, 0) / latencies.length) *
          100,
      ) / 100
    : 0,
  p50LatencyMs: Math.round(percentile(latencies, 50) * 100) / 100,
  p95LatencyMs: Math.round(percentile(latencies, 95) * 100) / 100,
  p99LatencyMs: Math.round(percentile(latencies, 99) * 100) / 100,
  errors,
  timeouts,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = errors === 0 ? 0 : 1;
