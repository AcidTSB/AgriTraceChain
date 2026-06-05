import { apiClient, unwrapApiResponse } from "./apiClient";

export const traceService = {
  async createTraceLog(payload) {
    const response = await apiClient.post("/api/v1/trace-logs", payload);
    return unwrapApiResponse(response);
  },

  async getTraceLogsByBatchId(batchId) {
    const response = await apiClient.get(`/api/v1/trace-logs/batch/${batchId}`);
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async getAuditLogsCursor({ cursor, limit = 20 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== undefined && cursor !== null) {
      params.set("cursor", String(cursor));
    }
    const response = await apiClient.get(`/api/v1/audit-logs?${params.toString()}`);
    return unwrapApiResponse(response);
  },

  async getAuditLogStats() {
    const response = await apiClient.get("/api/v1/audit-logs/stats");
    return unwrapApiResponse(response);
  },

  async searchInternal({ keyword = "", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({
      keyword,
      page: String(page),
      size: String(size),
    });
    const response = await apiClient.get(`/api/v1/internal/search?${params.toString()}`);
    return unwrapApiResponse(response);
  },

  async getAdminTraceLogsByBatchCode(batchCode) {
    const response = await apiClient.get(`/api/v1/trace-logs/admin/batch-code/${batchCode}`);
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async scanIntegrity() {
    const response = await apiClient.post("/api/v1/trace-logs/admin/integrity/scan");
    return unwrapApiResponse(response);
  },
};
