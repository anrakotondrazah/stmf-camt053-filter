// Mini "backend" securise dans le navigateur (localStorage) : comptes, mots de passe haches,
// 2FA TOTP (RFC 6238), sessions, trusted devices, verrouillage anti brute-force et historique.
import { hashPassword, randomBase32, verifyTotp, sha256Str } from "./crypto";

export interface User {
  email: string;
  name: string;
  salt: string;
  passHash: string;
  totpSecret: string;
}
export interface Session {
  email: string;
  name: string;
  expires: number;
}
export interface TrustedDevice {
  fingerprint: string;
  createdAt: number;
  lastUsed: number;
  userAgent: string;
}
export interface HistoryItem {
  id: string;
  at: number;
  fileName: string;
  total: number;
  clear: number;
  ambiguous: number;
  errors: number;
  amount: number;
}

const K = {
  users: "stmf_users_v1",
  session: "stmf_session_v1",
  lock: "stmf_lock_v1",
  hist: "stmf_hist_v1",
  trusted: "stmf_trusted_v1",
  theme: "stmf_theme_v1",
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const read = <T,>(k: string, fb: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export const DEMO = { email: "demo@stmf.fr", password: "Stmf2025!", secret: "JBSWY3DPEHPK3PXP" };

function users(): User[] {
  let list = read<User[]>(K.users, []);
  if (!list.find((u) => u.email === DEMO.email)) {
    const salt = "stmf-demo-salt";
    list = [
      ...list,
      { email: DEMO.email, name: "Camille Durand", salt, passHash: hashPassword(DEMO.password, salt), totpSecret: DEMO.secret },
    ];
    write(K.users, list);
  }
  return list;
}

// Device fingerprint: combine plusieurs facteurs pour identifier le navigateur
function getDeviceFingerprint(): string {
  const factors = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
  ].join("|");
  return sha256Str(factors);
}

// Trusted devices management
type TrustedMap = Record<string, TrustedDevice[]>;
const MAX_TRUSTED = 5;
const TRUSTED_EXPIRY = 30 * 24 * 3600_000; // 30 jours

function getTrustedDevices(email: string): TrustedDevice[] {
  const all = read<TrustedMap>(K.trusted, {});
  const devices = all[email] || [];
  const now = Date.now();
  return devices.filter((d) => now - d.createdAt < TRUSTED_EXPIRY);
}

function isDeviceTrusted(email: string): boolean {
  const fingerprint = getDeviceFingerprint();
  const devices = getTrustedDevices(email);
  return devices.some((d) => d.fingerprint === fingerprint);
}

function trustDevice(email: string): void {
  const fingerprint = getDeviceFingerprint();
  const all = read<TrustedMap>(K.trusted, {});
  let devices = getTrustedDevices(email);

  const existing = devices.find((d) => d.fingerprint === fingerprint);
  if (existing) {
    existing.lastUsed = Date.now();
  } else {
    devices.push({
      fingerprint,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      userAgent: navigator.userAgent.slice(0, 100),
    });
    if (devices.length > MAX_TRUSTED) {
      devices = devices.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, MAX_TRUSTED);
    }
  }
  all[email] = devices;
  write(K.trusted, all);
}

function clearTrustedDevices(email: string): void {
  const all = read<TrustedMap>(K.trusted, {});
  delete all[email];
  write(K.trusted, all);
}

// Theme management
export type Theme = "light" | "dark";
export function getTheme(): Theme {
  return read<Theme>(K.theme, "light");
}
export function setTheme(theme: Theme): void {
  write(K.theme, theme);
  applyTheme(theme);
}
export function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
export function initTheme(): void {
  applyTheme(getTheme());
}

// Brute-force protection
type Lock = Record<string, { fails: number; until: number }>;
const MAX_FAILS = 5;
const LOCK_MS = 30_000;

