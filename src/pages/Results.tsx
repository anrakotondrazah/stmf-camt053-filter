import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Download, Euro, FileSpreadsheet, FileUp, List, Search, SearchX,
} from "lucide-react";
import { AnimatedCheck, Button, CountUp, StatusBadge, Toggle, Tip, useToast } from "../components/ui";
import { downloadFilteredXml, exportAmbiguousExcel, fmtDate, fmtEUR, type ParsedStatement, type Transaction, type TxStatus } from "../lib/camt";
import { cn } from "../utils/cn";

type SortKey = "date" | "counterparty" | "remittance" | "amount" | "status";
const PAGE = 8;
const rank: Record<TxStatus, number> = { clear: 0, ambiguous: 1, error: 2 };

export function Results({ data, onNew }: { data: ParsedStatement; onNew: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | TxStatus>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: 1 });
  const [page, setPage] = useState(1);
  const [withAmbiguous, setWithAmbiguous] = useState(false);
  const [busy, setBusy] = useState<"xml" | "xls" | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 750);
    return () => clearTimeout(t);
  }, [data]);

  const tx = data.transactions;
  const stats = useMemo(() => {
    const clear = tx.filter((t) => t.status === "clear");
    const amb = tx.filter((t) => t.status === "ambiguous");
    const err = tx.filter((t) => t.status === "error");
    const credits = tx.filter((t) => t.direction === "CRDT" && t.status !== "error").reduce((s, t) => s + t.amount, 0);
    const clearCredits = clear.filter((t) => t.direction === "CRDT").reduce((s, t) => s + t.amount, 0);
    return { clear: clear.length, amb: amb.length, err: err.length, credits, clearCredits };
  }, [tx]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = tx.filter(
      (t) =>
        (filter === "all" || t.status === filter) &&
        (!needle || [t.counterparty, t.remittance, t.reference, t.iban, String(t.amount)].some((v) => v.toLowerCase().includes(needle))),
    );
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      let r = 0;
      if (key === "amount") r = a.amount - b.amount;
      else if (key === "status") r = rank[a.status] - rank[b.status];
      else r = String(a[key]).localeCompare(String(b[key]), "fr");
      return r * dir || a.id - b.id;
    });
  }, [tx, q, filter, sort]);

  useEffect(() => { setPage(1); }, [q, filter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice((page - 1) * PAGE, page * PAGE);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const run = (kind: "xml" | "xls") => {
    setBusy(kind);
    setTimeout(() => {
      try {
        if (kind === "xml") {
          downloadFilteredXml(data, withAmbiguous);
          const n = stats.clear + (withAmbiguous ? stats.amb : 0);
          toast("success", "camt.053 filtré téléchargé", `${n} écriture${n > 1 ? "s" : ""} conservée${n > 1 ? "s" : ""}.`);
          setDone(true);
          setTimeout(() => setDone(false), 2600);
        } else {
          const n = exportAmbiguousExcel(data);
          if (n === 0) toast("info", "Rien à exporter", "Aucune écriture ambiguë dans ce relevé.");
          else toast("success", "Export Excel prêt", `${n} ligne${n > 1 ? "s" : ""} à vérifier.`);
        }
      } catch {
        toast("error", "Échec de l'export", "Veuillez réessayer.");
      }
      setBusy(null);
    }, 700);
  };

  const cards = [
    { label: "Total transactions", icon: List, value: tx.length, tone: "text-navy bg-navy/8", sub: `${stats.err} en erreur` },
    { label: "Virements clairs", icon: CheckCircle2, value: stats.clear, tone: "text-sage bg-sage/10", sub: `${Math.round((stats.clear / tx.length) * 100)} % du relevé` },
    { label: "Virements ambigus", icon: AlertTriangle, value: stats.amb, tone: "text-[#C05621] bg-[#FFF5E6]", sub: "à vérifier manuellement" },
    { label: "Montant total", icon: Euro, value: stats.credits, money: true, tone: "text-[#8a6d12] bg-gold/12", sub: `dont ${fmtEUR(stats.clearCredits)} clairs` },
  ];

  const filters: { k: "all" | TxStatus; label: string; n: number }[] = [
    { k: "all", label: "Tous", n: tx.length },
    { k: "clear", label: "Clairs", n: stats.clear },
    { k: "ambiguous", label: "Ambigus", n: stats.amb },
    { k: "error", label: "Erreurs", n: stats.err },
  ];

  const th = (k: SortKey, children: string, right?: boolean) => (
    <th scope="col" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500", right && "text-right")}>
      <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 uppercase hover:text-navy", sort.key === k && "text-navy")}>
        {children}
        <ArrowUp size={12} className={cn("transition-transform duration-200", sort.key === k ? "opacity-100" : "opacity-0", sort.key === k && sort.dir === -1 && "rotate-180")} />
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-24 md:px-6 md:pb-16 md:pt-28">
      <div className="mb-6 flex animate-fade-up flex-col gap-1">
        <h1 className="text-[26px] font-semibold tracking-tight text-navy md:text-[30px]">Résultat du traitement</h1>
        <p className="text-sm text-slate-500">
          <span className="font-medium text-ink">{data.fileName}</span>
          {data.accountIban && <> · IBAN {data.accountIban.replace(/(.{4})/g, "$1 ").trim()}</>}
        </p>
      </div>

      {/* stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Résumé">
        {cards.map((c, i) => (
          <div key={c.label} className="card animate-fade-up p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate-500">{c.label}</p>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", c.tone)}>
                <c.icon size={18} strokeWidth={1.8} />
              </span>
            </div>
            {loading ? (
              <>
                <div className="skeleton mt-4 h-8 w-24" />
                <div className="skeleton mt-3 h-3.5 w-32" />
              </>
            ) : (
              <>
                <p className="mt-3 text-[28px] font-semibold tabular-nums leading-none text-navy">
                  <CountUp value={c.value} format={c.money ? (n) => fmtEUR(n) : undefined} />
                </p>
                <p className="mt-2 text-xs text-slate-400">{c.sub}</p>
              </>
            )}
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* table */}
        <section className="card min-w-0 animate-fade-up p-4 [animation-delay:200ms] md:p-6" aria-label="Transactions">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 scroll-thin" role="tablist">
              {filters.map((f) => (
                <button
                  key={f.k}
                  role="tab"
                  aria-selected={filter === f.k}
                  onClick={() => setFilter(f.k)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                    filter === f.k ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy",
                  )}
                >
                  {f.label}
                  <span className="rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums">{f.n}</span>
                </button>
              ))}
            </div>
            <div className="relative md:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher une transaction"
                className="w-full rounded-xl bg-slate-100 py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky/50"
              />
            </div>
          </div>

          {/* desktop table */}
          <div className="scroll-thin mt-4 hidden overflow-x-auto rounded-xl border border-black/5 md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[#F1F5F9]">
                <tr>
                  {th("date", "Date")}
                  {th("counterparty", "Donneur d'ordre")}
                  {th("remittance", "Libellé / référence")}
                  {th("amount", "Montant", true)}
                  {th("status", "Statut")}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-black/5">
                        {[70, 130, 200, 80, 70].map((w, j) => (
                          <td key={j} className="px-4 py-4"><div className="skeleton h-4" style={{ width: w }} /></td>
                        ))}
                      </tr>
                    ))
                  : view.map((t, i) => <Row key={t.id} t={t} odd={i % 2 === 1} />)}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <li key={i} className="skeleton h-24" />)
              : view.map((t) => (
                  <li key={t.id} className="rounded-2xl border border-black/5 bg-[#FAFBFC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{t.counterparty || "Donneur d'ordre inconnu"}</p>
                        <p className="text-xs text-slate-400">{fmtDate(t.date)}</p>
                      </div>
                      <p className={cn("shrink-0 text-[15px] font-semibold tabular-nums", t.amount < 0 ? "text-brick" : "text-navy")}>{fmtEUR(t.amount, t.currency)}</p>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-600">{t.remittance || <span className="italic text-slate-400">Pas de libellé</span>}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StatusBadge status={t.status} />
                      {t.reasons[0] && <span className="truncate text-right text-[11px] text-[#C05621]">{t.reasons.join(" · ")}</span>}
                    </div>
                  </li>
                ))}
          </ul>

          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
              <SearchX size={36} strokeWidth={1.4} />
              <p className="text-sm">Aucune transaction ne correspond à votre recherche.</p>
              <button onClick={() => { setQ(""); setFilter("all"); }} className="text-sm font-medium text-sky hover:underline">Réinitialiser les filtres</button>
            </div>
          )}

          {/* pagination iOS */}
          {rows.length > PAGE && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="hidden text-xs text-slate-400 sm:block">
                {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, rows.length)} sur {rows.length}
              </p>
              <div className="mx-auto flex items-center gap-2 sm:mx-0">
                <button aria-label="Page précédente" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-navy transition hover:bg-slate-200 disabled:opacity-40">
                  <ChevronLeft size={18} />
                </button>
                <span className="rounded-full bg-navy px-4 py-1.5 text-[13px] font-semibold tabular-nums text-white">{page} / {pages}</span>
                <button aria-label="Page suivante" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-navy transition hover:bg-slate-200 disabled:opacity-40">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* actions */}
        <aside className="h-fit animate-fade-up space-y-4 [animation-delay:300ms] lg:sticky lg:top-24">
          <div className="card p-5 md:p-6">
            <h2 className="text-[17px] font-medium text-navy">Actions</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">Exportez le relevé nettoyé ou la liste des cas à vérifier.</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
              <Toggle checked={withAmbiguous} onChange={setWithAmbiguous} label="Inclure les ambigus" />
              <p className="mt-2 pl-[56px] text-xs text-slate-400">
                {stats.clear + (withAmbiguous ? stats.amb : 0)} écriture(s) dans le camt.053 filtré.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <Button variant="primary" block loading={busy === "xml"} disabled={loading} onClick={() => run("xml")} icon={done ? <span className="-my-1 scale-[0.4]"><AnimatedCheck size={40} color="#fff" /></span> : <Download size={17} />}>
                camt.053 filtré
              </Button>
              <Tip text={stats.amb + stats.err === 0 ? "Aucun cas ambigu" : `${stats.amb + stats.err} ligne(s) à vérifier`}>
                <Button block loading={busy === "xls"} disabled={loading} onClick={() => run("xls")} icon={<FileSpreadsheet size={17} />}>
                  Exporter ambigus
                </Button>
              </Tip>
              <Button variant="ghost" block onClick={onNew} icon={<FileUp size={17} />}>Nouveau fichier</Button>
            </div>
          </div>
          {stats.err > 0 && (
            <div className="rounded-2xl border border-brick/15 bg-[#FFF5F5] p-4 text-[13px] leading-relaxed text-[#9B2C2C]">
              <strong className="font-semibold">{stats.err} écriture(s) en erreur</strong> (montant ou date illisible) sont exclues du relevé filtré et listées dans l'export Excel.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ t, odd }: { t: Transaction; odd: boolean }) {
  return (
    <tr className={cn("tbl-row border-t border-black/5", odd ? "bg-[#FAFBFC]" : "bg-white")}>
      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-600">{fmtDate(t.date)}</td>
      <td className="px-4 py-3.5">
        <p className={cn("font-medium", t.counterparty ? "text-ink" : "italic text-slate-400")}>{t.counterparty || "Inconnu"}</p>
        {t.iban && <p className="font-mono text-[11px] text-slate-400">{t.iban.slice(0, 4)} •••• {t.iban.slice(-4)}</p>}
      </td>
      <td className="max-w-[280px] px-4 py-3.5">
        <p className="truncate text-slate-600" title={t.remittance}>{t.remittance || <span className="italic text-slate-400">Pas de libellé</span>}</p>
        {t.reference && <p className="font-mono text-[11px] text-slate-400">{t.reference}</p>}
      </td>
      <td className={cn("whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums", t.amount < 0 ? "text-brick" : "text-navy")}>{fmtEUR(t.amount, t.currency)}</td>
      <td className="px-4 py-3.5">
        <StatusBadge status={t.status} />
        {t.reasons.length > 0 && (
          <p className="mt-1 max-w-[190px] text-[11px] leading-snug text-[#C05621]" title={t.reasons.join(" · ")}>
            {t.reasons[0]}{t.reasons.length > 1 && ` +${t.reasons.length - 1}`}
          </p>
        )}
      </td>
    </tr>
  );
}
