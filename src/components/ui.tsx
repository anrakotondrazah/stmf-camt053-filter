import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "../utils/cn";

/* ───────── Logo ───────── */
export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
        <rect width="34" height="34" rx="9" fill={light ? "#fff" : "#1E3A5F"} />
        <path d="M8 26V14.5L17 8l9 6.5V26" stroke={light ? "#1E3A5F" : "#fff"} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M13 26v-6h8v6" stroke="#C9A227" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className={cn("text-[17px] font-semibold tracking-wide", light ? "text-white" : "text-navy")}>STMF</div>
          <div className={cn("mt-1 text-[10px] font-medium uppercase tracking-[0.14em]", light ? "text-white/70" : "text-slate-500")}>Gestion locative</div>
        </div>
      )}
    </div>
  );
}

/* ───────── Loader matrix ───────── */
export function Loader({ color = "#fff", small = false }: { color?: string; small?: boolean }) {
  return <span role="status" aria-label="Chargement" className={cn("loader inline-block", small && "sm")} style={{ ["--c" as string]: color }} />;
}

/* ───────── Bouton ───────── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "gold" | "ghost" | "danger";
  size?: "md" | "sm";
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}
export function Button({ variant = "default", size = "md", block, loading, icon, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn("neu-btn", variant !== "default" && variant, size === "sm" && "sm", block && "block", className)}
    >
      {loading ? <Loader small color={variant === "primary" || variant === "gold" ? "#fff" : "#1E3A5F"} /> : icon}
      {children}
    </button>
  );
}

/* ───────── Toggle ───────── */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" />
      </span>
      {label}
    </label>
  );
}

/* ───────── Badge de statut ───────── */
export function StatusBadge({ status }: { status: "clear" | "ambiguous" | "error" }) {
  const map = {
    clear: { cls: "bg-[#E6FFED] text-[#22543D]", label: "Clair", Icon: CheckCircle2 },
    ambiguous: { cls: "bg-[#FFF5E6] text-[#C05621]", label: "Ambigu", Icon: AlertTriangle },
    error: { cls: "bg-[#FFF5F5] text-[#9B2C2C]", label: "Erreur", Icon: XCircle },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", map.cls)}>
      <map.Icon size={14} strokeWidth={2} />
      {map.label}
    </span>
  );
}

/* ───────── Checkmark animé ───────── */
export function AnimatedCheck({ size = 56, color = "#38A169" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle className="circle-draw" cx="28" cy="28" r="25" stroke={color} strokeWidth="2.5" />
      <path className="check-draw" d="M17 29l7.5 7.5L39 21" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── Compteur animé ───────── */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format ? format(v) : Math.round(v)}</>;
}

/* ───────── Tooltip léger ───────── */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

/* ───────── Overlay de traitement ───────── */
export function ProcessingOverlay({ steps, label }: { steps: string[]; label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 650);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/80 backdrop-blur-md animate-fade-up" role="alert" aria-live="polite">
      <div className="flex flex-col items-center gap-7 px-6 text-center">
        <Loader />
        <div>
          {label && <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/60">{label}</p>}
          <p key={i} className="animate-fade-up text-lg font-medium text-white">{steps[i]}</p>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={cn("h-1.5 rounded-full transition-all duration-300", k <= i ? "w-6 bg-gold" : "w-1.5 bg-white/30")} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Toasts ───────── */
type ToastKind = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; kind: ToastKind; title: string; text?: string }
const ToastCtx = createContext<(kind: ToastKind, title: string, text?: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: ToastKind, title: string, text?: string) => {
      const id = ++idRef.current;
      setItems((l) => [...l.slice(-3), { id, kind, title, text }]);
      setTimeout(() => dismiss(id), 4800);
    },
    [dismiss],
  );
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
  const colors = { success: "text-sage", error: "text-brick", info: "text-sky", warning: "text-[#C05621]" };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5 md:top-24">
        {items.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto relative animate-toast-in overflow-hidden rounded-2xl border border-black/5 bg-white p-4 pr-10 shadow-[0_10px_30px_rgba(30,58,95,0.15)]">
              <div className="flex gap-3">
                <Icon className={cn("mt-0.5 shrink-0", colors[t.kind])} size={20} />
                <div>
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.text && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{t.text}</p>}
                </div>
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="absolute right-3 top-3 text-slate-400 hover:text-ink">
                <X size={16} />
              </button>
              <span className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left bg-current opacity-60", colors[t.kind])} style={{ animation: "shrink 4.8s linear forwards" }} />
            </div>
          );
        })}
      </div>
      <style>{`@keyframes shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </ToastCtx.Provider>
  );
}
