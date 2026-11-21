import { getState, mutate } from './apiClient.js';

export const getNotifications = (userId) =>
  getState().notifications.filter((item) => item.userId === userId);
export const getUnreadCount = (userId) =>
  getNotifications(userId).filter((item) => !item.read).length;
export const markNotificationRead = (id) =>
  mutate(`/notifications/${encodeURIComponent(id)}`, 'PATCH', { read: true });
export const markAllNotificationsRead = () => mutate('/notifications/read-all');
