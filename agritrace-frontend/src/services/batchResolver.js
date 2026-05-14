import { apiClient, unwrapApiResponse } from "./apiClient";

const batchIdCache = new Map();
const inflightMap = new Map();

export async function resolveBatchId(batchCode) {
  const key = batchCode?.trim();
  if (!key) {
    throw new Error("Batch code is required.");
  }

  if (batchIdCache.has(key)) {
    return batchIdCache.get(key);
  }

  if (inflightMap.has(key)) {
    return inflightMap.get(key);
  }

  const pending = apiClient
    .get(`/api/v1/batches/${encodeURIComponent(key)}`)
    .then((response) => {
      const data = unwrapApiResponse(response);
      const id = data?.id;
      if (!id) {
        throw new Error("Cannot resolve batchId from batchCode.");
      }
      batchIdCache.set(key, id);
      return id;
    })
    .finally(() => {
      inflightMap.delete(key);
    });

  inflightMap.set(key, pending);
  return pending;
}

export function clearBatchResolver(batchCode) {
  if (batchCode) {
    const key = batchCode.trim();
    batchIdCache.delete(key);
    inflightMap.delete(key);
    return;
  }

  batchIdCache.clear();
  inflightMap.clear();
}
