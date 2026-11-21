import { ApiError, invalid, notFound } from './errors.js';
import {
  clean,
  deleteNoteData,
  findNote,
  id,
  modification,
  noteFields,
  notify,
  timestamp,
  visibility,
  withoutMongoId,
} from './domain.js';
import { validateCommentText } from '../src/utils/validation.js';
import { nextTimestamp } from '../src/utils/dateUtils.js';

export function noteRoutes(app, db, requireUser) {
  const notes = db.collection('notes');
  const comments = db.collection('comments');
  app.post('/api/notes', requireUser, async (req, res) => {
    const now = timestamp();
    const note = {
      ...noteFields(req.body),
      id: id('note'),
      ownerId: req.user.id,
      ownerName: req.user.name,
      createdAt: now,
      updatedAt: now,
      archived: false,
      likedBy: [],
      downloads: [],
    };
    await notes.insertOne(note);
    res.status(201).json(withoutMongoId(note));
  });

  app.patch('/api/notes/:id', requireUser, async (req, res) => {
    const current = await findNote(db, req.params.id, req.user, true);
    const next = await notes.findOneAndUpdate(
      { id: current.id, ...modification(req.user) },
      { $set: { ...noteFields(req.body, current), updatedAt: nextTimestamp(current.updatedAt) } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!next) notFound();
    res.json(next);
  });

  app.delete('/api/notes/:id', requireUser, async (req, res) => {
    await findNote(db, req.params.id, req.user, true);
    await deleteNoteData(db, req.params.id);
    res.json({ ok: true });
  });

  app.put('/api/notes/:id/archive', requireUser, async (req, res) => {
    if (typeof req.body.archived !== 'boolean')
      invalid({ archived: 'Choose whether to archive this note.' });
    const note = await notes.findOneAndUpdate(
      { id: req.params.id, ...modification(req.user) },
      { $set: { archived: req.body.archived } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!note) notFound('This note is unavailable or you do not have permission to change it.');
    res.json(note);
  });

  app.post('/api/notes/:id/favorite', requireUser, async (req, res) => {
    const note = await findNote(db, req.params.id, req.user);
    const favorites = db.collection('favorites');
    if (note.archived) {
      const current = await favorites.findOne({ userId: req.user.id, favoriteIds: note.id });
      if (!current)
        throw new ApiError(400, 'ARCHIVED', 'Archived notes cannot be added to Favorites.');
    }
    const updated = await favorites.findOneAndUpdate(
      { userId: req.user.id },
      [
        {
          $set: {
            userId: req.user.id,
            favoriteIds: {
              $let: {
                vars: { current: { $ifNull: ['$favoriteIds', []] } },
                in: {
                  $cond: [
                    { $in: [note.id, '$$current'] },
                    { $setDifference: ['$$current', [note.id]] },
                    { $concatArrays: ['$$current', [note.id]] },
                  ],
                },
              },
            },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' },
    );
    res.json({ favorited: updated.favoriteIds.includes(note.id) });
  });

  app.post('/api/notes/:id/like', requireUser, async (req, res) => {
    const note = await notes.findOneAndUpdate(
      { id: req.params.id, archived: false },
      [
        {
          $set: {
            likedBy: {
              $cond: [
                { $in: [req.user.id, '$likedBy'] },
                { $setDifference: ['$likedBy', [req.user.id]] },
                { $concatArrays: ['$likedBy', [req.user.id]] },
              ],
            },
          },
        },
      ],
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!note) notFound('This note is unavailable or archived.');
    const liked = note.likedBy.includes(req.user.id);
    if (liked && note.ownerId !== req.user.id)
      await notify(db, note.ownerId, `${req.user.name} liked your note "${note.title}".`, note.id);
    res.json({ liked, count: note.likedBy.length });
  });

  app.post('/api/notes/:id/download', requireUser, async (req, res) => {
    const current = await findNote(db, req.params.id, req.user);
    const event = { userId: req.user.id, userName: req.user.name, at: timestamp() };
    const note = await notes.findOneAndUpdate(
      { id: current.id, ...visibility(req.user) },
      { $push: { downloads: event } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (!note) notFound();
    if (note.ownerId !== req.user.id)
      await notify(
        db,
        note.ownerId,
        `${req.user.name} downloaded your note "${note.title}".`,
        note.id,
      );
    res.json(note);
  });

  app.post('/api/comments', requireUser, async (req, res) => {
    if (typeof req.body.noteId !== 'string') invalid({ noteId: 'Choose an existing note.' });
    const problem = validateCommentText(req.body.text);
    if (typeof req.body.text !== 'string' || problem)
      invalid({ text: problem || 'Enter comment text.' });
    const note = await findNote(db, req.body.noteId, req.user);
    const comment = {
      id: id('cmt'),
      noteId: note.id,
      userId: req.user.id,
      userName: req.user.name,
      text: clean(req.body.text),
      createdAt: timestamp(),
      replies: [],
    };
    await comments.insertOne(comment);
    if (note.ownerId !== req.user.id)
      await notify(db, note.ownerId, `${req.user.name} commented on "${note.title}".`, note.id);
    res.status(201).json(withoutMongoId(comment));
  });

  app.delete('/api/comments/:id', requireUser, async (req, res) => {
    const comment = await comments.findOne({ id: req.params.id });
    if (!comment) notFound('This comment no longer exists.');
    if (req.user.role !== 'admin' && comment.userId !== req.user.id)
      throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own comments.');
    const query = {
      id: req.params.id,
      ...(req.user.role === 'admin' ? {} : { userId: req.user.id }),
    };
    const result = await comments.deleteOne(query);
    if (!result.deletedCount)
      notFound('This comment is unavailable or belongs to another account.');
    res.json({ ok: true });
  });

  app.post('/api/comments/:id/replies', requireUser, async (req, res) => {
    if (req.user.role !== 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Only administrators can reply to comments.');
    const problem = validateCommentText(req.body.text);
    if (typeof req.body.text !== 'string' || problem)
      invalid({ text: problem || 'Enter reply text.' });
    const reply = {
      id: id('rpl'),
      userId: req.user.id,
      userName: req.user.name,
      text: clean(req.body.text),
      createdAt: timestamp(),
    };
    const comment = await comments.findOneAndUpdate(
      { id: req.params.id },
      { $push: { replies: reply } },
      { returnDocument: 'after' },
    );
    if (!comment) notFound('This comment no longer exists.');
    if (comment.userId !== req.user.id)
      await notify(db, comment.userId, `${req.user.name} replied to your comment.`, comment.noteId);
    res.status(201).json(reply);
  });
}
