import { create } from "zustand";

let nextToastId = 1;

export const useUiStore = create((set) => ({
  toasts: [],

  addToast(toast) {
    const id = nextToastId++;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          type: toast?.type ?? "info",
          title: toast?.title ?? "Notice",
          message: toast?.message ?? "",
          durationMs: toast?.durationMs ?? 2800,
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
