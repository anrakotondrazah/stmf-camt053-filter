import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, Copy, Eye, EyeOff, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { AnimatedCheck, Button, Logo, useToast } from "../components/ui";
import { DEMO, getSecret, login, loginWithTrustedDevice, register, verifyOtp, type Session } from "../lib/backend";
import { totp } from "../lib/crypto";
import { cn } from "../utils/cn";

interface Props {
  onSuccess: (s: Session) => void;
}

function Field({ id, label, type = "text", value, onChange, autoComplete }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
  return (
    <div className="field">
      <input id={id} type={isPwd && show ? "text" : type} value={value} placeholder=" " autoComplete={autoComplete} required onChange={(e) => onChange(e.target.value)} className={isPwd ? "pr-11" : ""} />
      <label htmlFor={id}>{label}</label>
      {isPwd && (
        <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}

function Otp({ value, onChange, state, disabled }: { value: string; onChange: (v: string) => void; state: "idle" | "bad" | "ok"; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const set = (i: number, d: string) => {
    const arr = [...digits];
    arr[i] = d;
    onChange(arr.join("").slice(0, 6));
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) { refs.current[i - 1]?.focus(); set(i - 1, ""); }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, 5)]?.focus(); }
  };
  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Chiffre ${i + 1}`}
          className={cn("otp-box", d && "filled", state === "bad" && "bad", state === "ok" && "ok")}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, c);
            if (c && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

function Ring({ seconds }: { seconds: number }) {
  const r = 11, c = 2 * Math.PI * r;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <circle cx="15" cy="15" r={r} stroke="#e2e8f0" strokeWidth="3" fill="none" />
      <circle cx="15" cy="15" r={r} stroke="#4A90D9" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - seconds / 30)} transform="rotate(-90 15 15)" style={{ transition: "stroke-dashoffset 1s linear" }} />
      <text x="15" y="19" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1E3A5F">{seconds}</text>
    </svg>
  );
}

export function Auth({ onSuccess }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"cred" | "otp">("cred");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "bad" | "ok">("idle");
  const [isNew, setIsNew] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const secret = step === "otp" ? getSecret(email.trim().toLowerCase()) : "";
  const remaining = 30 - (Math.floor(now / 1000) % 30);

  const submitCred = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      const res = await register(name, email, pwd);
      setLoading(false);
      if (!res.ok) return setError(res.error);
      setEmail(res.email);
      setIsNew(true);
      setShowSetup(true);
      setShowDemo(false);
      setCode("");
      setOtpState("idle");
      setStep("otp");
      toast("success", "Compte cree", "Configurez maintenant la double authentification.");
      return;
    }

    const res = await login(email, pwd);
    if (!res.ok) {
      setLoading(false);
      return setError(res.error);
    }

    if (res.skipOtp) {
      const sessionRes = await loginWithTrustedDevice(res.email);
      setLoading(false);
      if (sessionRes.ok) {
        setOtpState("ok");
        toast("success", `Bienvenue ${sessionRes.session.name.split(" ")[0]}`, "Appareil reconnu, connexion automatique.");
        setTimeout(() => onSuccess(sessionRes.session), 500);
        return;
      }
    }

    setLoading(false);
    setEmail(res.email);
    setIsNew(false);
    setShowSetup(false);
    setShowDemo(false);
    setCode("");
    setOtpState("idle");
    setStep("otp");
  };

  const submitOtp = async (c: string) => {
    setLoading(true);
    setError("");
    const res = await verifyOtp(email, c, rememberDevice);
    setLoading(false);
    if (!res.ok) {
      setOtpState("bad");
      setError(res.error);
      setTimeout(() => { setOtpState("idle"); setCode(""); }, 700);
      return;
    }
    setOtpState("ok");
    toast("success", `Bienvenue ${res.session.name.split(" ")[0]}`, "Verification en deux etapes reussie.");
    setTimeout(() => onSuccess(res.session), 1100);
  };

  useEffect(() => {
    if (code.length === 6 && !loading && otpState === "idle") submitOtp(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const fillDemo = () => {
    setMode("login");
    setEmail(DEMO.email);
    setPwd(DEMO.password);
    setError("");
    toast("info", "Compte de demonstration", "Identifiants pre-remplis.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-24 pt-24 md:pb-10"
      style={{ background: "radial-gradient(900px 400px at 50% 0%, #e8f0fa 0%, transparent 70%), #F1F4F8" }}>
      <div className="w-full max-w-[440px] animate-fade-up">
        <div className="card overflow-hidden p-0 shadow-[0_24px_60px_-20px_rgba(30,58,95,0.25)]">
          <div className="flex flex-col items-center gap-4 border-b border-black/5 px-8 pb-6 pt-8">
            <Logo />
            <ol className="flex items-center gap-3 text-xs font-medium">
              {["Identifiants", "Verification"].map((s, i) => {
                const active = (i === 0 && step === "cred") || (i === 1 && step === "otp");
                const done = i === 0 && step === "otp";
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={cn("flex items-center gap-2", active || done ? "text-navy" : "text-slate-400")}>
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors", done ? "bg-sage text-white" : active ? "bg-navy text-white" : "bg-slate-200 text-slate-500")}>
                        {done ? <ShieldCheck size={12} /> : i + 1}
                      </span>
                      {s}
                    </span>
                    {i === 0 && <span className={cn("h-px w-8 transition-colors", done ? "bg-sage" : "bg-slate-200")} />}
                  </li>
                );
              })}
            </ol>
          </div>

          {step === "cred" ? (
            <div className="overflow-hidden">
              <div className={cn("auth-slider", mode === "register" && "register")}>
                <form onSubmit={submitCred} className="flex flex-col gap-4 px-8 py-7" inert={mode !== "login"}>
                  <div>
                    <h1 className="text-2xl font-semibold text-navy">Connexion</h1>
                    <p className="mt-1 text-sm text-slate-500">Accedez a votre espace comptable securise.</p>
                  </div>
                  <Field id="l-email" label="Adresse e-mail" type="email" value={email} onChange={setEmail} autoComplete="username" />
                  <Field id="l-pwd" label="Mot de passe" type="password" value={pwd} onChange={setPwd} autoComplete="current-password" />
                  {error && mode === "login" && <p role="alert" className="rounded-xl bg-[#FFF5F5] px-3.5 py-2.5 text-[13px] font-medium text-[#9B2C2C]">{error}</p>}
                  <div className="text-right">
                    <button type="button" onClick={() => toast("info", "Reinitialisation", "Contactez votre administrateur STMF pour reinitialiser votre mot de passe.")} className="text-[13px] font-medium text-sky hover:underline">
                      Mot de passe oublie ?
                    </button>
                  </div>
                  <Button type="submit" variant="primary" block loading={loading}>Se connecter</Button>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <Button type="button" block onClick={fillDemo} icon={<KeyRound size={16} />}>Compte demo</Button>
                  <p className="text-center text-[13px] text-slate-500">
                    Pas encore de compte ?{" "}
                    <button type="button" onClick={() => { setMode("register"); setError(""); }} className="font-semibold text-navy hover:underline">Creer un compte</button>
                  </p>
                </form>

                <form onSubmit={submitCred} className="flex flex-col gap-4 px-8 py-7" inert={mode !== "register"}>
                  <div>
                    <h1 className="text-2xl font-semibold text-navy">Creer un compte</h1>
                    <p className="mt-1 text-sm text-slate-500">La 2FA sera activee des l'inscription.</p>
                  </div>
                  <Field id="r-name" label="Nom complet" value={name} onChange={setName} autoComplete="name" />
                  <Field id="r-email" label="Adresse e-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
                  <Field id="r-pwd" label="Mot de passe (8 car. min.)" type="password" value={pwd} onChange={setPwd} autoComplete="new-password" />
                  {error && mode === "register" && <p role="alert" className="rounded-xl bg-[#FFF5F5] px-3.5 py-2.5 text-[13px] font-medium text-[#9B2C2C]">{error}</p>}
                  <Button type="submit" variant="primary" block loading={loading} className="mt-2">Creer mon compte</Button>
                  <p className="text-center text-[13px] text-slate-500">
                    Deja inscrit ?{" "}
                    <button type="button" onClick={() => { setMode("login"); setError(""); }} className="font-semibold text-navy hover:underline">Se connecter</button>
                  </p>
                </form>
              </div>
            </div>
          ) : (
            <div className="px-8 py-7">
              <button onClick={() => { setStep("cred"); setError(""); setCode(""); }} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-navy">
                <ArrowLeft size={15} /> Retour
              </button>
              <div className="flex flex-col items-center text-center">
                {otpState === "ok" ? (
                  <AnimatedCheck size={52} />
                ) : (
                  <span className="flex h-[52px] w-[52px] animate-float items-center justify-center rounded-2xl bg-white text-navy shadow-[0_8px_20px_rgba(74,144,217,0.3)] ring-1 ring-black/5">
                    <ShieldCheck size={26} strokeWidth={1.6} />
                  </span>
                )}
                <h1 className="mt-4 text-2xl font-semibold text-navy">Verification en deux etapes</h1>
                <p className="mt-1 max-w-[320px] text-sm text-slate-500">Saisissez le code a 6 chiffres genere par votre application d'authentification.</p>
              </div>

              <div className="mt-6">
                <Otp value={code} onChange={setCode} state={otpState} disabled={loading || otpState === "ok"} />
                <div className="mt-3 h-5 text-center text-[13px]">
                  {loading && otpState === "idle" ? <span className="text-slate-500">Verification...</span> : error ? <span role="alert" className="font-medium text-brick">{error}</span> : null}
                </div>
              </div>

              <div className="mt-3">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-sky" />
                  <span className="text-[13px] text-slate-600">Se souvenir de cet appareil (30 jours)</span>
                </label>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-2xl border border-black/5 bg-slate-50">
                  <button onClick={() => setShowSetup((s) => !s)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] font-medium text-ink" aria-expanded={showSetup}>
                    <span className="flex items-center gap-2"><Smartphone size={16} className="text-sky" /> {isNew ? "Configurer mon application" : "Cle de l'application"}</span>
                    <span className={cn("text-slate-400 transition-transform", showSetup && "rotate-180")}>&#8964;</span>
                  </button>
                  {showSetup && (
                    <div className="animate-fade-up border-t border-black/5 px-4 py-3 text-[13px] text-slate-600">
                      <p>Ajoutez cette cle dans Google Authenticator, Microsoft Authenticator ou 1Password :</p>
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                        <code className="break-all font-mono text-[13px] tracking-wider text-navy">{secret.replace(/(.{4})/g, "$1 ").trim()}</code>
                        <button onClick={() => { navigator.clipboard?.writeText(secret); toast("success", "Cle copiee"); }} aria-label="Copier la cle" className="text-slate-400 hover:text-navy">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/8 px-4 py-3 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-[#6f560d]">Mode demonstration</p>
                    {showDemo ? (
                      <button onClick={() => setCode(totp(secret))} className="font-mono text-lg font-semibold tracking-[0.3em] text-navy" title="Cliquer pour saisir">
                        {totp(secret, now)}
                      </button>
                    ) : (
                      <p className="text-slate-500">Afficher le code actuel</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {showDemo && <Ring seconds={remaining} />}
                    <Button size="sm" onClick={() => setShowDemo((s) => !s)}>{showDemo ? "Masquer" : "Afficher"}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Plateforme securisee pour donnees bancaires
        </p>
      </div>
    </div>
  );
}
