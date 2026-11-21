export const FACULTIES = ['Science & Engineering', 'Business', 'Medicine', 'Arts & Humanities'];
export const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const ROLES = { USER: 'user', ADMIN: 'admin' };
export const USER_STATUS = { ACTIVE: 'active', BLOCKED: 'blocked' };

export const LIMITS = {
  TITLE_MAX: 120,
  CONTENT_MAX: 20000,
  SHORT_FIELD_MAX: 80,
  TAGS_MAX: 10,
  TAG_MAX_LENGTH: 24,
  COMMENT_MAX: 1000,
  FILE_MAX_BYTES: 1.5 * 1024 * 1024, // limit embedded attachment payloads in API requests
};

export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg';
