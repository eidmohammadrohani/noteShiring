// Errors thrown by the service layer. The UI shows `message` to the user and
// can branch on `code` (VALIDATION, NOT_FOUND, FORBIDDEN, ...).
export class ServiceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;
  }
}

// Turns any thrown value into a short message that is safe to show users.
// Unexpected errors are logged to the console during development only.
export function toUserMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ServiceError) return error.message;
  if (import.meta.env && import.meta.env.DEV) console.error(error);
  return fallback;
}
