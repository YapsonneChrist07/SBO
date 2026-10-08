const { rateLimit } = require('express-rate-limit');

// Per-IP limits on the public auth endpoints that can be abused (password guessing,
// mass sign-ups, flooding someone's inbox with reset emails). Counters live in memory,
// so they reset when the server restarts — fine for a single instance.

const MINUTE = 60 * 1000;

// Off during tests (they log in hundreds of times), except in the rate-limit tests.
const skipInTests = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TESTS !== '1';

const limiter = (windowMs, limit, message, extra = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message },
  ...extra,
});

module.exports = {
  // Only failed attempts count, so a user who logs in normally is never blocked.
  login: limiter(15 * MINUTE, 10, 'Trop de tentatives de connexion. Réessayez dans 15 minutes.', { skipSuccessfulRequests: true }),
  register: limiter(60 * MINUTE, 10, 'Trop de comptes créés depuis cette adresse. Réessayez plus tard.'),
  forgotPassword: limiter(60 * MINUTE, 5, 'Trop de demandes de réinitialisation. Réessayez dans une heure.'),
  resetPassword: limiter(15 * MINUTE, 10, 'Trop de tentatives. Réessayez dans 15 minutes.'),
};
