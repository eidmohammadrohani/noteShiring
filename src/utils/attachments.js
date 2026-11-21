import { ACCEPTED_FILE_TYPES, LIMITS } from './constants.js';

// Validate attachment URLs and declared sizes before saving or downloading.
export function attachmentError(file) {
  if (!file) return '';
  if (
    typeof file.name !== 'string' ||
    !ACCEPTED_FILE_TYPES.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))
  )
    return 'Choose a PDF, Office document, text file, PNG or JPEG.';
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > LIMITS.FILE_MAX_BYTES)
    return 'Invalid attachment size or file is too large.';
  if (
    typeof file.dataUrl !== 'string' ||
    file.dataUrl.length > Math.ceil(LIMITS.FILE_MAX_BYTES / 3) * 4 + 200
  )
    return 'Invalid attachment data or file is too large.';
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(file.dataUrl);
  if (!match || /(?:html|javascript|svg|xml)/i.test(match[1]) || match[2].length % 4 !== 0)
    return 'Invalid or unsafe attachment data.';
  return '';
}
