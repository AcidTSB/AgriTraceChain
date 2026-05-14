import axios from "axios";

const API_BASE_URL = "http://localhost:8080";
const AUTH_STORAGE_KEY = "agritrace-auth-storage";

function parseAuthStorage() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  const parsed = parseAuthStorage();
  return parsed?.state?.accessToken ?? null;
}

function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function emitApiEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function unwrapApiResponse(response) {
  return response?.data?.data ?? response?.data;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function handleResponseError(error) {
  // Bắt lỗi mất kết nối mạng (Network Error / Offline)
  if (error.code === 'ERR_NETWORK' || !error.response) {
    emitApiEvent("api:network-error", { message: "Mất kết nối mạng" });
    error.userMessage = "Mất kết nối mạng. Vui lòng kiểm tra lại đường truyền Wi-Fi/4G!";
    return Promise.reject(error);
  }

  const status = error?.response?.status;

  if (status === 401) {
    clearAuthStorage();
    emitApiEvent("api:unauthorized", { status });
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  if (status === 403) {
    emitApiEvent("api:forbidden", { status, message: "You do not have permission." });
    error.userMessage = "You do not have permission to perform this action.";
  }

  if (status === 404) {
    error.userMessage = error?.response?.data?.message ?? "Resource not found.";
  }

  if (status >= 500) {
    emitApiEvent("api:server-error", {
      status,
      message: "Server error. Please try again.",
    });
    error.userMessage = "Server error. Please try again.";
  }

  return Promise.reject(error);
}

apiClient.interceptors.response.use((response) => response, handleResponseError);
publicClient.interceptors.response.use((response) => response, handleResponseError);

export { apiClient, publicClient, unwrapApiResponse, clearAuthStorage, AUTH_STORAGE_KEY };
