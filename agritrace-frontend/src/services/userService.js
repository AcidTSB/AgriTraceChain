import { apiClient, unwrapApiResponse } from "./apiClient";

export const userService = {
  async getUsersPage({ page = 0, size = 20, q = "", sort = "updatedAt,desc" } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      q,
      sort,
    });
    const response = await apiClient.get(`/api/v1/users/page?${params.toString()}`);
    return unwrapApiResponse(response);
  },
};
