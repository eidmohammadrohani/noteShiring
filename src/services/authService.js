import { getState, getConnectionStatus, mutate, updateCachedState } from './apiClient.js';

export const getSessionUser = () => getState().user;
export const registerUser = (values) => mutate('/auth/register', 'POST', values);
export async function login(identifier, password) {
  const user = await mutate('/auth/login', 'POST', { identifier, password });
  if (getConnectionStatus().error) {
    // Keep the server-verified account if the following workspace load fails.
    // Discard the previous account's snapshot before showing this account.
    updateCachedState(() => ({
      user,
      users: [user],
      notes: [],
      comments: [],
      notifications: [],
      favoriteIds: [],
    }));
  }
  return user;
}
export const logout = () => mutate('/auth/logout');
export const changePassword = (_userId, currentPassword, newPassword, confirm) =>
  mutate('/auth/password', 'POST', { currentPassword, newPassword, confirm });
export const requestPasswordReset = (email) => mutate('/auth/forgot-password', 'POST', { email });
export const resetPassword = (email, code, newPassword, confirm) =>
  mutate('/auth/reset-password', 'POST', { email, code, newPassword, confirm });
