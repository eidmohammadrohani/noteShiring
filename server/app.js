import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase } from './database.js';
import { ApiError } from './errors.js';
import { authRoutes } from './auth-routes.js';
import { noteRoutes } from './note-routes.js';
import { userRoutes } from './user-routes.js';

const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function createApp(options = {}) {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const logger = options.logger || console;
  let sessionSecret = options.sessionSecret || process.env.SESSION_SECRET;
  if (
    sessionSecret &&
    /^(?:change[-_ ]?me|replace[-_ ]?(?:me|with)|your[-_ ]|example[-_ ])/i.test(sessionSecret)
  )
    throw new Error('Replace the example SESSION_SECRET with at least 32 random characters.');
  if (sessionSecret && sessionSecret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  if (!sessionSecret) {
    if (isProduction)
      throw new Error(
        'Set SESSION_SECRET to at least 32 random characters before starting in production.',
      );
    sessionSecret = randomBytes(32).toString('hex');
    logger.warn(
      'SESSION_SECRET is not set. Development sessions will expire when the backend restarts. Set it in .env to keep sessions.',
    );
  }
  const { client, db } = await connectDatabase(options);
  let store;
  try {
    store = MongoStore.create({
      clientPromise: Promise.resolve(client),
      dbName: db.databaseName,
      collectionName: 'sessions',
      ttl: SESSION_TTL_MS / 1000,
    });
    store.on('error', (error) => logger.error('MongoDB session storage failed:', error.message));
    const app = express();
    app.disable('x-powered-by');
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: { scriptSrc: ["'self'"], upgradeInsecureRequests: null },
        },
        strictTransportSecurity: isProduction ? undefined : false,
      }),
    );
    app.use('/api', (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    });
    app.use('/api', (req, _res, next) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // A cross-origin form cannot set this header; cross-origin JavaScript
        // requires a CORS preflight that this same-origin API does not allow.
        if (req.get('X-NoteHub-Request') !== '1')
          throw new ApiError(
            403,
            'FORBIDDEN',
            'Send this request through the NoteHub application.',
          );
        if (!req.is('application/json'))
          throw new ApiError(415, 'CONTENT_TYPE', 'Use application/json for API requests.');
      }
      next();
    });
    app.use('/api', express.json({ limit: '3mb', strict: true }));
    app.use('/api', (req, _res, next) => {
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
        (!req.body || Array.isArray(req.body) || typeof req.body !== 'object')
      ) {
        throw new ApiError(400, 'VALIDATION', 'Send a JSON object.');
      }
      next();
    });
    app.use(
      '/api',
      session({
        name: 'notehub.sid',
        secret: sessionSecret,
        store,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: SESSION_TTL_MS,
          path: '/',
        },
      }),
    );
    app.use('/api', async (req, res, next) => {
      req.user = null;
      if (req.session.userId) {
        const user = await db.collection('users').findOne({
          id: req.session.userId,
          status: 'active',
          credentialVersion: req.session.credentialVersion,
        });
        if (user) req.user = user;
        else {
          await new Promise((resolve, reject) =>
            req.session.regenerate((error) => (error ? reject(error) : resolve())),
          );
          res.clearCookie('notehub.sid', { path: '/' });
        }
      }
      next();
    });
    const requireUser = (req, _res, next) => {
      if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
      next();
    };
    app.get('/api/health', async (_req, res) => {
      await db.command({ ping: 1 });
      res.json({ status: 'ok', database: 'connected' });
    });
    await authRoutes(app, db, { requireUser, isProduction, logger });
    noteRoutes(app, db, requireUser);
    userRoutes(app, db, requireUser);
    app.use('/api', (_req, _res, next) =>
      next(new ApiError(404, 'NOT_FOUND', 'API endpoint not found.')),
    );
    if (existsSync(path.join(distPath, 'index.html'))) {
      app.use(express.static(distPath));
      app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
    app.use((error, _req, res, _next) => {
      if (error.code === 11000) {
        const field = error.keyPattern?.email ? 'email' : 'studentId';
        return res.status(409).json({
          code: 'DUPLICATE',
          message: `An account with this ${field === 'email' ? 'email' : 'student ID'} already exists.`,
          details: { errors: { [field]: 'This value is already registered.' } },
        });
      }
      if (error instanceof ApiError)
        return res
          .status(error.status)
          .json({ code: error.code, message: error.message, details: error.details });
      if (error.type === 'entity.too.large')
        return res.status(413).json({
          code: 'TOO_LARGE',
          message: 'The request is too large. Attachments must be 1.5 MB or smaller.',
          details: {},
        });
      if (error.type === 'entity.parse.failed')
        return res
          .status(400)
          .json({ code: 'VALIDATION', message: 'Invalid JSON request.', details: {} });
      logger.error('NoteHub API error:', error);
      const databaseUnavailable = String(error.name || '').startsWith('Mongo');
      res.status(databaseUnavailable ? 503 : 500).json({
        code: databaseUnavailable ? 'DATABASE_UNAVAILABLE' : 'SERVER_ERROR',
        message: databaseUnavailable
          ? 'MongoDB is unavailable. Check that the local MongoDB service is running.'
          : 'The server could not complete this request. Please try again.',
        details: {},
      });
    });
    return {
      app,
      client,
      db,
      close: async () => {
        await store.close();
        await client.close();
      },
    };
  } catch (error) {
    if (store) await store.close();
    await client.close();
    throw error;
  }
}
