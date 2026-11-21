# NoteHub

A student notes sharing app built with React, Vite, Express and local MongoDB. Accounts, notes, attachments, comments, likes, favorites, downloads, notifications and login sessions are saved in MongoDB. The browser keeps only the theme preference in LocalStorage.

## Run locally

Requirements: Node.js 22.12+ and MongoDB Community Server running locally on port 27017. MongoDB Compass is optional; it is a database viewer, not the database server.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). This command starts both Vite and the backend. Vite forwards `/api` requests to `http://127.0.0.1:3001`.

On this machine, `.env` has already been created with a random session secret. For a new checkout, copy `.env.example` to `.env` and replace `SESSION_SECRET` with a random value. Generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

The default database connection is:

```text
mongodb://127.0.0.1:27017/notehub
```

Keep `.env` private. Database settings belong to the server and must never use a `VITE_` prefix. If you change the backend port, also update the proxy target in `vite.config.js`.

On Windows, if MongoDB is installed as a service, check it with `Get-Service MongoDB`. Start a stopped service from an administrator terminal with `Start-Service MongoDB`.

On macOS/Linux, use `npm` in place of `npm.cmd`. The `.cmd` commands avoid PowerShell execution policy errors on Windows.

## Accounts

Create a student account from **Register**, then log in. There are no automatic demo users or shared default passwords.

To create an administrator, run:

```powershell
npm.cmd run create-admin
```

Follow the terminal prompts. Administrator privileges are assigned by this local server tool; registration cannot choose a role.

Old browser data is left untouched and is not automatically imported as trusted accounts. Existing browser-only login sessions do not grant access to the backend.

## Commands

- `npm run dev`: backend with automatic restart plus Vite.
- `npm run dev:server`: backend only, default `http://127.0.0.1:3001`.
- `npm run dev:client`: Vite only.
- `npm run build`: build the frontend into `dist/`.
- `npm start`: run the backend and serve the built frontend at `http://127.0.0.1:3001` (build first).
- `npm run preview`: preview the frontend build; keep the backend running separately.
- `npm test`: run frontend tests and real MongoDB API tests.
- `npm run test:client`: run frontend tests only.
- `npm run test:server`: run MongoDB integration tests only.
- `npm run test:watch`: watch frontend tests.
- `npm run format:check`: check source formatting.

## Check MongoDB persistence

1. Start the app and register/log in.
2. Upload a note, then refresh the page or restart the backend. The note should remain.
3. In MongoDB Compass, connect with the URI above and open the `notehub` database. Accounts are in `users`; notes are in `notes`. Other collections hold comments, favorites, notifications and sessions.
4. Open `http://127.0.0.1:3001/api/health` to check the API and database connection.

The API does not fall back to browser storage when MongoDB is unavailable. Connection failures are shown in the app; failed saves show an error instead of a success message.

## Backend behavior

The server validates input and permissions for every write. It gets the acting user from the session, so a browser cannot select another owner or grant itself administrator privileges. Passwords use salted scrypt hashes. Session IDs use HttpOnly cookies; session records are stored in MongoDB and expire after eight hours. Password changes, blocked accounts and deleted accounts invalidate their sessions.

The frontend uses relative `/api` URLs with same-origin cookies and a custom request header for writes. Do not add permissive CORS. The backend has request limits, security headers and authentication rate limits.

Archived notes remain visible to their owner and administrators. Other students cannot fetch their content or comments. Deleting an account cleans up its notes, comments, replies, likes, favorites and notifications. Multi-collection cleanup on standalone MongoDB is not a transaction; use a replica set and transactions before relying on atomic account deletion in a production deployment.

Attachments retain the existing 1.5 MB limit and are saved inside note documents. This is suitable for the local app; larger deployments should use dedicated file storage and paginated endpoints.

**Password reset:** email delivery is not configured. In development, requesting a code prints it only in the backend terminal. Enter that code in the reset form. Codes expire and are limited to five guesses. This local recovery flow is disabled in production; configure email delivery before a public release.

The server binds to loopback by default. Public deployment also needs HTTPS with secure cookies, a strong private session secret, database authentication/backups and email delivery. Authentication rate limits are per server process.

## Project layout

- `server/`: Express app, MongoDB connection, authentication, domain operations and administrator setup.
- `src/services/`: API client and the UI's in-memory snapshot; no browser database.
- `src/hooks/useData.js`: shared subscriptions for notes, users, comments and current session.
- `src/features/`, `src/components/`: pages and shared interface components.
- `src/utils/`: validation, note queries, statistics, attachment handling and theme helpers.
- `src/test/`: frontend and pure utility tests.
- `tests/server/`: API tests against a temporary, isolated MongoDB database.
- `public/`, `docs/visual-assets.md`: active visual assets and their documentation.

The unused original HTML backup and browser demo implementation have been removed. `dist/` and `node_modules/` are generated by build/install commands.

## Tests and troubleshooting

Server tests require MongoDB. They create and remove their own randomly named `notehub_test_...` database and never reset the app's `notehub` database.

If the app cannot connect, check that MongoDB and the backend are running. A frontend started alone cannot save data. If the backend reports `EADDRINUSE`, stop the earlier backend process or choose another port and update the Vite proxy. A new database starts empty; use registration and the administrator command to create accounts.

API/library references: [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/connect/), [Express sessions](https://expressjs.com/en/resources/middleware/session/).
