import rateLimit from 'express-rate-limit';

const jsonHandler = (message: string) => (req: any, res: any) => {
  res.status(429).json({ success: false, errorCode: 'TOO_MANY_REQUESTS', message });
};

// A phone number can only trigger so many OTPs before it's spam, and an
// attacker guessing a 6-digit OTP needs far more than a handful of tries —
// both are capped per IP so one abusive client can't hammer the endpoint,
// independent of whichever phone number it targets.
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many OTP requests. Please try again in a few minutes.')
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many attempts. Please try again in a few minutes.')
});

// Admin/staff login — slows down credential stuffing / brute force without
// getting in the way of a real admin who mistypes a password a couple times.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many login attempts. Please try again in a few minutes.')
});
