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
    try {
      const response = await apiClient.get("/api/v1/farms");
      let allFarms = unwrapApiResponse(response);
      if (!Array.isArray(allFarms)) allFarms = [];

      if (q) {
        const qLower = q.toLowerCase();
        allFarms = allFarms.filter((f) => f.name?.toLowerCase().includes(qLower));
      }

      allFarms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const start = page * size;
      const content = allFarms.slice(start, start + size);
      return {
        content,
        totalElements: allFarms.length,
        totalPages: Math.ceil(allFarms.length / size),
      };
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      throw err;
    }
  },
};