function checkLock(email: string) {
  const l = read<Lock>(K.lock, {})[email];
  if (l && l.until > Date.now()) return Math.ceil((l.until - Date.now()) / 1000);
  return 0;
}
function fail(email: string) {
  const all = read<Lock>(K.lock, {});
  const cur = all[email] ?? { fails: 0, until: 0 };
  cur.fails += 1;
  if (cur.fails >= MAX_FAILS) { cur.until = Date.now() + LOCK_MS; cur.fails = 0; }
  all[email] = cur;
  write(K.lock, all);
  return MAX_FAILS - cur.fails;
}
function resetFails(email: string) {
  const all = read<Lock>(K.lock, {});
  delete all[email];
  write(K.lock, all);
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function login(emailRaw: string, password: string): Promise<Result<{ email: string; skipOtp: boolean }>> {
  await wait(700);
  const email = emailRaw.trim().toLowerCase();
  const locked = checkLock(email);
  if (locked) return { ok: false, error: `Trop de tentatives. Reessayez dans ${locked}s.` };
  const u = users().find((x) => x.email === email);
  if (!u || hashPassword(password, u.salt) !== u.passHash) {
    const left = fail(email);
    return { ok: false, error: `Identifiants incorrects${left > 0 && left < MAX_FAILS ? ` (${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""})` : ""}.` };
  }
  const skipOtp = isDeviceTrusted(email);
  return { ok: true, email, skipOtp };
}

export async function register(name: string, emailRaw: string, password: string): Promise<Result<{ email: string }>> {
  await wait(800);
  const email = emailRaw.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
  if (password.length < 8) return { ok: false, error: "Le mot de passe doit contenir 8 caracteres minimum." };
  const list = users();
  if (list.find((u) => u.email === email)) return { ok: false, error: "Un compte existe deja avec cet e-mail." };
  const salt = randomBase32(12);
  list.push({ email, name: name.trim() || email.split("@")[0], salt, passHash: hashPassword(password, salt), totpSecret: randomBase32(16) });
  write(K.users, list);
  return { ok: true, email };
}

export async function verifyOtp(email: string, code: string, rememberDevice = true): Promise<Result<{ session: Session }>> {
  await wait(700);
  const locked = checkLock(email + "#otp");
  if (locked) return { ok: false, error: `Trop d'essais. Reessayez dans ${locked}s.` };
  const u = users().find((x) => x.email === email);
  if (!u) return { ok: false, error: "Session expiree, reconnectez-vous." };
  if (!verifyTotp(u.totpSecret, code)) {
    const left = fail(email + "#otp");
    return { ok: false, error: `Code invalide${left > 0 && left < MAX_FAILS ? ` (${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""})` : ""}.` };
  }
  resetFails(email);
  resetFails(email + "#otp");
  if (rememberDevice) trustDevice(email);
  const session: Session = { email: u.email, name: u.name, expires: Date.now() + 8 * 3600_000 };
  write(K.session, session);
  return { ok: true, session };
}

export async function loginWithTrustedDevice(email: string): Promise<Result<{ session: Session }>> {
  const u = users().find((x) => x.email === email);
  if (!u) return { ok: false, error: "Compte introuvable." };
  if (!isDeviceTrusted(email)) return { ok: false, error: "Appareil non reconnu." };
  trustDevice(email);
  resetFails(email);
  const session: Session = { email: u.email, name: u.name, expires: Date.now() + 8 * 3600_000 };
  write(K.session, session);
  return { ok: true, session };
}

export function getSecret(email: string): string {
  return users().find((u) => u.email === email)?.totpSecret ?? "";
}

export function getSession(): Session | null {
  const s = read<Session | null>(K.session, null);
  if (!s || s.expires < Date.now()) return null;
  return s;
}

export function logout() {
  localStorage.removeItem(K.session);
}

export function logoutAllDevices(email: string) {
  clearTrustedDevices(email);
  logout();
}

const histKey = (email: string) => `${K.hist}:${email}`;
export function listHistory(email: string): HistoryItem[] {
  return read<HistoryItem[]>(histKey(email), []);
}
export function addHistory(email: string, item: Omit<HistoryItem, "id" | "at">) {
  const list = [{ ...item, id: crypto.randomUUID?.() ?? String(Date.now()), at: Date.now() }, ...listHistory(email)].slice(0, 8);
  write(histKey(email), list);
  return list;
}
export function clearHistory(email: string) {
  localStorage.removeItem(histKey(email));
}
