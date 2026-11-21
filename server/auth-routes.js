import { createHash, randomInt, randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { ApiError, invalid } from './errors.js';
import { createUser, publicUser } from './domain.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { isValidEmail, validateLogin, validateNewPassword } from '../src/utils/validation.js';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const regenerate = (req) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
export const destroySession = (req) =>
  new Promise((resolve, reject) =>
    req.session.destroy((error) => (error ? reject(error) : resolve())),
  );
const saveSession = (req) =>
  new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );

export async function authRoutes(app, db, { requireUser, isProduction, logger }) {
  const dummyHash = await hashPassword(randomUUID());
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        code: 'RATE_LIMIT',
        message: 'Too many account requests. Try again in 15 minutes.',
        details: {},
      }),
  });
  app.use('/api/auth', limiter);

  app.post('/api/auth/register', async (req, res) => {
    const user = await createUser(db, req.body);
    res.status(201).json(user);
  });

  app.post('/api/auth/login', async (req, res) => {
    invalid(validateLogin(req.body));
    if (
      typeof req.body.identifier !== 'string' ||
      typeof req.body.password !== 'string' ||
      req.body.identifier.length > 200 ||
      req.body.password.length > 128
    ) {
      throw new ApiError(400, 'VALIDATION', 'Invalid email/ID or password.');
    }
    const identifier = req.body.identifier.trim().toLowerCase();
    const attemptId = digest(identifier);
    const attempts = db.collection('loginAttempts');
    const previous = await attempts.findOne({ _id: attemptId, expiresAt: { $gt: new Date() } });
    if (previous?.count >= 5)
      throw new ApiError(429, 'RATE_LIMIT', 'Too many attempts. Try again in 15 minutes.');
    const user = await db
      .collection('users')
      .findOne({ $or: [{ email: identifier }, { studentIdKey: identifier }] });
    const valid = await verifyPassword(req.body.password, user?.passwordHash || dummyHash);
    if (!user || !valid) {
      // Expiry is checked explicitly, because MongoDB TTL deletion is asynchronous.
      await attempts.updateOne(
        { _id: attemptId },
        [
          {
            $set: {
              count: { $cond: [{ $gt: ['$expiresAt', new Date()] }, { $add: ['$count', 1] }, 1] },
              expiresAt: {
                $cond: [
                  { $gt: ['$expiresAt', new Date()] },
                  '$expiresAt',
                  new Date(Date.now() + 15 * 60000),
                ],
              },
            },
          },
        ],
        { upsert: true },
      );
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email/ID or password.');
    }
    if (user.status !== 'active')
      throw new ApiError(403, 'BLOCKED', 'This account has been blocked by an administrator.');
    await attempts.deleteOne({ _id: attemptId });
    await regenerate(req);
    req.session.userId = user.id;
    req.session.credentialVersion = user.credentialVersion;
    await saveSession(req);
    res.json(publicUser(user));
  });

  app.post('/api/auth/logout', async (req, res) => {
    await destroySession(req);
    res.clearCookie('notehub.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    });
    res.json({ ok: true });
  });

  app.post('/api/auth/password', requireUser, async (req, res) => {
    const { currentPassword, newPassword, confirm } = req.body;
    if (!(await verifyPassword(currentPassword, req.user.passwordHash))) {
      throw new ApiError(400, 'INVALID_CREDENTIALS', 'Your current password is incorrect.', {
        errors: { currentPassword: 'Incorrect password.' },
      });
    }
    const problem =
      typeof newPassword === 'string'
        ? validateNewPassword(newPassword, confirm)
        : 'Enter a valid password.';
    if (problem) invalid({ newPassword: problem });
    await db.collection('users').updateOne(
      { id: req.user.id },
      {
        $set: { passwordHash: await hashPassword(newPassword), credentialVersion: randomUUID() },
      },
    );
    await db.collection('passwordResets').deleteOne({ email: req.user.email });
    await destroySession(req);
    res.clearCookie('notehub.sid', { path: '/' });
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    if (isProduction)
      throw new ApiError(
        503,
        'EMAIL_UNAVAILABLE',
        'Password reset email delivery has not been configured. Contact your administrator.',
      );
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email) || email.length > 200)
      invalid({ email: 'Enter a valid email address.' });
    const user = await db.collection('users').findOne({ email, status: 'active' });
    if (user) {
      const code = String(randomInt(100000, 1000000));
      await db.collection('passwordResets').updateOne(
        { email },
        {
          $set: {
            codeHash: digest(code),
            credentialVersion: user.credentialVersion,
            attempts: 0,
            expiresAt: new Date(Date.now() + 15 * 60000),
          },
        },
        { upsert: true },
      );
      logger.info(`[NoteHub password reset] ${email}: ${code} (expires in 15 minutes)`);
    }
    res.json({ ok: true });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    if (isProduction)
      throw new ApiError(
        503,
        'EMAIL_UNAVAILABLE',
        'Password reset email delivery has not been configured. Contact your administrator.',
      );
    const { newPassword, confirm } = req.body;
    const problem =
      typeof newPassword === 'string'
        ? validateNewPassword(newPassword, confirm)
        : 'Enter a valid password.';
    if (problem) invalid({ password: problem });
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const resets = db.collection('passwordResets');
    const reset = await resets.findOneAndUpdate(
      { email, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!reset || !/^\d{6}$/.test(code) || reset.codeHash !== digest(code)) {
      throw new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired.', {
        errors: { code: 'That code is invalid or has expired.' },
      });
    }
    const consumed = await resets.findOneAndDelete({ _id: reset._id, codeHash: reset.codeHash });
    if (!consumed) throw new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired.');
    const updated = await db.collection('users').updateOne(
      { email, status: 'active', credentialVersion: reset.credentialVersion },
      {
        $set: { passwordHash: await hashPassword(newPassword), credentialVersion: randomUUID() },
      },
    );
    if (!updated.matchedCount)
      throw new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired.');
    await db.collection('loginAttempts').deleteOne({ _id: digest(email) });
    res.json({ ok: true });
  });
}
