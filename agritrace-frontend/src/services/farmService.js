import { apiClient, unwrapApiResponse } from "./apiClient";

export const farmService = {
  async createFarm(payload) {
    const response = await apiClient.post("/api/v1/farms", payload);
    return unwrapApiResponse(response);
  },

  async getAllFarms() {
    const response = await apiClient.get("/api/v1/farms");
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async getMyFarms() {
    const response = await apiClient.get("/api/v1/farms/my");
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async getAllFarmsPage({ page = 0, size = 20, q = "", sort = "updatedAt,desc" } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      q,
      sort,
    });
    const response = await apiClient.get(`/api/v1/farms/page?${params.toString()}`);
    return unwrapApiResponse(response);
  },
};
