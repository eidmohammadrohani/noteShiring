import { getState, getConnectionStatus, mutate, updateCachedState } from './apiClient.js';
import { ROLES } from '../utils/constants.js';

const path = (id, action = '') => `/notes/${encodeURIComponent(id)}${action}`;
export const getNotes = () => getState().notes;
export const getNoteById = (id) => getNotes().find((note) => note.id === id) || null;
export const canModifyNote = (note, actor) =>
  Boolean(note && actor && (actor.role === ROLES.ADMIN || actor.id === note.ownerId));
export const canViewNote = (note, viewer) =>
  Boolean(note && (!note.archived || canModifyNote(note, viewer)));
async function saveNote(request) {
  const note = await request;
  if (!getConnectionStatus().error || !getState().user) return note;
  updateCachedState((state) => ({
    ...state,
    notes: [note, ...state.notes.filter((item) => item.id !== note.id)],
  }));
  return note;
}
export const createNote = (input) => saveNote(mutate('/notes', 'POST', input));
export const updateNote = (id, patch) => saveNote(mutate(path(id), 'PATCH', patch));
export async function deleteNote(id) {
  const result = await mutate(path(id), 'DELETE');
  updateCachedState((state) => ({
    ...state,
    notes: state.notes.filter((item) => item.id !== id),
    comments: state.comments.filter((item) => item.noteId !== id),
    favoriteIds: state.favoriteIds.filter((item) => item !== id),
  }));
  return result;
}
export const archiveNote = (id) =>
  saveNote(mutate(path(id, '/archive'), 'PUT', { archived: true }));
export const restoreNote = (id) =>
  saveNote(mutate(path(id, '/archive'), 'PUT', { archived: false }));
export const getFavoriteIds = (userId) =>
  userId === getState().user?.id ? getState().favoriteIds : [];
export const toggleFavorite = (id) => mutate(path(id, '/favorite'));
export const toggleLike = (id) => mutate(path(id, '/like'));
export const recordDownload = (id) => saveNote(mutate(path(id, '/download')));
