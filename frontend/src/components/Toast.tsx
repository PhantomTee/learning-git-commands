"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface ToastLink { href: string; label: string; }

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  link?: ToastLink;
  duration?: number;   // ms — 0 = persistent until manually dismissed
}

interface ToastCtx {
  toast:   (opts: Omit<Toast, "id">) => number;
  update:  (id: number, patch: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: number) => void;
  success: (title: string, message?: string, link?: ToastLink) => number;
  error:   (title: string, message?: string, link?: ToastLink) => number;
  info:    (title: string, message?: string, link?: ToastLink) => number;
  warning: (title: string, message?: string, link?: ToastLink) => number;
  loading: (title: string, message?: string, link?: ToastLink) => number;
}

const Ctx = createContext<ToastCtx | null>(null);

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ToastType, { icon: string; border: string; glow: string; label: string }> = {
  success: { icon: "✓",  border: "rgba(74,222,128,0.4)",  glow: "rgba(74,222,128,0.12)",  label: "text-green-400"  },
  error:   { icon: "✕",  border: "rgba(220,38,38,0.5)",   glow: "rgba(220,38,38,0.12)",   label: "text-red-400"    },
  info:    { icon: "i",  border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.10)",  label: "text-amber-400"  },
  warning: { icon: "!",  border: "rgba(251,191,36,0.5)",  glow: "rgba(251,191,36,0.12)",  label: "text-yellow-400" },
  loading: { icon: "…",  border: "rgba(245,158,11,0.3)",  glow: "rgba(245,158,11,0.08)",  label: "text-amber-300"  },
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 6000,
  error:   8000,
  info:    4000,
  warning: 5000,
  loading: 0,     // persistent — caller must dismiss
};

// ── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_CONFIG[toast.type];

  const leave = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const duration = toast.duration ?? DEFAULT_DURATION[toast.type];
    if (duration > 0) {
      const t = setTimeout(leave, duration);
      return () => clearTimeout(t);
    }
  }, [toast.duration, toast.type, leave]);

  return (
    <div
      onClick={() => leave()}
      style={{
        background: "#120d10",
        border: `2px solid ${cfg.border}`,
        boxShadow: "5px 5px 0 rgba(0,0,0,0.85)",
        transition: "opacity 120ms steps(2), transform 120ms steps(2)",
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? "translateX(0)" : "translateX(100%)",
        cursor: "pointer",
        width: "min(360px, calc(100vw - 2rem))",
      }}
      className="p-4 select-none pixel-frame"
    >
      {/* Top gold line */}
      <div className="h-0.5 mb-3" style={{ background: `repeating-linear-gradient(90deg, transparent 0 8px, ${cfg.border} 8px 16px, transparent 16px 24px)` }} />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-xl shrink-0 mt-0.5"
          style={{ textShadow: toast.type === "loading" ? undefined : `2px 2px 0 rgba(0,0,0,0.9)` }}>
          {cfg.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-display font-bold text-sm tracking-wider ${cfg.label}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-amber-200/50 mt-0.5 leading-relaxed font-display">
              {toast.message}
            </p>
          )}
          {toast.link && (
            <a
              href={toast.link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1.5 text-xs font-display tracking-wider text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              {toast.link.label} ↗
            </a>
          )}
        </div>

        {/* Dismiss X */}
        <button
          onClick={(e) => { e.stopPropagation(); leave(); }}
          className="text-amber-900/50 hover:text-amber-400 text-lg leading-none shrink-0 transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Loading pulse bar */}
      {toast.type === "loading" && (
        <div className="mt-3 h-1 overflow-hidden" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="h-full animate-pulse"
            style={{ background: "repeating-linear-gradient(90deg,#d97706 0 8px,#fcd34d 8px 16px)", width: "60%",
              animation: "shimmer 1.5s infinite" }} />
        </div>
      )}
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const update = useCallback((id: number, patch: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastCtx = {
    toast, update, dismiss,
    success: (title, message, link) => toast({ type: "success", title, message, link }),
    error:   (title, message, link) => toast({ type: "error",   title, message, link }),
    info:    (title, message, link) => toast({ type: "info",    title, message, link }),
    warning: (title, message, link) => toast({ type: "warning", title, message, link }),
    loading: (title, message, link) => toast({ type: "loading", title, message, link }),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {/* Portal-like fixed container — top-right on desktop, bottom on mobile */}
      <div className="fixed z-[100] flex flex-col gap-3 pointer-events-none
        bottom-4 left-4 right-4
        sm:top-[72px] sm:bottom-auto sm:right-4 sm:left-auto sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
