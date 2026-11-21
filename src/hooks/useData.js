import { useMemo, useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '../services/events.js';
import { getNotes, getFavoriteIds } from '../services/notesStorage.js';
import { getComments } from '../services/commentsStorage.js';
import { getUsers, publicUser } from '../services/usersStorage.js';
import { getNotifications } from '../services/notificationsStorage.js';
import { getSessionUser } from '../services/authService.js';
import { commentCountsByNote } from '../utils/stats.js';

// Every hook re-reads the API cache whenever it refreshes, so all
// pages show the same, current information.
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

export function useNotes() {
  const version = useStoreVersion();
  return useMemo(() => getNotes(), [version]);
}

export function useUsers() {
  const version = useStoreVersion();
  return useMemo(() => getUsers().map(publicUser), [version]);
}

export function useComments() {
  const version = useStoreVersion();
  return useMemo(() => getComments(), [version]);
}

export function useCommentCounts() {
  const comments = useComments();
  return useMemo(() => commentCountsByNote(comments), [comments]);
}

export function useNotifications(userId) {
  const version = useStoreVersion();
  return useMemo(() => (userId ? getNotifications(userId) : []), [version, userId]);
}

export function useFavoriteIds(userId) {
  const version = useStoreVersion();
  return useMemo(() => (userId ? getFavoriteIds(userId) : []), [version, userId]);
}

export function useCurrentUser() {
  const version = useStoreVersion();
  return useMemo(() => getSessionUser(), [version]);
}
