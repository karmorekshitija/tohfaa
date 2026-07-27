const rateLimiters = {};

function rateLimit(limit = 60, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    if (!rateLimiters[key]) {
      rateLimiters[key] = [];
    }

    // Filter timestamps within current window
    rateLimiters[key] = rateLimiters[key].filter(timestamp => now - timestamp < windowMs);

    if (rateLimiters[key].length >= limit) {
      return res.status(429).json({
        error: true,
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    rateLimiters[key].push(now);
    next();
  };
}

module.exports = {
  rateLimit
};
