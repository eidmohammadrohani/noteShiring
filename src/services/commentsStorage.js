import { getState, mutate } from './apiClient.js';

export const getComments = () => getState().comments;
export const getCommentsForNote = (noteId) =>
  getComments()
    .filter((comment) => comment.noteId === noteId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
export const addComment = (input) => mutate('/comments', 'POST', input);
export const deleteComment = (id) => mutate(`/comments/${encodeURIComponent(id)}`, 'DELETE');
export const replyToComment = (id, text) =>
  mutate(`/comments/${encodeURIComponent(id)}/replies`, 'POST', { text });
