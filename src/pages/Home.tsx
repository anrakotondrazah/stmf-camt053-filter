import { useRef, useState, type DragEvent } from "react";
import { Clock, FileCode2, FileSpreadsheet, Filter, Lock, Trash2, UploadCloud, X } from "lucide-react";
import { AnimatedCheck, Button, Tip, useToast } from "../components/ui";
import type { HistoryItem, Session } from "../lib/backend";
import { fmtEUR, sampleCamt } from "../lib/camt";
import { cn } from "../utils/cn";

interface Props {
  session: Session;
  history: HistoryItem[];
  onAnalyze: (file: File) => void;
  onClearHistory: () => void;
}

const MAX = 10 * 1024 * 1024;
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function Home({ session, history, onAnalyze, onClearHistory }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const accept = (f?: File | null) => {
    if (!f) return;
    if (!/\.(xml|camt|053)$/i.test(f.name) && f.type !== "text/xml" && f.type !== "application/xml") {
      toast("error", "Format non supporte", "Deposez un fichier XML camt.053 (.xml).");
      return;
    }
    if (f.size > MAX) {
      toast("error", "Fichier trop volumineux", "La taille maximale est de 10 Mo.");
      return;
    }
    setFile(f);
    toast("success", "Fichier pret", f.name);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    accept(e.dataTransfer.files?.[0]);
  };
  const useSample = () => accept(new File([sampleCamt()], "releve_demo_2025-03.xml", { type: "application/xml" }));

  const benefits = [
    { icon: Lock, title: "Traitement local", text: "Votre releve est analyse dans votre navigateur, jamais envoye a un tiers." },
    { icon: Filter, title: "Tri automatique", text: "Chaque virement est classe : clair, ambigu ou en erreur, avec le motif." },
    { icon: FileSpreadsheet, title: "Exports prets a l'emploi", text: "camt.053 filtre et fichier Excel des cas a verifier." },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-24 md:px-6 md:pb-16 md:pt-28">
      <div className="mx-auto max-w-3xl animate-fade-up text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8a6d12]">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Rapprochement bancaire
        </span>
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-tight text-navy md:text-[34px] dark:text-white">
          Filtrez vos releves <span className="whitespace-nowrap">camt.053</span> en quelques secondes
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 md:text-base dark:text-slate-400">
          Bienvenue {session.name.split(" ")[0]}. Separeur automatiquement les virements identifiables des cas ambigus.
        </p>
      </div>

      <div className="mx-auto mt-9 max-w-2xl animate-fade-up [animation-delay:120ms]">
        {!file ? (
          <div
            className={cn("upload-box", drag && "drag")}
            role="button"
            tabIndex={0}
            aria-label="Deposer un fichier camt.053"
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <span className="halo" />
            <span className="halo [animation-delay:0.5s]" />
            <div className="animate-soft-pulse text-sky">
              <UploadCloud size={72} strokeWidth={1.2} />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">{drag ? "Relachez pour deposer" : "Deposez votre fichier camt.053"}</p>
              <p className="mt-1 text-sm text-slate-400">ou cliquez pour parcourir - XML - 10 Mo max</p>
            </div>
            <input ref={input} type="file" accept=".xml,.camt,.053,text/xml,application/xml" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="card flex min-h-[280px] flex-col items-center justify-center gap-5 p-8 text-center shadow-[0_30px_40px_-30px_rgba(30,58,95,0.3)] dark:bg-slate-800 dark:border-slate-700">
            <AnimatedCheck />
            <div>
              <p className="flex items-center justify-center gap-2 text-lg font-semibold text-navy dark:text-white break-all">
                <FileCode2 size={20} className="shrink-0 text-sky" /> {file.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">{fmtSize(file.size)} - pret pour l'analyse</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="ghost" icon={<X size={16} />} onClick={() => setFile(null)}>Changer</Button>
              <Button variant="primary" icon={<Filter size={16} />} onClick={() => onAnalyze(file)}>
                Analyser le fichier
              </Button>
            </div>
          </div>
        )}

        {!file && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span>Pas de fichier sous la main ?</span>
            <Tip text="Genere un releve fictif de 14 ecritures pour tester l'outil">
              <button onClick={useSample} className="inline-flex items-center gap-1.5 font-medium text-sky underline-offset-4 hover:underline">
                Utiliser un releve d'exemple
              </button>
            </Tip>
          </div>
        )}
      </div>

      <ul className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
        {benefits.map((b, i) => (
          <li key={b.title} className="animate-fade-up text-center" style={{ animationDelay: `${240 + i * 90}ms` }}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-navy shadow-[0_6px_16px_rgba(74,144,217,0.2)] ring-1 ring-black/5 dark:bg-slate-800 dark:ring-slate-700">
              <b.icon size={22} strokeWidth={1.7} />
            </span>
            <h3 className="mt-3 text-[15px] font-semibold text-ink dark:text-white">{b.title}</h3>
            <p className="mx-auto mt-1 max-w-[260px] text-[13.5px] leading-relaxed text-slate-500">{b.text}</p>
          </li>
        ))}
      </ul>

      {history.length > 0 && (
        <section className="card mx-auto mt-14 max-w-2xl animate-fade-up p-5 md:p-6 dark:bg-slate-800 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-medium text-navy dark:text-white"><Clock size={18} className="text-sky" /> Derniers traitements</h2>
            <button onClick={onClearHistory} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brick">
              <Trash2 size={14} /> Effacer
            </button>
          </div>
          <ul className="divide-y divide-black/5 dark:divide-slate-700">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink dark:text-white">{h.fileName}</p>
                  <p className="text-xs text-slate-400">{new Date(h.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[#E6FFED] px-2 py-0.5 text-[#22543D]">{h.clear}</span>
                  <span className="rounded-full bg-[#FFF5E6] px-2 py-0.5 text-[#C05621]">{h.ambiguous}</span>
                  {h.errors > 0 && <span className="rounded-full bg-[#FFF5F5] px-2 py-0.5 text-[#9B2C2C]">{h.errors}</span>}
                  <span className="hidden w-24 text-right tabular-nums text-slate-500 sm:inline">{fmtEUR(h.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
