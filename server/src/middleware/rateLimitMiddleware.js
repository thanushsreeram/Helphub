const createRateLimiter = ({ windowMs, maxRequests, message }) => {
  const requests = new Map();
  let lastPrunedAt = 0;

  const pruneExpiredEntries = (now) => {
    // Run occasionally instead of on every request, and keep this in-memory
    // fallback bounded so a stream of unique IPs cannot grow it forever.
    if (now - lastPrunedAt < windowMs && requests.size < 10000) return;

    for (const [key, timestamps] of requests) {
      const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);
      if (recent.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, recent);
      }
    }

    while (requests.size > 10000) {
      requests.delete(requests.keys().next().value);
    }
    lastPrunedAt = now;
  };

  return (req, res, next) => {
    const now = Date.now();
    pruneExpiredEntries(now);
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const recentRequests = (requests.get(key) || []).filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ success: false, message });
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);
    return next();
  };
};

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === "production" ? 100 : 500,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const registrationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === "production" ? 100 : 500,
  message: "Too many registration attempts. Please try again later.",
});
