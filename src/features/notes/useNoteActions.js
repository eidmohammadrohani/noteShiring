import { useCallback, useMemo, useRef } from 'react';
import { useCurrentUser } from '../../hooks/useData.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import { toUserMessage } from '../../services/errors.js';
import {
  archiveNote,
  deleteNote,
  recordDownload,
  restoreNote,
  toggleFavorite,
  toggleLike,
} from '../../services/notesStorage.js';
import { downloadNoteFile } from '../../utils/files.js';

// Shared network/error handling for note cards and detail pages.
export function useNoteActions() {
  const user = useCurrentUser();
  const { notify } = useToast();
  const confirm = useConfirm();
  const pending = useRef(new Set());

  const attempt = useCallback(
    async (key, fn) => {
      if (pending.current.has(key)) return undefined;
      pending.current.add(key);
      try {
        return await fn();
      } catch (error) {
        notify(toUserMessage(error), 'error');
        return undefined;
      } finally {
        pending.current.delete(key);
      }
    },
    [notify],
  );

  return useMemo(
    () => ({
      like: (note) =>
        attempt(`like:${note.id}`, async () => {
          const { liked } = await toggleLike(note.id, user);
          notify(liked ? 'You liked this note.' : 'Like removed.', 'info');
        }),
      favorite: (note) =>
        attempt(`favorite:${note.id}`, async () => {
          const { favorited } = await toggleFavorite(note.id, user.id);
          notify(favorited ? 'Added to Favorites.' : 'Removed from Favorites.', 'info');
        }),
      download: (note) =>
        attempt(`download:${note.id}`, async () => {
          const saved = await recordDownload(note.id, user);
          const name = downloadNoteFile(saved);
          notify(`Downloading ${name}`, 'success');
        }),
      archive: (note) =>
        attempt(`archive:${note.id}`, async () => {
          await archiveNote(note.id, user);
          notify('Note archived. You can restore it from Archive.');
        }),
      restore: (note) =>
        attempt(`archive:${note.id}`, async () => {
          await restoreNote(note.id, user);
          notify('Note restored.');
        }),
      remove: async (note) => {
        const ok = await confirm({
          title: 'Delete this note?',
          message: `"${note.title}" and its comments will be permanently deleted. This cannot be undone.`,
          confirmLabel: 'Delete note',
          danger: true,
        });
        if (!ok) return false;
        return Boolean(
          await attempt(`delete:${note.id}`, async () => {
            await deleteNote(note.id, user);
            notify('Note deleted.');
            return true;
          }),
        );
      },
    }),
    [attempt, confirm, notify, user],
  );
}
