import { apiClient, publicClient, unwrapApiResponse } from "./apiClient";

export const authService = {
  async login(payload) {
    const response = await publicClient.post("/api/v1/auth/login", payload);
    return unwrapApiResponse(response);
  },

  async register(payload) {
    const response = await publicClient.post("/api/v1/auth/register", payload);
    return unwrapApiResponse(response);
  },

  async getProfile() {
    const response = await apiClient.get("/api/v1/users/me");
    return unwrapApiResponse(response);
  },

  async updateProfile(payload) {
    const response = await apiClient.put("/api/v1/users/me", payload);
    return unwrapApiResponse(response);
  },

  async changePassword(payload) {
    // payload: { currentPassword, newPassword }
    const response = await apiClient.post("/api/v1/auth/change-password", payload);
    return unwrapApiResponse(response);
  },
};
