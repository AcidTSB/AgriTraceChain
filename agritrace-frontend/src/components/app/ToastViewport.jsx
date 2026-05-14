import { useEffect } from "react";
import { useToast } from "../../hooks/useToast";

function styleByType(type) {
  if (type === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (type === "error") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-sky-200 bg-sky-50 text-sky-900";
}

export function ToastViewport() {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.durationMs),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,420px)] flex-col gap-2">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${styleByType(toast.type)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded p-1 text-xs transition-colors hover:bg-black/10"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
