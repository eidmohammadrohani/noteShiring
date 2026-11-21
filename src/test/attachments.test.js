import { expect, it } from 'vitest';
import { attachmentError } from '../utils/attachments.js';
import { LIMITS } from '../utils/constants.js';

it('rejects executable URLs, unsafe MIME types and unsupported extensions', () => {
  for (const dataUrl of [
    'javascript:alert(1)',
    'https://example.com/file',
    'data:text/html;base64,QQ==',
    'data:image/svg+xml;base64,QQ==',
  ]) {
    expect(attachmentError({ name: 'a.pdf', size: 1, dataUrl })).not.toBe('');
  }
  expect(
    attachmentError({
      name: 'a.exe',
      size: 1,
      dataUrl: 'data:application/octet-stream;base64,QQ==',
    }),
  ).not.toBe('');
});

it('rejects malformed base64 and oversized attachments', () => {
  expect(
    attachmentError({ name: 'a.txt', size: 1, dataUrl: 'data:text/plain;base64,QQ=' }),
  ).not.toBe('');
  expect(
    attachmentError({
      name: 'a.txt',
      size: LIMITS.FILE_MAX_BYTES + 1,
      dataUrl: 'data:text/plain;base64,QQ==',
    }),
  ).not.toBe('');
});
