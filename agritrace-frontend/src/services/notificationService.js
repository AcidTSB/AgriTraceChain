import { apiClient } from './apiClient';

export const notificationService = {
  getSettings: () => {
    return apiClient.get('/api/v1/notifications/settings');
  },

  updateSettings: (settingsData) => {
    return apiClient.put('/api/v1/notifications/settings', settingsData);
  },

  getUnreadAlerts: () => {
    return apiClient.get('/api/v1/notifications');
  },

  markAsRead: (alertId) => {
    return apiClient.post(`/api/v1/notifications/${alertId}/read`);
  }
};
