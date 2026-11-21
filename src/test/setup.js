import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetApiState } from '../services/apiClient.js';

// Every test starts with empty storage and a light theme.
beforeEach(() => {
  localStorage.clear();
  resetApiState();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
