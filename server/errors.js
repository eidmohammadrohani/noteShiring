export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function invalid(errors) {
  if (Object.keys(errors).length) {
    throw new ApiError(400, 'VALIDATION', 'Please fix the highlighted fields.', { errors });
  }
}

export function notFound(message = 'This item no longer exists.') {
  throw new ApiError(404, 'NOT_FOUND', message);
}
