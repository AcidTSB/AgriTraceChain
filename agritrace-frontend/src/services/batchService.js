import { apiClient, publicClient, unwrapApiResponse } from "./apiClient";
import { resolveBatchId } from "./batchResolver";
import { traceService } from "./traceService";

export const batchService = {
  async createBatch(payload) {
    const response = await apiClient.post("/api/v1/batches", payload);
    return unwrapApiResponse(response);
  },

  async getBatchByCode(batchCode) {
    const response = await publicClient.get(`/api/v1/batches/${encodeURIComponent(batchCode)}`);
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
    status = "ALL",
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

      // Enrich batches with real inspection status from trace logs
      allBatches = await enrichBatchesWithInspectionStatus(allBatches);

      if (status && status !== "ALL") {
        allBatches = allBatches.filter((b) => b.inspectionStatus === status);
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

/**
 * Enrich batch objects with real inspection status derived from trace logs.
 * The product-service only stores PENDING_INSPECTION / COMPROMISED on the entity,
 * but actual inspection status is determined by whether an INSPECTION action
 * exists in the trace-service logs for that batch.
 */
async function enrichBatchesWithInspectionStatus(batches) {
  const enriched = await Promise.all(
    batches.map(async (batch) => {
      // Compromised batches keep their status
      if (batch.status === "COMPROMISED" || batch.isCompromised) {
        return { ...batch, inspectionStatus: "COMPROMISED" };
      }

      try {
        const batchId = batch.id || (await resolveBatchId(batch.batchCode));
        const logs = await traceService.getTraceLogsByBatchId(batchId);
        const hasInspection = logs.some((log) => log.action === "INSPECTION");
        return {
          ...batch,
          inspectionStatus: hasInspection ? "INSPECTED" : "PENDING_INSPECTION",
        };
      } catch {
        // If trace logs can't be fetched, fall back to backend status
        return { ...batch, inspectionStatus: batch.status || "PENDING_INSPECTION" };
      }
    }),
  );
  return enriched;
}
