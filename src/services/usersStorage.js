import { getState, mutate } from './apiClient.js';

export const getUsers = () => getState().users;
export const publicUser = (user) => user;
export const getUserById = (id) => getUsers().find((user) => user.id === id) || null;
export const updateUserProfile = (_id, patch) => mutate('/users/me', 'PATCH', patch);
