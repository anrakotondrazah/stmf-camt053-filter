import { useCallback, useEffect, useState } from "react";
import { Header, type Route } from "./components/Header";
import { ProcessingOverlay, ToastProvider, useToast } from "./components/ui";
import { Home } from "./pages/Home";
import { Results } from "./pages/Results";
import { Auth } from "./pages/Auth";
import { addHistory, clearHistory, getSession, initTheme, listHistory, logout, type HistoryItem, type Session } from "./lib/backend";
import { parseCamt, type ParsedStatement } from "./lib/camt";

const STEPS = ["Lecture du fichier...", "Analyse des ecritures...", "Classification des virements...", "Preparation des exports..."];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [route, setRoute] = useState<Route>(() => (getSession() ? "home" : "auth"));
  const [data, setData] = useState<ParsedStatement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const s = getSession();
    return s ? listHistory(s.email) : [];
  });

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  useEffect(() => {
    if (!session && route !== "auth") {
      setRoute("auth");
    }
  }, [session, route]);

  const process = useCallback(
    async (file: File, s: Session) => {
      setProcessing(true);
      setRoute("home");
      try {
        const [text] = await Promise.all([file.text(), wait(2600)]);
        const parsed = parseCamt(text, file.name, file.size);
        const t = parsed.transactions;
        setHistory(
          addHistory(s.email, {
            fileName: file.name,
            total: t.length,
            clear: t.filter((x) => x.status === "clear").length,
            ambiguous: t.filter((x) => x.status === "ambiguous").length,
            errors: t.filter((x) => x.status === "error").length,
            amount: t.filter((x) => x.direction === "CRDT" && x.status !== "error").reduce((a, x) => a + x.amount, 0),
          }),
        );
        setData(parsed);
        setRoute("results");
        toast("success", "Analyse terminee", `${t.length} ecritures traitees.`);
      } catch (e) {
        toast("error", "Analyse impossible", e instanceof Error ? e.message : "Fichier illisible.");
      } finally {
        setProcessing(false);
      }
    },
    [toast],
  );

  const onAnalyze = (file: File) => {
    if (!session) return;
    process(file, session);
  };

  const onAuth = (s: Session) => {
    setSession(s);
    setHistory(listHistory(s.email));
    setRoute("home");
  };

  const onLogout = () => {
    logout();
    setSession(null);
    setData(null);
    setHistory([]);
    setRoute("auth");
    toast("info", "Deconnexion", "A bientot !");
  };

  const nav = (r: Route) => {
    if (!session && r !== "auth") return;
    if (r === "results" && !data) return;
    setRoute(r);
  };

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-paper dark:bg-slate-900">
        <Auth onSuccess={onAuth} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper dark:bg-slate-900">
      <Header route={route} session={session} hasResult={!!data} onNav={nav} onLogout={onLogout} />
      <main className="flex-1">
        {route === "home" && (
          <Home
            session={session}
            history={history}
            onAnalyze={onAnalyze}
            onClearHistory={() => {
              if (session) clearHistory(session.email);
              setHistory([]);
              toast("info", "Historique efface");
            }}
          />
        )}
        {route === "results" && data && <Results data={data} onNew={() => setRoute("home")} />}
      </main>
      <footer className="mb-16 border-t border-black/5 py-6 text-center text-xs text-slate-400 md:mb-0 dark:border-white/10 dark:text-slate-500">
        {new Date().getFullYear()} STMF Gestion locative - Donnees bancaires traitees localement
      </footer>
      {processing && <ProcessingOverlay steps={STEPS} label="Traitement en cours" />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
