import { apiClient, unwrapApiResponse } from "./apiClient";

/**
 * productRequestService
 *
 * API calls for the Product Creation Request workflow.
 * All endpoints require authentication (apiClient with JWT bearer token).
 */
export const productRequestService = {
  /**
   * FARMER: Submit a new product creation request
   */
  async submitRequest(data) {
    const response = await apiClient.post("/api/v1/product-requests", data);
    return unwrapApiResponse(response);
  },

  /**
   * FARMER: Get own requests (paginated)
   */
  async getMyRequests({ page = 0, size = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await apiClient.get(`/api/v1/product-requests/my?${params}`);
    return unwrapApiResponse(response);
  },

  /**
   * ADMIN: Get all requests, optionally filtered by status
   */
  async getAllRequests({ page = 0, size = 20, status = "ALL" } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      status,
    });
    const response = await apiClient.get(`/api/v1/product-requests?${params}`);
    return unwrapApiResponse(response);
  },

  /**
   * ADMIN: Approve a product request
   */
  async approveRequest(id) {
    const response = await apiClient.post(`/api/v1/product-requests/${id}/review`, {
      action: "APPROVE",
    });
    return unwrapApiResponse(response);
  },

  /**
   * ADMIN: Reject a product request with a reason
   */
  async rejectRequest(id, rejectionReason) {
    const response = await apiClient.post(`/api/v1/product-requests/${id}/review`, {
      action: "REJECT",
      rejectionReason,
    });
    return unwrapApiResponse(response);
  },
};
