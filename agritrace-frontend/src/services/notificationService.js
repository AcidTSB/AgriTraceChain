import { apiClient } from './apiClient';

export const notificationService = {
  getSettings: () => {
    return apiClient.get('/notifications/settings');
  },

  updateSettings: (settingsData) => {
    return apiClient.put('/notifications/settings', settingsData);
  },

  getUnreadAlerts: () => {
    return apiClient.get('/notifications');
  },

  markAsRead: (alertId) => {
    return apiClient.post(`/notifications/${alertId}/read`);
  }
};
