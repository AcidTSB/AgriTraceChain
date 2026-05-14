import { useCallback, useMemo } from "react";
import { useUiStore } from "../store/uiStore";

export function useToast() {
  const addToast = useUiStore((state) => state.addToast);
  const removeToast = useUiStore((state) => state.removeToast);
  const toasts = useUiStore((state) => state.toasts);

  const success = useCallback(
    (message, title = "Success") => addToast({ type: "success", title, message }),
    [addToast],
  );

  const error = useCallback(
    (message, title = "Error") => addToast({ type: "error", title, message, durationMs: 3600 }),
    [addToast],
  );

  const info = useCallback(
    (message, title = "Info") => addToast({ type: "info", title, message }),
    [addToast],
  );

  return useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      info,
    }),
    [toasts, addToast, removeToast, success, error, info],
  );
}
