const requestBuckets = new Map();

export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
};

export const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 250 } = {}) => {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'anonymous';
    const normalizedKey = key.replace('::ffff:', '');
    if (process.env.NODE_ENV !== 'production' && ['::1', '127.0.0.1', 'localhost'].includes(normalizedKey)) {
      return next();
    }

    const now = Date.now();
    const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    requestBuckets.set(key, bucket);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    next();
  };
};
