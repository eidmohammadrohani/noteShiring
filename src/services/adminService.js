import { mutate } from './apiClient.js';

export const setUserBlocked = (id, blocked) =>
  mutate(`/admin/users/${encodeURIComponent(id)}`, 'PATCH', { blocked });
export const deleteUserAccount = (id) => mutate(`/admin/users/${encodeURIComponent(id)}`, 'DELETE');
export const deleteOwnAccount = () => mutate('/users/me', 'DELETE');
