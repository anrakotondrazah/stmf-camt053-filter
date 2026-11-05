import { useEffect, useRef, useState } from "react";
import { FileUp, LayoutList, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import type { Session } from "../lib/backend";
import { getTheme, setTheme, type Theme } from "../lib/backend";
import { Logo } from "./ui";
import { cn } from "../utils/cn";

export type Route = "home" | "results" | "auth";

interface Props {
  route: Route;
  session: Session;
  hasResult: boolean;
  onNav: (r: Route) => void;
  onLogout: () => void;
}

function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>(getTheme);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setLocalTheme(next);
    setTheme(next);
  };

  return (
    <label className="switch" title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}>
      <input id="input" type="checkbox" checked={theme === "dark"} onChange={toggle} />
      <span className="slider round">
        <span className="sun-moon">
          <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
          <svg id="light-ray-1" viewBox="0 0 100 100"><polygon points="50 0, 55 40, 50 50, 45 40" /><polygon points="50 100, 55 60, 50 50, 45 60" /><polygon points="0 50, 40 55, 50 50, 40 45" /><polygon points="100 50, 60 55, 50 50, 60 45" /></svg>
          <svg id="light-ray-2" viewBox="0 0 100 100"><polygon points="15 15, 45 40, 50 50, 40 45" /><polygon points="85 85, 55 60, 50 50, 60 55" /><polygon points="85 15, 60 45, 50 50, 55 40" /><polygon points="15 85, 40 55, 50 50, 45 60" /></svg>
          <svg id="light-ray-3" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
        </span>
        <span className="stars">
          <svg id="star-1" className="star" viewBox="0 0 20 20"><path d="M10 0l2.35 6.65L20 7.65l-5.5 4.65 1.65 7.7L10 15.35 3.85 20l1.65-7.7L0 7.65l7.65-1z" /></svg>
          <svg id="star-2" className="star" viewBox="0 0 20 20"><path d="M10 0l2.35 6.65L20 7.65l-5.5 4.65 1.65 7.7L10 15.35 3.85 20l1.65-7.7L0 7.65l7.65-1z" /></svg>
          <svg id="star-3" className="star" viewBox="0 0 20 20"><path d="M10 0l2.35 6.65L20 7.65l-5.5 4.65 1.65 7.7L10 15.35 3.85 20l1.65-7.7L0 7.65l7.65-1z" /></svg>
          <svg id="star-4" className="star" viewBox="0 0 20 20"><path d="M10 0l2.35 6.65L20 7.65l-5.5 4.65 1.65 7.7L10 15.35 3.85 20l1.65-7.7L0 7.65l7.65-1z" /></svg>
        </span>
        <svg id="cloud-1" className="cloud-light" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
        <svg id="cloud-2" className="cloud-light" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
        <svg id="cloud-3" className="cloud-light" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
        <svg id="cloud-4" className="cloud-dark" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
        <svg id="cloud-5" className="cloud-dark" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
        <svg id="cloud-6" className="cloud-dark" viewBox="0 0 100 60"><ellipse cx="50" cy="35" rx="40" ry="25" /><ellipse cx="25" cy="40" rx="25" ry="20" /><ellipse cx="75" cy="40" rx="25" ry="20" /></svg>
      </span>
    </label>
  );
}

function UserMenu({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = session.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm ring-1 ring-black/5 transition hover:ring-black/10 dark:bg-slate-800 dark:ring-slate-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">{initials}</span>
        <span className="hidden text-sm font-medium text-ink sm:inline dark:text-white">{session.name.split(" ")[0]}</span>
        <ShieldCheck size={16} className="text-sage" aria-label="2FA active" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-up rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5 dark:bg-slate-800 dark:ring-slate-700">
          <div className="border-b border-black/5 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-medium text-ink dark:text-white">{session.name}</p>
            <p className="text-xs text-slate-500">{session.email}</p>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm text-slate-600 dark:text-slate-300">Mode sombre</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brick hover:bg-brick/5"
          >
            <LogOut size={16} /> Deconnexion
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ route, session, hasResult, onNav, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [route]);

  const links: { r: Route; label: string; icon: typeof FileUp; disabled?: boolean }[] = [
    { r: "home", label: "Traiter un fichier", icon: FileUp },
    { r: "results", label: "Resultats", icon: LayoutList, disabled: !hasResult },
  ];

  return (
    <>
      <header className="glass-bar fixed inset-x-0 top-0 z-50 border-b border-black/5 dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
          <button onClick={() => onNav("home")} aria-label="Accueil STMF" className="rounded-lg focus-visible:outline-2 focus-visible:outline-sky">
            <Logo />
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {links.map((l) => (
              <button
                key={l.r}
                disabled={l.disabled}
                onClick={() => onNav(l.r)}
                className={cn(
                  "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  route === l.r ? "text-navy dark:text-white" : "text-slate-500 hover:text-navy dark:hover:text-white",
                )}
              >
                {l.label}
                {route === l.r && <span className="absolute inset-x-4 -bottom-[13px] h-0.5 rounded-full bg-gold" />}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <UserMenu session={session} onLogout={onLogout} />
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-navy hover:bg-black/5 md:hidden dark:text-white dark:hover:bg-white/5"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* menu mobile */}
        <div className={cn("overflow-hidden border-t border-black/5 bg-white/95 transition-all duration-300 md:hidden dark:border-slate-700 dark:bg-slate-900/95", menuOpen ? "max-h-80" : "max-h-0 border-transparent")}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 p-3 px-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                {session.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink dark:text-white">{session.name}</p>
                <p className="truncate text-xs text-slate-500">{session.email}</p>
              </div>
              <ShieldCheck size={16} className="text-sage" />
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Mode sombre</span>
              <ThemeToggle />
            </div>
            <hr className="my-1 border-black/5 dark:border-slate-700" />
            {links.map((l) => (
              <button key={l.r} disabled={l.disabled} onClick={() => onNav(l.r)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-ink hover:bg-sky/10 disabled:opacity-40 dark:text-white dark:hover:bg-sky/20">
                <l.icon size={18} className="text-sky" /> {l.label}
              </button>
            ))}
            <hr className="my-1 border-black/5 dark:border-slate-700" />
            <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-brick hover:bg-brick/5">
              <LogOut size={18} /> Deconnexion
            </button>
          </div>
        </div>
      </header>

      {/* tab bar iOS (mobile) - seulement navigation, pas auth */}
      <nav className="glass-bar fixed inset-x-0 bottom-0 z-50 border-t border-black/5 pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-700 dark:bg-slate-900/90" aria-label="Navigation mobile">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
          {links.map((t) => (
            <li key={t.r}>
              <button
                disabled={t.disabled}
                onClick={() => onNav(t.r)}
                className={cn("flex w-20 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors disabled:opacity-35", route === t.r ? "text-navy dark:text-white" : "text-slate-400")}
              >
                <t.icon size={22} strokeWidth={route === t.r ? 2.2 : 1.7} />
                {t.label.split(" ")[0]}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
