import { randomUUID } from 'node:crypto';
import { ApiError, invalid, notFound } from './errors.js';
import { hashPassword } from './passwords.js';
import { FACULTIES, SEMESTERS, LIMITS } from '../src/utils/constants.js';
import {
  parseTags,
  sanitizeText,
  validateNoteInput,
  validateRegistration,
} from '../src/utils/validation.js';

export const id = (prefix) => `${prefix}_${randomUUID()}`;
export const timestamp = () => new Date().toISOString();
export const clean = (value) => sanitizeText(value).trim();
export const withoutMongoId = ({ _id, ...value }) => value;

export function publicUser(user) {
  if (!user) return null;
  const { _id, passwordHash, credentialVersion, studentIdKey, ...safe } = user;
  return safe;
}

export function directoryUser(user) {
  const { id, name, role, status, university, faculty, department, semester, createdAt } = user;
  return { id, name, role, status, university, faculty, department, semester, createdAt };
}

export async function createUser(db, input, role = 'user') {
  const fields = [
    'fullName',
    'studentId',
    'email',
    'phone',
    'university',
    'faculty',
    'department',
    'semester',
    'password',
    'confirmPassword',
  ];
  const values = Object.fromEntries(
    fields.map((field) => [field, typeof input[field] === 'string' ? input[field] : '']),
  );
  invalid(validateRegistration(values));
  if (Object.values(values).some((value) => value.length > 200)) {
    throw new ApiError(400, 'VALIDATION', 'Account fields must be 200 characters or fewer.');
  }
  const user = {
    id: id('usr'),
    name: clean(values.fullName),
    email: values.email.trim().toLowerCase(),
    studentId: values.studentId.trim(),
    studentIdKey: values.studentId.trim().toLowerCase(),
    phone: values.phone.trim(),
    university: clean(values.university),
    faculty: values.faculty,
    department: clean(values.department),
    semester: values.semester,
    bio: '',
    role,
    status: 'active',
    passwordHash: await hashPassword(values.password),
    credentialVersion: randomUUID(),
    createdAt: timestamp(),
  };
  await db.collection('users').insertOne(user);
  return publicUser(user);
}

export function profileFields(input) {
  const result = {};
  for (const key of ['name', 'phone', 'university', 'faculty', 'department', 'semester', 'bio']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > (key === 'bio' ? 1000 : 200)) {
      throw new ApiError(400, 'VALIDATION', `Invalid ${key}.`, {
        errors: { [key]: 'Enter a valid value.' },
      });
    }
    result[key] = clean(input[key]);
  }
  if ('name' in result && (!result.name || result.name.length > 80))
    invalid({ name: 'Enter a name with 1–80 characters.' });
  if ('faculty' in result && result.faculty && !FACULTIES.includes(result.faculty))
    invalid({ faculty: 'Select a valid faculty.' });
  if ('semester' in result && result.semester && !SEMESTERS.includes(result.semester))
    invalid({ semester: 'Select a valid semester.' });
  return result;
}

export function noteFields(input, current = {}) {
  const next = {
    title: '',
    content: '',
    subject: '',
    course: '',
    faculty: '',
    semester: '',
    tags: [],
    file: null,
    ...current,
  };
  for (const key of ['title', 'content', 'subject', 'course', 'faculty', 'semester']) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'string') invalid({ [key]: 'Enter a valid text value.' });
      next[key] = clean(input[key]);
    }
  }
  if (input.tags !== undefined) {
    if (!(
      typeof input.tags === 'string' ||
      (Array.isArray(input.tags) && input.tags.every((tag) => typeof tag === 'string'))
    ))
      invalid({ tags: 'Enter a list of tags.' });
    next.tags = parseTags(input.tags);
  }
  if (input.file !== undefined) {
    if (input.file === null) next.file = null;
    else if (typeof input.file !== 'object' || Array.isArray(input.file))
      invalid({ file: 'Invalid attachment.' });
    else {
      const { name, size, type, dataUrl } = input.file;
      next.file = {
        name,
        size,
        type: typeof type === 'string' ? type : 'application/octet-stream',
        dataUrl,
      };
    }
  }
  invalid(validateNoteInput(next));
  if (next.file) {
    const encoded = next.file.dataUrl.split(',')[1];
    const bytes = Buffer.from(encoded, 'base64');
    if (
      bytes.length !== next.file.size ||
      bytes.length > LIMITS.FILE_MAX_BYTES ||
      bytes.toString('base64') !== encoded ||
      next.file.name.length > 255
    ) {
      invalid({ file: 'Attachment size or encoding does not match its data.' });
    }
  }
  return Object.fromEntries(
    ['title', 'content', 'subject', 'course', 'faculty', 'semester', 'tags', 'file'].map((key) => [
      key,
      next[key],
    ]),
  );
}

export const visibility = (user) =>
  user.role === 'admin' ? {} : { $or: [{ archived: false }, { ownerId: user.id }] };
export const modification = (user) => (user.role === 'admin' ? {} : { ownerId: user.id });

export async function findNote(db, noteId, user, modify = false) {
  const note = await db.collection('notes').findOne({ id: noteId, ...visibility(user) });
  if (!note) notFound('This note is unavailable or you do not have permission to change it.');
  if (modify && user.role !== 'admin' && note.ownerId !== user.id)
    throw new ApiError(403, 'FORBIDDEN', 'You can only change your own notes.');
  return withoutMongoId(note);
}

export async function notify(db, userId, text, noteId) {
  await db
    .collection('notifications')
    .insertOne({ id: id('ntf'), userId, text, noteId, read: false, createdAt: timestamp() });
}

export async function deleteNoteData(db, noteId) {
  await db.collection('notes').deleteOne({ id: noteId });
  await Promise.all([
    db.collection('comments').deleteMany({ noteId }),
    db
      .collection('favorites')
      .updateMany({ favoriteIds: noteId }, { $pull: { favoriteIds: noteId } }),
    db.collection('notifications').deleteMany({ noteId }),
  ]);
}

// This works on a standalone local MongoDB. Each write is atomic; the cascade
// spans collections and does not claim transaction guarantees.
export async function deleteUserData(db, userId) {
  await db
    .collection('users')
    .updateOne({ id: userId }, { $set: { status: 'blocked', credentialVersion: randomUUID() } });
  const notes = await db
    .collection('notes')
    .find({ ownerId: userId }, { projection: { id: 1 } })
    .toArray();
  for (const note of notes) await deleteNoteData(db, note.id);
  await Promise.all([
    db.collection('comments').deleteMany({ userId }),
    db
      .collection('comments')
      .updateMany({ 'replies.userId': userId }, { $pull: { replies: { userId } } }),
    db.collection('notes').updateMany({ likedBy: userId }, { $pull: { likedBy: userId } }),
    db.collection('favorites').deleteOne({ userId }),
    db.collection('notifications').deleteMany({ userId }),
  ]);
  const user = await db.collection('users').findOne({ id: userId });
  if (user) await db.collection('passwordResets').deleteOne({ email: user.email });
  await db.collection('users').deleteOne({ id: userId });
}
