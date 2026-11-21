import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, X } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { useConfirm } from '../common/ConfirmDialog.jsx';
import { useToast } from '../common/Toast.jsx';
import { useCurrentUser } from '../../hooks/useData.js';
import { useDirtyGuard } from '../../hooks/useUnsavedChanges.jsx';
import { createNote, updateNote } from '../../services/notesStorage.js';
import { toUserMessage } from '../../services/errors.js';
import { ACCEPTED_FILE_TYPES, FACULTIES, LIMITS, SEMESTERS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateUtils.js';
import { formatFileSize, readFileAsAttachment } from '../../utils/files.js';
import { basePathFor, notePath } from '../../utils/paths.js';
import { countChars, countWords } from '../../utils/text.js';
import { parseTags, validateNoteInput } from '../../utils/validation.js';

function toValues(note) {
  return {
    title: note?.title || '',
    content: note?.content || '',
    subject: note?.subject || '',
    course: note?.course || '',
    faculty: note?.faculty || '',
    semester: note?.semester || '',
    tags: (note?.tags || []).join(', '),
    file: note?.file || null,
  };
}

const FIELD_ORDER = ['title', 'content', 'subject', 'course', 'faculty', 'semester', 'file'];

// Controlled create/edit form. `note` = existing note (edit) or undefined (create).
export default function NoteEditor({ note }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { notify } = useToast();
  const base = basePathFor(user);
  const editing = Boolean(note);

  const initial = useMemo(() => toValues(note), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // blocks double-submits before React re-renders
  const fileInput = useRef(null);

  const isDirty =
    ['title', 'content', 'subject', 'course', 'faculty', 'semester', 'tags'].some(
      (k) => values[k] !== initial[k],
    ) || (values.file?.dataUrl || null) !== (initial.file?.dataUrl || null);
  useDirtyGuard(isDirty);

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function onPickFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = ''; // allow choosing the same file again later
    if (!file) return;
    try {
      const attachment = await readFileAsAttachment(file);
      setValues((v) => ({ ...v, file: attachment }));
      setErrors((e) => ({ ...e, file: undefined }));
    } catch (error) {
      setErrors((e) => ({ ...e, file: error.message }));
    }
  }

  async function cancel() {
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard unsaved changes?',
        message: 'Your edits have not been saved. Leaving now will discard them.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        danger: true,
      });
      if (!discard) return;
    }
    navigate(editing ? notePath(base, note.id) : `${base}/my-notes`);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const found = validateNoteInput(values);
    setErrors(found);
    const firstBad = FIELD_ORDER.find((k) => found[k]);
    if (firstBad) {
      const el = document.getElementById(`note-${firstBad}`);
      if (el) el.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = { ...values, tags: parseTags(values.tags) };
      const saved = await (editing
        ? updateNote(note.id, payload, user)
        : createNote(payload, user));
      notify(editing ? 'Note updated.' : 'Note created.');
      navigate(notePath(base, saved.id), { replace: true });
    } catch (error) {
      if (error.details && error.details.errors) setErrors(error.details.errors);
      notify(toUserMessage(error), 'error');
      savingRef.current = false;
      setSaving(false);
    }
  }

  const words = countWords(values.content);
  const chars = countChars(values.content);

  return (
    <form
      className="card editor"
      onSubmit={onSubmit}
      noValidate
      aria-label={editing ? 'Edit note' : 'New note'}
    >
      <div className="form-grid">
        <FormField id="note-title" label="Title" error={errors.title} full>
          <input
            type="text"
            value={values.title}
            onChange={set('title')}
            placeholder="e.g. Binary Trees Explained"
            maxLength={LIMITS.TITLE_MAX + 40}
          />
        </FormField>

        <FormField id="note-subject" label="Subject" error={errors.subject}>
          <input
            type="text"
            value={values.subject}
            onChange={set('subject')}
            placeholder="Data Structures"
          />
        </FormField>
        <FormField id="note-course" label="Course" error={errors.course}>
          <input type="text" value={values.course} onChange={set('course')} placeholder="CS 201" />
        </FormField>
        <FormField id="note-faculty" label="Faculty" error={errors.faculty}>
          <select value={values.faculty} onChange={set('faculty')}>
            <option value="">Select faculty</option>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </FormField>
        <FormField id="note-semester" label="Semester" error={errors.semester}>
          <select value={values.semester} onChange={set('semester')}>
            <option value="">Select semester</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="note-content" label="Content" error={errors.content} full>
          <textarea
            rows={12}
            value={values.content}
            onChange={set('content')}
            placeholder="Write or paste your notes here…"
          />
        </FormField>
        <p className="counter full" aria-live="polite">
          {words} {words === 1 ? 'word' : 'words'} · {chars.toLocaleString()} /{' '}
          {LIMITS.CONTENT_MAX.toLocaleString()} characters
        </p>

        <FormField id="note-tags" label="Tags" hint="Separate tags with commas (max 10)." full>
          <input
            type="text"
            value={values.tags}
            onChange={set('tags')}
            placeholder="trees, algorithms, exam"
          />
        </FormField>

        <div className="field field-full">
          <span className="label-like">Attachment (optional)</span>
          {values.file ? (
            <div className="file-pill">
              <Paperclip size={16} aria-hidden="true" />
              <span className="file-name">{values.file.name}</span>
              <span className="muted">{formatFileSize(values.file.size)}</span>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Remove attachment"
                onClick={() => setValues((v) => ({ ...v, file: null }))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="muted small">
              PDF, Word, PowerPoint, text or image - up to{' '}
              {(LIMITS.FILE_MAX_BYTES / 1024 / 1024).toFixed(1)} MB.
            </p>
          )}
          <input
            ref={fileInput}
            id="note-file"
            className="sr-only"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={onPickFile}
            aria-label="Choose attachment"
            aria-invalid={errors.file ? 'true' : undefined}
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fileInput.current && fileInput.current.click()}
          >
            <Paperclip size={15} aria-hidden="true" />{' '}
            {values.file ? 'Replace file' : 'Attach a file'}
          </button>
          {errors.file && (
            <p className="field-error" role="alert">
              {errors.file}
            </p>
          )}
        </div>

        {editing && (
          <dl className="timestamps full">
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(note.createdAt)}</dd>
            </div>
            <div>
              <dt>Last modified</dt>
              <dd>{formatDateTime(note.updatedAt)}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{note.ownerName}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create note'}
        </button>
      </div>
    </form>
  );
}
