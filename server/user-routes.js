import { randomUUID } from 'node:crypto';
import { ApiError, invalid, notFound } from './errors.js';
import { deleteUserData, directoryUser, profileFields, publicUser, visibility } from './domain.js';
import { destroySession } from './auth-routes.js';

export function userRoutes(app, db, requireUser) {
  app.get('/api/state', async (req, res) => {
    if (!req.user)
      return res.json({
        user: null,
        users: [],
        notes: [],
        comments: [],
        notifications: [],
        favoriteIds: [],
      });
    const notes = await db
      .collection('notes')
      .find(visibility(req.user), { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    const [users, comments, notifications, favorites] = await Promise.all([
      db.collection('users').find().toArray(),
      db
        .collection('comments')
        .find({ noteId: { $in: notes.map((note) => note.id) } }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection('notifications')
        .find({ userId: req.user.id }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),
      db.collection('favorites').findOne({ userId: req.user.id }),
    ]);
    res.json({
      user: publicUser(req.user),
      notes,
      comments,
      notifications,
      users: users.map((user) =>
        req.user.role === 'admin' || user.id === req.user.id
          ? publicUser(user)
          : directoryUser(user),
      ),
      favoriteIds: (favorites?.favoriteIds || []).filter((noteId) =>
        notes.some((note) => note.id === noteId),
      ),
    });
  });

  app.patch('/api/users/me', requireUser, async (req, res) => {
    const next = await db
      .collection('users')
      .findOneAndUpdate(
        { id: req.user.id },
        { $set: profileFields(req.body) },
        { returnDocument: 'after' },
      );
    if (!next) notFound('Account not found.');
    res.json(publicUser(next));
  });

  app.delete('/api/users/me', requireUser, async (req, res) => {
    if (req.user.role === 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Administrator accounts cannot be deleted here.');
    await deleteUserData(db, req.user.id);
    await destroySession(req);
    res.clearCookie('notehub.sid', { path: '/' });
    res.json({ ok: true });
  });

  const manageable = async (req) => {
    if (req.user.role !== 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Only administrators can do that.');
    const user = await db.collection('users').findOne({ id: req.params.id });
    if (!user) notFound('Account not found.');
    if (user.role === 'admin')
      throw new ApiError(
        403,
        'FORBIDDEN',
        'Administrator accounts cannot be blocked or deleted here.',
      );
    return user;
  };

  app.patch('/api/admin/users/:id', requireUser, async (req, res) => {
    await manageable(req);
    if (typeof req.body.blocked !== 'boolean')
      invalid({ blocked: 'Choose whether to block this account.' });
    const user = await db.collection('users').findOneAndUpdate(
      { id: req.params.id, role: { $ne: 'admin' } },
      {
        $set: {
          status: req.body.blocked ? 'blocked' : 'active',
          credentialVersion: randomUUID(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!user) notFound();
    res.json(publicUser(user));
  });

  app.delete('/api/admin/users/:id', requireUser, async (req, res) => {
    await manageable(req);
    await deleteUserData(db, req.params.id);
    res.json({ ok: true });
  });

  app.patch('/api/notifications/:id', requireUser, async (req, res) => {
    if (req.body.read !== true) invalid({ read: 'Notifications can only be marked as read.' });
    const result = await db
      .collection('notifications')
      .updateOne({ id: req.params.id, userId: req.user.id }, { $set: { read: true } });
    if (!result.matchedCount) notFound('Notification not found.');
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', requireUser, async (req, res) => {
    await db
      .collection('notifications')
      .updateMany({ userId: req.user.id }, { $set: { read: true } });
    res.json({ ok: true });
  });
}
