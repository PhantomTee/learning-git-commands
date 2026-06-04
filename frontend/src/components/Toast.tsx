"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;   // ms — 0 = persistent until manually dismissed
}

interface ToastCtx {
  toast: (opts: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
  success: (title: string, message?: string) => number;
  error:   (title: string, message?: string) => number;
  info:    (title: string, message?: string) => number;
  warning: (title: string, message?: string) => number;
  loading: (title: string, message?: string) => number;
}

const Ctx = createContext<ToastCtx | null>(null);

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ToastType, { icon: string; border: string; glow: string; label: string }> = {
  success: { icon: "✅", border: "rgba(74,222,128,0.4)",  glow: "rgba(74,222,128,0.12)",  label: "text-green-400"  },
  error:   { icon: "💀", border: "rgba(220,38,38,0.5)",   glow: "rgba(220,38,38,0.12)",   label: "text-red-400"    },
  info:    { icon: "📜", border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.10)",  label: "text-amber-400"  },
  warning: { icon: "⚠️", border: "rgba(251,191,36,0.5)",  glow: "rgba(251,191,36,0.12)",  label: "text-yellow-400" },
  loading: { icon: "⏳", border: "rgba(245,158,11,0.3)",  glow: "rgba(245,158,11,0.08)",  label: "text-amber-300"  },
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error:   6000,
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
        background: "linear-gradient(135deg,#1f1520 0%,#150f18 100%)",
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 24px ${cfg.glow}, 0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(245,158,11,0.06)`,
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(100%) scale(0.9)",
        cursor: "pointer",
        width: "min(360px, calc(100vw - 2rem))",
      }}
      className="rounded-xl p-4 select-none"
    >
      {/* Top gold line */}
      <div className="h-px mb-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }} />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-xl shrink-0 mt-0.5"
          style={{ filter: toast.type === "loading" ? undefined : `drop-shadow(0 0 6px ${cfg.border})` }}>
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
        <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(245,158,11,0.1)" }}>
          <div className="h-full rounded-full animate-pulse"
            style={{ background: "linear-gradient(90deg,#d97706,#fcd34d,#d97706)", width: "60%",
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

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastCtx = {
    toast, dismiss,
    success: (title, message) => toast({ type: "success", title, message }),
    error:   (title, message) => toast({ type: "error",   title, message }),
    info:    (title, message) => toast({ type: "info",    title, message }),
    warning: (title, message) => toast({ type: "warning", title, message }),
    loading: (title, message) => toast({ type: "loading", title, message }),
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
