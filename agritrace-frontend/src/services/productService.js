import { apiClient, publicClient, unwrapApiResponse } from "./apiClient";

export const productService = {
  async getProducts() {
    const response = await publicClient.get("/api/v1/products");
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async getProductsPage({ page = 0, size = 20, q = "", sort = "updatedAt,desc" } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort,
      q,
    });
    const response = await publicClient.get(`/api/v1/products/page?${params.toString()}`);
    return unwrapApiResponse(response);
  },

  async getProductById(id) {
    const response = await publicClient.get(`/api/v1/products/${id}`);
    return unwrapApiResponse(response);
  },

  async createProduct(payload) {
    const response = await apiClient.post("/api/v1/products", payload);
    return unwrapApiResponse(response);
  },

  async updateProduct(id, payload) {
    const response = await apiClient.put(`/api/v1/products/${id}`, payload);
    return unwrapApiResponse(response);
  },

  async deactivateProduct(id) {
    // Toggle isActive = false (soft suspend)
    const response = await apiClient.put(`/api/v1/products/${id}`, { isActive: false });
    return unwrapApiResponse(response);
  },

  async activateProduct(id) {
    const response = await apiClient.put(`/api/v1/products/${id}`, { isActive: true });
    return unwrapApiResponse(response);
  },

  async deleteProduct(id) {
    const response = await apiClient.delete(`/api/v1/products/${id}`);
    return unwrapApiResponse(response);
  },
};
