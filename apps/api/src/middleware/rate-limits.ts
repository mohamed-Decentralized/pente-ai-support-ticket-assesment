import rateLimit from 'express-rate-limit';

const response = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
};

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: response,
  skip: () => process.env.NODE_ENV === 'test',
});

export const publicLookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: response,
  skip: () => process.env.NODE_ENV === 'test',
});

export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: response,
  skip: () => process.env.NODE_ENV === 'test',
});
