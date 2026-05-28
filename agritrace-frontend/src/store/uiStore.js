import { create } from "zustand";

let nextToastId = 1;

const DEFAULT_TOAST_DURATIONS = {
  success: 3200,
  error: 4800,
  warning: 4200,
  info: 3600,
  security: 6500,
  compromised: 7800,
};

function getDefaultDuration(type) {
  return DEFAULT_TOAST_DURATIONS[type] ?? DEFAULT_TOAST_DURATIONS.info;
}

export const useUiStore = create((set) => ({
  toasts: [],

  addToast(toast) {
    const type = toast?.type ?? "info";
    const id = nextToastId++;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          type,
          title: toast?.title ?? "Notice",
          message: toast?.message ?? "",
          durationMs: toast?.durationMs ?? getDefaultDuration(type),
          createdAt: toast?.createdAt ?? Date.now(),
          action: toast?.action ?? null,
          detail: toast?.detail ?? null,
          dismissible: toast?.dismissible ?? true,
          persist: toast?.persist ?? false,
        },
      ],
    }));
    return id;
  },

  removeToast(id) {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    }));
  },
}));
