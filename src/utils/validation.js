import { LIMITS, FACULTIES, SEMESTERS } from './constants.js';
import { attachmentError } from './attachments.js';

// Strips control characters (keeps tabs and newlines). React escapes text when
// rendering, and we never use dangerouslySetInnerHTML, so this is hygiene only.
export function sanitizeText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim());
}

export function parseTags(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const tags = [];
  list.forEach((raw) => {
    const tag = sanitizeText(raw).trim().slice(0, LIMITS.TAG_MAX_LENGTH);
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  });
  return tags.slice(0, LIMITS.TAGS_MAX);
}

// Returns an object of field -> message. Empty object means valid.
export function validateNoteInput(input = {}) {
  const errors = {};
  const title = String(input.title ?? '').trim();
  const content = String(input.content ?? '').trim();
  const hasFile = Boolean(input.file && input.file.dataUrl);

  if (!title) errors.title = 'Title is required.';
  else if (title.length > LIMITS.TITLE_MAX)
    errors.title = `Title must be ${LIMITS.TITLE_MAX} characters or fewer.`;

  if (!content && !hasFile) errors.content = 'Content is required (or attach a file).';
  else if (content.length > LIMITS.CONTENT_MAX)
    errors.content = `Content must be ${LIMITS.CONTENT_MAX.toLocaleString()} characters or fewer.`;

  if (String(input.subject ?? '').length > LIMITS.SHORT_FIELD_MAX)
    errors.subject = `Subject must be ${LIMITS.SHORT_FIELD_MAX} characters or fewer.`;
  if (String(input.course ?? '').length > LIMITS.SHORT_FIELD_MAX)
    errors.course = `Course must be ${LIMITS.SHORT_FIELD_MAX} characters or fewer.`;
  if (input.faculty && !FACULTIES.includes(input.faculty))
    errors.faculty = 'Choose a valid faculty.';
  if (input.semester && !SEMESTERS.includes(String(input.semester)))
    errors.semester = 'Choose a valid semester.';

  if (input.file && input.file.size > LIMITS.FILE_MAX_BYTES)
    errors.file = `File is too large (max ${(LIMITS.FILE_MAX_BYTES / 1024 / 1024).toFixed(1)} MB).`;
  if (input.file && !errors.file) {
    const problem = attachmentError(input.file);
    if (problem) errors.file = problem;
  }

  return errors;
}

export function validateCommentText(text) {
  const clean = String(text ?? '').trim();
  if (!clean) return 'Write something before posting.';
  if (clean.length > LIMITS.COMMENT_MAX)
    return `Comments must be ${LIMITS.COMMENT_MAX} characters or fewer.`;
  return '';
}

export function passwordStrength(password) {
  const v = String(password ?? '');
  let score = 0;
  if (v.length >= 8) score += 1;
  if (/[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) score += 1;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 1;
  const label =
    v.length === 0
      ? 'Use 8+ characters with a number and a symbol.'
      : score <= 1
        ? 'Weak password'
        : score === 2
          ? 'Good password'
          : 'Strong password';
  return { score, label };
}

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (!String(identifier ?? '').trim()) errors.identifier = 'Enter your email or student ID.';
  if (String(password ?? '').length < 6)
    errors.password = 'Password must be at least 6 characters.';
  return errors;
}

export function validateRegistration(values = {}) {
  const errors = {};
  const need = (key, message) => {
    if (!String(values[key] ?? '').trim()) errors[key] = message;
  };
  need('fullName', 'Enter your full name.');
  need('studentId', 'Enter your student ID.');
  need('university', 'Enter your university.');
  need('department', 'Enter your department.');
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (!/^[+0-9 ()-]{7,}$/.test(String(values.phone ?? '').trim()))
    errors.phone = 'Enter a valid phone number.';
  if (!FACULTIES.includes(values.faculty)) errors.faculty = 'Select your faculty.';
  if (!SEMESTERS.includes(String(values.semester ?? ''))) errors.semester = 'Select your semester.';
  if (String(values.password ?? '').length < 8) errors.password = 'Use at least 8 characters.';
  if (String(values.password ?? '').length > 128)
    errors.password = 'Use no more than 128 characters.';
  if (!errors.password && values.password !== values.confirmPassword)
    errors.confirmPassword = 'Passwords do not match.';
  if (String(values.fullName ?? '').length > 80) errors.fullName = 'Name is too long.';
  return errors;
}

export function validateNewPassword(password, confirm) {
  if (String(password ?? '').length > 128) return 'Use no more than 128 characters.';
  if (String(password ?? '').length < 8) return 'Use at least 8 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}
