import { LIMITS } from './constants.js';
import { slugify } from './text.js';
import { attachmentError } from './attachments.js';

export function readFileAsAttachment(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected.'));
    if (file.size > LIMITS.FILE_MAX_BYTES) {
      return reject(
        new Error(
          `File is too large (max ${(LIMITS.FILE_MAX_BYTES / 1024 / 1024).toFixed(1)} MB).`,
        ),
      );
    }
    const reader = new FileReader();
    reader.onload = () => {
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: String(reader.result),
      };
      const problem = attachmentError(attachment);
      if (problem) reject(new Error(problem));
      else resolve(attachment);
    };
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileTag(note) {
  const name = note?.file?.name || '';
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return ext ? ext.slice(0, 4).toUpperCase() : 'TXT';
}

function clickAnchor(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Downloads the attached file, or the note text as a .txt file.
export function downloadNoteFile(note) {
  if (note.file?.dataUrl) {
    const problem = attachmentError(note.file);
    if (problem) throw new Error(problem);
    clickAnchor(note.file.dataUrl, note.file.name);
    return note.file.name;
  }
  const body = `${note.title}\n${'='.repeat(Math.min(note.title.length, 60))}\n\n${note.content}\n`;
  const filename = `${slugify(note.title)}.txt`;
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
  clickAnchor(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
