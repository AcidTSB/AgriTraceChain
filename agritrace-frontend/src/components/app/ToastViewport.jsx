import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { useToast } from "../../hooks/useToast";

const TOAST_UI = {
  success: {
    label: "Success",
    icon: CheckCircle2,
    iconWrap: "bg-[#dff8ec] text-[#006c49] shadow-sm ring-1 ring-[#bbcabf]/30",
    progress: "bg-gradient-to-r from-[#006c49] to-[#10b981]",
  },
  error: {
    label: "Error",
    icon: CircleAlert,
    iconWrap: "bg-rose-100 text-rose-600 shadow-sm ring-1 ring-rose-200/50",
    progress: "bg-rose-500",
  },
  warning: {
    label: "Warning",
    icon: TriangleAlert,
    iconWrap: "bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-200/50",
    progress: "bg-amber-500",
  },
  info: {
    label: "Info",
    icon: Info,
    iconWrap: "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200/50",
    progress: "bg-blue-500",
  },
  security: {
    label: "Security",
    badge: "CRITICAL",
    icon: ShieldAlert,
    iconWrap: "bg-rose-100 text-rose-600 shadow-sm ring-1 ring-rose-200/50",
    progress: "bg-rose-600",
    pulse: true,
  },
  compromised: {
    label: "Integrity",
    badge: "CHAIN ALERT",
    icon: AlertTriangle,
    iconWrap: "bg-rose-100 text-rose-600 shadow-sm ring-1 ring-rose-200/50",
    progress: "bg-rose-600",
    pulse: true,
  },
};

const viewportVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
};

