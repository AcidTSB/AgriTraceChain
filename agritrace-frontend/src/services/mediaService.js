import { publicClient, unwrapApiResponse } from "./apiClient";

export const mediaService = {
  async getBatchQrBase64(batchCode) {
    const response = await publicClient.get(`/api/v1/media/qr/${encodeURIComponent(batchCode)}/base64`);
    const payload = unwrapApiResponse(response);
    return typeof payload === "string" ? payload : "";
  },
};
