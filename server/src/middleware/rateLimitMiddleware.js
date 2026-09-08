const createRateLimiter = ({ windowMs, maxRequests, message }) => {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
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