const toastVariants = {
  initial: (index) => ({
    opacity: 0,
    x: 24,
    y: -6 - index * 4,
    scale: 0.98,
    filter: "blur(6px)",
  }),
  animate: (index) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 520,
      damping: 34,
      mass: 0.9,
      delay: index * 0.045,
    },
  }),
  exit: {
    opacity: 0,
    x: 24,
    scale: 0.98,
    filter: "blur(8px)",
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

function getToastConfig(type) {
  return TOAST_UI[type] ?? TOAST_UI.info;
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function ToastIcon({ icon: Icon, className = "" }) {
  return <Icon className={className} size={18} strokeWidth={2.1} />;
}

function ToastCard({ toast, index, removeToast, reducedMotion }) {
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(toast.durationMs ?? 3200);
  const deadlineRef = useRef(null);
  const intervalRef = useRef(null);
  const remainingRef = useRef(toast.durationMs ?? 3200);
  const toastConfig = useMemo(() => getToastConfig(toast.type), [toast.type]);
  const isPersistent = toast.persist || toast.durationMs === 0;
  const action = toast.action;
  const detail = toast.detail;
  const totalDuration = toast.durationMs ?? 3200;

  useEffect(() => {
    remainingRef.current = totalDuration;
    setRemaining(totalDuration);
    deadlineRef.current = Date.now() + totalDuration;
  }, [toast.id, totalDuration]);

  useEffect(() => {
    window.clearInterval(intervalRef.current);

    if (isPersistent) return undefined;

    if (paused) {
      if (deadlineRef.current != null) {
        remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
        setRemaining(remainingRef.current);
      }
      return undefined;
    }

    deadlineRef.current = Date.now() + remainingRef.current;
    intervalRef.current = window.setInterval(() => {
      if (deadlineRef.current == null) return;
      const nextRemaining = Math.max(0, deadlineRef.current - Date.now());
      remainingRef.current = nextRemaining;
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        window.clearInterval(intervalRef.current);
        removeToast(toast.id);
      }
    }, 50);

    return () => {
      window.clearInterval(intervalRef.current);
    };
  }, [isPersistent, paused, removeToast, toast.id]);

  const handleMouseEnter = () => {
    if (!isPersistent) setPaused(true);
  };

  const handleMouseLeave = () => {
    if (!isPersistent) setPaused(false);
  };

  const handleClick = () => {
    if (typeof action?.onClick === "function") {
      action.onClick();
      if (action.closeOnClick !== false) {
        removeToast(toast.id);
      }
      return;
    }

    if (typeof detail?.onClick === "function") {
      detail.onClick();
      if (detail.closeOnClick !== false) {
        removeToast(toast.id);
      }
    }
  };

  const canAct = Boolean(action?.onClick || detail?.onClick);
  const Icon = toastConfig.icon;
  const badgeLabel = toastConfig.badge ?? (toast.type === "security" ? "CRITICAL" : null);

  return (
    <motion.article
      layout
      custom={index}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={reducedMotion ? undefined : { scale: 1.015 }}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      onHoverStart={handleMouseEnter}
      onHoverEnd={handleMouseLeave}
      onClick={canAct ? handleClick : undefined}
      drag={canAct ? undefined : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 650) {
          removeToast(toast.id);
        }
      }}
      className={`group relative overflow-hidden rounded-[24px] bg-[#f0f3ff]/90 backdrop-blur-[20px] ring-1 ring-[#bbcabf]/20 shadow-[0px_12px_32px_rgba(17,28,45,0.06)] px-5 py-4 font-body pointer-events-auto ${canAct ? "cursor-pointer" : "cursor-default"}`}
      role="status"
      aria-live={toast.type === "error" || toast.type === "security" || toast.type === "compromised" ? "assertive" : "polite"}
      aria-atomic="true"
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(240,243,255,0.82))]" />

      <div className="relative z-10 flex flex-col h-full">
        {toastConfig.pulse && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-[24px] border border-white/20"
            animate={reducedMotion ? undefined : { opacity: [0.16, 0.32, 0.16] }}
            transition={reducedMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${toastConfig.iconWrap}`}>
          <ToastIcon icon={Icon} className="shrink-0" />
        </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-headline text-sm font-semibold tracking-[-0.02em] text-[#111c2d]">{toast.title}</p>
                  {badgeLabel ? (
                    <span className="inline-flex items-center rounded-full border border-rose-500/15 bg-rose-500/10 px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">
                      {badgeLabel}
                    </span>
                  ) : null}
                </div>

                {toast.message ? (
                  <p className="mt-1 font-body text-sm leading-6 text-[#3c4a42]">{toast.message}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeToast(toast.id);
                }}
                className="rounded-full p-1 text-[#64748b] transition-colors hover:bg-black/5 hover:text-[#111c2d]"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-[#64748b]">
              <span>{formatTime(toast.createdAt)}</span>
              {!isPersistent && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={12} />
                  Auto dismiss
                </span>
              )}
            </div>

            {(action?.label || detail?.label) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {action?.label ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      action.onClick?.();
                      if (action.closeOnClick !== false) {
                        removeToast(toast.id);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/50 px-3 py-1.5 font-body text-xs font-semibold text-[#111c2d] transition-colors hover:bg-white"
                  >
                    {action.label}
                  </button>
                ) : null}

                {detail?.label ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      detail.onClick?.();
                      if (detail.closeOnClick !== false) {
                        removeToast(toast.id);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#111c2d] px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-[#3c4a42]"
                  >
                    {detail.label}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isPersistent ? (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] w-full overflow-hidden bg-transparent">
          <motion.div
            className={`h-full origin-left ${toastConfig.progress}`}
            animate={{ scaleX: Math.max(0, remaining / totalDuration) }}
            transition={{ duration: 0.08, ease: "linear" }}
            style={{ transformOrigin: "left center" }}
          />
        </div>
      ) : null}
    </motion.article>
  );
}

export function ToastViewport() {
  const { toasts, removeToast } = useToast();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <motion.div
      variants={viewportVariants}
      initial="hidden"
      animate="visible"
      className="pointer-events-none fixed left-4 right-4 top-16 z-[3000] flex w-auto max-w-[440px] flex-col gap-3 md:left-auto md:right-6 md:top-20 md:w-[clamp(380px,32vw,440px)] lg:top-24"
    >
      <div className="flex w-full flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.slice(0, 4).map((toast, index) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard
                toast={toast}
                index={index}
                removeToast={removeToast}
                reducedMotion={reducedMotion}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>,
    document.body,
  );
}
