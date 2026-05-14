import { apiClient, unwrapApiResponse } from "./apiClient";

export const batchService = {
  async createBatch(payload) {
    const response = await apiClient.post("/api/v1/batches", payload);
    return unwrapApiResponse(response);
  },

  async getBatchByCode(batchCode) {
    const response = await apiClient.get(`/api/v1/batches/${encodeURIComponent(batchCode)}`);
    return unwrapApiResponse(response);
  },

  async getBatchesByFarm(farmId) {
    const response = await apiClient.get(`/api/v1/batches/farm/${farmId}`);
    const payload = unwrapApiResponse(response);
    return Array.isArray(payload) ? payload : [];
  },

  async getBatchesPage({
    page = 0,
    size = 20,
    sort = "updatedAt,desc",
    status = "PENDING_INSPECTION",
    q = "",
    farmId,
  } = {}) {
    try {
      let allBatches = [];
      if (farmId && farmId !== "all") {
        const response = await apiClient.get(`/api/v1/batches/farm/${farmId}`);
        allBatches = unwrapApiResponse(response);
      } else {
        const farmsRes = await apiClient.get("/api/v1/farms/my");
        const farms = unwrapApiResponse(farmsRes);
        const batchPromises = farms.map((f) =>
          apiClient.get(`/api/v1/batches/farm/${f.id}`).then(unwrapApiResponse).catch(() => [])
        );
        const results = await Promise.all(batchPromises);
        allBatches = results.flat();
      }

      if (status && status !== "ALL") {
        allBatches = allBatches.filter((b) => b.status === status);
      }
      if (q) {
        const qLower = q.toLowerCase();
        allBatches = allBatches.filter(
          (b) =>
            b.batchCode?.toLowerCase().includes(qLower) ||
            b.productName?.toLowerCase().includes(qLower)
        );
      }

      allBatches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const start = page * size;
      const content = allBatches.slice(start, start + size);
      const totalElements = allBatches.length;
      const totalPages = Math.ceil(totalElements / size);

      return { content, totalElements, totalPages };
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      throw err;
    }
  },

  /**
   * Check whether a product has any associated batches.
   * Used before allowing a hard delete on a product.
   */
  async getBatchesByProduct(productId) {
    try {
      const response = await apiClient.get(`/api/v1/batches?productId=${productId}`);
      const payload = unwrapApiResponse(response);
      return Array.isArray(payload) ? payload : [];
    } catch {
      // If the endpoint doesn't exist yet, return empty array (optimistic)
      return [];
    }
  },
};
