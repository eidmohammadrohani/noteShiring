import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../server/app.js';

const password = 'TestPassword@123';
const registration = (label, overrides = {}) => ({
  fullName: `Test ${label}`,
  studentId: `TEST-${label}`,
  email: `${label}@notehub.test`,
  phone: '+93 700 000 000',
  university: 'Test University',
  faculty: 'Business',
  department: 'Economics',
  semester: '2',
  password,
  confirmPassword: password,
  ...overrides,
});

test(
  'MongoDB-backed API persists data and enforces server permissions',
  { timeout: 90000 },
  async (t) => {
    // The database is created for this run. The user's notehub database is never cleared.
    const dbName = `notehub_test_${randomUUID().replaceAll('-', '')}`;
    assert.match(dbName, /^notehub_test_[a-f0-9]{32}$/);
    const messages = [];
    const options = {
      mongoUri: process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017',
      dbName,
      sessionSecret: 'integration-test-secret-at-least-thirty-two-characters',
      isProduction: false,
      logger: { info: (message) => messages.push(String(message)), warn() {}, error() {} },
    };
    let context;
    let listener;
    let baseUrl;

    async function start() {
      context = await createApp(options);
      listener = await new Promise((resolve, reject) => {
        const server = context.app.listen(0, '127.0.0.1', () => resolve(server));
        server.on('error', reject);
      });
      baseUrl = `http://127.0.0.1:${listener.address().port}/api`;
    }

    async function stop() {
      if (listener) {
        await new Promise((resolve, reject) =>
          listener.close((error) => (error ? reject(error) : resolve())),
        );
        listener = null;
      }
      if (context) await context.close();
    }

    function browser() {
      let cookie = '';
      return {
        async request(path, { method = 'GET', body, headers = {} } = {}) {
          const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
              ...(cookie ? { Cookie: cookie } : {}),
              ...(method !== 'GET'
                ? { 'Content-Type': 'application/json', 'X-NoteHub-Request': '1' }
                : {}),
              ...headers,
            },
            ...(method !== 'GET' ? { body: JSON.stringify(body ?? {}) } : {}),
          });
          // Login after a stale cookie may both expire the old cookie and set a new one.
          // Browsers apply Set-Cookie headers in order; preserve that behavior here.
          for (const setCookie of response.headers.getSetCookie()) cookie = setCookie.split(';')[0];
          return {
            status: response.status,
            body: await response.json(),
            headers: response.headers,
          };
        },
        async state() {
          const result = await this.request('/state');
          assert.equal(result.status, 200);
          return result.body;
        },
      };
    }

    const owner = browser();
    const reader = browser();
    const admin = browser();
    const anonymous = browser();
    let ownerAccount;
    let readerAccount;
    let adminAccount;
    let note;

    try {
      await start();

      await t.test(
        'health reports a real database connection and anonymous writes are denied',
        async () => {
          const health = await anonymous.request('/health');
          assert.equal(health.status, 200);
          assert.equal(health.body.database, 'connected');
          const state = await anonymous.state();
          assert.equal(state.user, null);
          assert.deepEqual(state.notes, []);
          const denied = await anonymous.request('/notes', {
            method: 'POST',
            body: { title: 'No', content: 'No' },
          });
          assert.equal(denied.status, 401);
          const missingHeader = await anonymous.request('/auth/register', {
            method: 'POST',
            body: registration('csrf'),
            headers: { 'X-NoteHub-Request': '' },
          });
          assert.equal(missingHeader.status, 403);
        },
      );

      await t.test(
        'registration validates, ignores forged roles, and prevents duplicate accounts',
        async () => {
          const invalid = await owner.request('/auth/register', { method: 'POST', body: {} });
          assert.equal(invalid.status, 400);
          assert.ok(invalid.body.details.errors.email);
          const created = await owner.request('/auth/register', {
            method: 'POST',
            body: registration('owner', { role: 'admin' }),
          });
          assert.ok([200, 201].includes(created.status));
          ownerAccount = created.body;
          assert.equal(ownerAccount.role, 'user');
          assert.equal((await owner.state()).user, null);
          const duplicateEmail = await owner.request('/auth/register', {
            method: 'POST',
            body: registration('different', { email: ownerAccount.email }),
          });
          assert.equal(duplicateEmail.status, 409);
          const duplicateId = await owner.request('/auth/register', {
            method: 'POST',
            body: registration('different', { studentId: ownerAccount.studentId.toLowerCase() }),
          });
          assert.equal(duplicateId.status, 409);
          readerAccount = (
            await reader.request('/auth/register', { method: 'POST', body: registration('reader') })
          ).body;
          adminAccount = (
            await admin.request('/auth/register', { method: 'POST', body: registration('admin') })
          ).body;
          await context.db
            .collection('users')
            .updateOne({ id: adminAccount.id }, { $set: { role: 'admin' } });
        },
      );

      await t.test(
        'login issues an HttpOnly cookie and never exposes password material',
        async () => {
          const rejected = await owner.request('/auth/login', {
            method: 'POST',
            body: { identifier: ownerAccount.email, password: 'incorrect-password' },
          });
          assert.equal(rejected.status, 401);
          const signedIn = await owner.request('/auth/login', {
            method: 'POST',
            body: { identifier: ownerAccount.email, password },
          });
          assert.equal(signedIn.status, 200);
          assert.match(signedIn.headers.get('set-cookie'), /HttpOnly/i);
          assert.match(signedIn.headers.get('set-cookie'), /SameSite=/i);
          await reader.request('/auth/login', {
            method: 'POST',
            body: { identifier: readerAccount.studentId, password },
          });
          await admin.request('/auth/login', {
            method: 'POST',
            body: { identifier: adminAccount.email, password },
          });
          const state = await owner.state();
          assert.equal(state.user.id, ownerAccount.id);
          assert.doesNotMatch(
            JSON.stringify(state),
            /passwordHash|credentialVersion|salt|TestPassword@123/,
          );
          const other = state.users.find((user) => user.id === readerAccount.id);
          assert.equal(other.email, undefined);
          assert.equal(other.phone, undefined);
          const stored = await context.db.collection('users').findOne({ id: ownerAccount.id });
          assert.notEqual(stored.passwordHash, password);
          assert.ok(stored.passwordHash.length > 32);
        },
      );

      await t.test(
        'notes save in MongoDB and reject forged owners and unsafe attachments',
        async () => {
          const created = await owner.request('/notes', {
            method: 'POST',
            body: {
              title: 'Persistent database notes',
              content: 'Stored by the API',
              subject: 'Economics',
              ownerId: readerAccount.id,
              ownerName: 'Forged author',
              likedBy: [readerAccount.id],
              file: {
                name: 'notes.txt',
                size: 5,
                type: 'text/plain',
                dataUrl: 'data:text/plain;base64,aGVsbG8=',
              },
            },
          });
          assert.ok([200, 201].includes(created.status));
          note = created.body;
          assert.equal(note.ownerId, ownerAccount.id);
          assert.deepEqual(note.likedBy, []);
          assert.equal(
            (await context.db.collection('notes').findOne({ id: note.id })).content,
            'Stored by the API',
          );
          const forged = await reader.request(`/notes/${note.id}`, {
            method: 'PATCH',
            body: { title: 'Stolen', role: 'admin', ownerId: readerAccount.id },
          });
          assert.ok([403, 404].includes(forged.status));
          assert.equal(
            (await context.db.collection('notes').findOne({ id: note.id })).title,
            note.title,
          );
          const invalid = await owner.request('/notes', {
            method: 'POST',
            body: {
              title: 'Unsafe',
              content: 'x',
              file: { name: 'bad.pdf', size: 1, dataUrl: 'data:text/html;base64,QQ==' },
            },
          });
          assert.equal(invalid.status, 400);
          const updated = await owner.request(`/notes/${note.id}`, {
            method: 'PATCH',
            body: { title: 'Updated database notes', ownerId: readerAccount.id },
          });
          assert.equal(updated.status, 200);
          assert.equal(updated.body.ownerId, ownerAccount.id);
          note = updated.body;
        },
      );

      await t.test(
        'comments, favorites, likes, notifications and concurrent downloads persist',
        async () => {
          const favorited = await reader.request(`/notes/${note.id}/favorite`, { method: 'POST' });
          assert.equal(favorited.body.favorited, true);
          const liked = await reader.request(`/notes/${note.id}/like`, { method: 'POST' });
          assert.equal(liked.body.liked, true);
          const comment = await reader.request('/comments', {
            method: 'POST',
            body: { noteId: note.id, text: 'A useful explanation.', userId: ownerAccount.id },
          });
          assert.ok([200, 201].includes(comment.status));
          assert.equal(comment.body.userId, readerAccount.id);
          const badDelete = await owner.request(`/comments/${comment.body.id}`, {
            method: 'DELETE',
          });
          assert.ok([403, 404].includes(badDelete.status));
          assert.ok(await context.db.collection('comments').findOne({ id: comment.body.id }));
          const badReply = await reader.request(`/comments/${comment.body.id}/replies`, {
            method: 'POST',
            body: { text: 'Forged admin reply', role: 'admin' },
          });
          assert.equal(badReply.status, 403);
          const reply = await admin.request(`/comments/${comment.body.id}/replies`, {
            method: 'POST',
            body: { text: 'Thank you for sharing.' },
          });
          assert.ok([200, 201].includes(reply.status));
          const downloads = await Promise.all(
            Array.from({ length: 5 }, () =>
              reader.request(`/notes/${note.id}/download`, { method: 'POST' }),
            ),
          );
          downloads.forEach((result) => assert.equal(result.status, 200));
          const state = await owner.state();
          assert.equal(state.notes.find((item) => item.id === note.id).downloads.length, 5);
          assert.ok(state.notifications.length >= 2);
          const readerState = await reader.state();
          assert.ok(readerState.favoriteIds.includes(note.id));
          assert.equal(
            readerState.comments.find((item) => item.id === comment.body.id).replies.length,
            1,
          );
          const foreignNotification = await reader.request(
            `/notifications/${state.notifications[0].id}`,
            { method: 'PATCH', body: { read: true } },
          );
          assert.ok([403, 404].includes(foreignNotification.status));
          assert.equal(
            (await owner.request('/notifications/read-all', { method: 'POST' })).status,
            200,
          );
          assert.ok((await owner.state()).notifications.every((item) => item.read));
        },
      );

      await t.test('archived notes and their comments are hidden from other students', async () => {
        assert.equal(
          (
            await owner.request(`/notes/${note.id}/archive`, {
              method: 'PUT',
              body: { archived: true },
            })
          ).status,
          200,
        );
        const hidden = await reader.state();
        assert.ok(!hidden.notes.some((item) => item.id === note.id));
        assert.ok(!hidden.comments.some((item) => item.noteId === note.id));
        assert.ok((await owner.state()).notes.find((item) => item.id === note.id).archived);
        assert.notEqual(
          (await reader.request(`/notes/${note.id}/download`, { method: 'POST' })).status,
          200,
        );
        assert.equal(
          (
            await owner.request(`/notes/${note.id}/archive`, {
              method: 'PUT',
              body: { archived: false },
            })
          ).status,
          200,
        );
        assert.ok((await reader.state()).favoriteIds.includes(note.id));
      });

      await t.test('data and login sessions survive a backend restart', async () => {
        await stop();
        await start();
        const state = await owner.state();
        assert.equal(state.user.id, ownerAccount.id);
        assert.equal(
          state.notes.find((item) => item.id === note.id).title,
          'Updated database notes',
        );
        assert.ok((await reader.state()).favoriteIds.includes(note.id));
      });

      await t.test('password changes revoke existing sessions and old passwords', async () => {
        const secondSession = browser();
        const revokedSession = browser();
        await secondSession.request('/auth/login', {
          method: 'POST',
          body: { identifier: ownerAccount.email, password },
        });
        await revokedSession.request('/auth/login', {
          method: 'POST',
          body: { identifier: ownerAccount.email, password },
        });
        const changed = await owner.request('/auth/password', {
          method: 'POST',
          body: {
            currentPassword: password,
            newPassword: 'ChangedPassword@123',
            confirm: 'ChangedPassword@123',
          },
        });
        assert.equal(changed.status, 200);
        // Re-login directly with a stale session cookie, without first requesting /state.
        assert.equal(
          (
            await secondSession.request('/auth/login', {
              method: 'POST',
              body: { identifier: ownerAccount.email, password: 'ChangedPassword@123' },
            })
          ).status,
          200,
        );
        assert.equal((await owner.state()).user, null);
        assert.equal((await revokedSession.state()).user, null);
        assert.equal((await secondSession.state()).user.id, ownerAccount.id);
        assert.equal(
          (
            await owner.request('/auth/login', {
              method: 'POST',
              body: { identifier: ownerAccount.email, password },
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await owner.request('/auth/login', {
              method: 'POST',
              body: { identifier: ownerAccount.email, password: 'ChangedPassword@123' },
            })
          ).status,
          200,
        );
      });

      await t.test(
        'reset codes stay out of responses, are single-use and revoke sessions',
        async () => {
          const issued = await reader.request('/auth/forgot-password', {
            method: 'POST',
            body: { email: readerAccount.email },
          });
          const unknown = await anonymous.request('/auth/forgot-password', {
            method: 'POST',
            body: { email: 'unknown@notehub.test' },
          });
          assert.deepEqual(issued.body, unknown.body);
          const output = messages.findLast((message) => message.includes(readerAccount.email));
          const code = output?.match(/: (\d{6}) /)?.[1];
          assert.ok(code, 'Development reset code is delivered through the server logger');
          assert.ok(!JSON.stringify(issued.body).includes(code));
          const body = {
            email: readerAccount.email,
            code,
            newPassword: 'ResetPassword@123',
            confirm: 'ResetPassword@123',
          };
          assert.equal(
            (await reader.request('/auth/reset-password', { method: 'POST', body })).status,
            200,
          );
          assert.equal((await reader.state()).user, null);
          assert.notEqual(
            (await reader.request('/auth/reset-password', { method: 'POST', body })).status,
            200,
          );
          assert.equal(
            (
              await reader.request('/auth/login', {
                method: 'POST',
                body: { identifier: readerAccount.email, password: 'ResetPassword@123' },
              })
            ).status,
            200,
          );
          await reader.request('/auth/forgot-password', {
            method: 'POST',
            body: { email: readerAccount.email },
          });
          const nextOutput = messages.findLast((message) => message.includes(readerAccount.email));
          const nextCode = nextOutput.match(/: (\d{6}) /)[1];
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const rejected = await reader.request('/auth/reset-password', {
              method: 'POST',
              body: { ...body, code: '000000' },
            });
            assert.notEqual(rejected.status, 200);
          }
          assert.notEqual(
            (
              await reader.request('/auth/reset-password', {
                method: 'POST',
                body: { ...body, code: nextCode },
              })
            ).status,
            200,
          );
        },
      );

      await t.test(
        'five failed logins lock the identifier even when the next password is correct',
        async () => {
          const locked = browser();
          const account = registration('locked');
          await locked.request('/auth/register', { method: 'POST', body: account });
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const rejected = await locked.request('/auth/login', {
              method: 'POST',
              body: { identifier: account.email, password: 'IncorrectPassword' },
            });
            assert.ok([401, 429].includes(rejected.status));
          }
          const limited = await locked.request('/auth/login', {
            method: 'POST',
            body: { identifier: account.email, password },
          });
          assert.equal(limited.status, 429);
        },
      );

      await t.test(
        'admin blocking revokes sessions and account deletion cleans related data',
        async () => {
          assert.equal(
            (
              await reader.request(`/admin/users/${ownerAccount.id}`, {
                method: 'PATCH',
                body: { blocked: true },
              })
            ).status,
            403,
          );
          assert.equal(
            (await admin.request(`/admin/users/${adminAccount.id}`, { method: 'DELETE' })).status,
            403,
          );
          assert.equal(
            (
              await admin.request(`/admin/users/${readerAccount.id}`, {
                method: 'PATCH',
                body: { blocked: true },
              })
            ).status,
            200,
          );
          assert.equal((await reader.state()).user, null);
          assert.notEqual(
            (
              await reader.request('/auth/login', {
                method: 'POST',
                body: { identifier: readerAccount.email, password: 'ResetPassword@123' },
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await admin.request(`/admin/users/${readerAccount.id}`, {
                method: 'PATCH',
                body: { blocked: false },
              })
            ).status,
            200,
          );
          assert.equal(
            (await admin.request(`/admin/users/${readerAccount.id}`, { method: 'DELETE' })).status,
            200,
          );
          const state = await admin.state();
          assert.ok(!state.users.some((item) => item.id === readerAccount.id));
          assert.ok(!state.comments.some((item) => item.userId === readerAccount.id));
          assert.ok(state.notes.every((item) => !item.likedBy.includes(readerAccount.id)));
          assert.equal(
            (await owner.request(`/notes/${note.id}`, { method: 'DELETE' })).status,
            200,
          );
          assert.ok(!(await owner.state()).comments.some((item) => item.noteId === note.id));
          assert.equal((await owner.request('/users/me', { method: 'DELETE' })).status, 200);
          assert.equal((await owner.state()).user, null);
        },
      );
    } finally {
      if (listener) {
        await new Promise((resolve) => listener.close(resolve));
        listener = null;
      }
      if (context) {
        assert.equal(context.db.databaseName, dbName);
        await context.db.dropDatabase();
        await context.close();
      }
    }
  },
);
