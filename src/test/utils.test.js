import { beforeEach, describe, expect, it } from 'vitest';
import { resetAll } from './helpers.js';
import {
  isValidEmail,
  parseTags,
  passwordStrength,
  sanitizeText,
  validateCommentText,
  validateNoteInput,
} from '../utils/validation.js';
import { formatDate, nextTimestamp, timeAgo, toDayKey } from '../utils/dateUtils.js';
import { countChars, countWords, initials, slugify, truncate } from '../utils/text.js';
import { applyTheme, getStoredTheme, resolveInitialTheme, storeTheme } from '../utils/theme.js';

describe('note validation', () => {
  it('accepts a title with content or an attachment', () => {
    expect(validateNoteInput({ title: 'T', content: 'C' })).toEqual({});
    expect(
      validateNoteInput({
        title: 'T',
        content: '',
        file: { name: 'notes.txt', dataUrl: 'data:text/plain;base64,QQ==', size: 1 },
      }),
    ).toEqual({});
  });
  it('reports each problem separately', () => {
    const e = validateNoteInput({ title: '', content: '' });
    expect(Boolean(e.title && e.content)).toBe(true);
    expect(Boolean(validateNoteInput({ title: 'T', content: 'x'.repeat(20001) }).content)).toBe(
      true,
    );
    expect(Boolean(validateNoteInput({ title: 'T', content: 'C', faculty: 'Nope' }).faculty)).toBe(
      true,
    );
    expect(
      Boolean(
        validateNoteInput({ title: 'T', content: 'C', file: { dataUrl: 'x', size: 99999999 } })
          .file,
      ),
    ).toBe(true);
  });
});

describe('small validators', () => {
  it('validates emails, comments and tags', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(validateCommentText('')).not.toBe('');
    expect(validateCommentText('ok')).toBe('');
    expect(parseTags('a, B, a, , c')).toEqual(['a', 'B', 'c']);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
  it('rates password strength and strips control characters', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').score).toBe(0);
    expect(passwordStrength('Passw0rd!').score).toBe(3);
    expect(sanitizeText('a\u0000b\tc\nd')).toBe('ab\tc\nd');
  });
});

describe('text and date helpers', () => {
  it('counts, truncates and builds slugs', () => {
    expect(countWords('  one two\nthree ')).toBe(3);
    expect(countWords('')).toBe(0);
    expect(countChars('abc')).toBe(3);
    expect(truncate('a'.repeat(200), 10).length).toBeLessThan(12);
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
  it('handles invalid dates and always moves timestamps forward', () => {
    expect(formatDate('nope')).toBe('-');
    expect(timeAgo('nope')).toBe('-');
    expect(toDayKey('nope')).toBe('');
    const base = new Date(Date.now() + 60000).toISOString();
    expect(Date.parse(nextTimestamp(base))).toBeGreaterThan(Date.parse(base));
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });
});

describe('theme preference', () => {
  beforeEach(resetAll);
  it('has no stored theme at first and ignores invalid values', () => {
    expect(getStoredTheme()).toBeNull();
    localStorage.setItem('notehub:theme', 'purple');
    expect(getStoredTheme()).toBeNull();
  });
  it('persists the chosen theme and uses it as the initial theme', () => {
    storeTheme('dark');
    expect(localStorage.getItem('notehub:theme')).toBe('dark');
    expect(getStoredTheme()).toBe('dark');
    expect(resolveInitialTheme()).toBe('dark');
  });
  it('applies the theme to the document', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
