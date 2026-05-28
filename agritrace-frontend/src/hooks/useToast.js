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

  const security = useCallback(
    (message, title = "Security alert", options = {}) =>
      addToast({
        type: "security",
        title,
        message,
        durationMs: options.durationMs,
        action: options.action,
        detail: options.detail,
        persist: options.persist,
      }),
    [addToast],
  );

  const compromised = useCallback(
    (message, title = "Blockchain compromised", options = {}) =>
      addToast({
        type: "compromised",
        title,
        message,
        durationMs: options.durationMs,
        action: options.action,
        detail: options.detail,
        persist: options.persist ?? true,
      }),
    [addToast],
  );

  const notify = useCallback((toast) => addToast(toast), [addToast]);

  return useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      info,
      security,
      compromised,
      notify,
    }),
    [toasts, addToast, removeToast, success, error, info, security, compromised, notify],
  );
}
