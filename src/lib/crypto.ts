// Pure-JS SHA-1 / SHA-256 / HMAC / TOTP (RFC 6238) so that it works in any context (no WebCrypto needed).

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

function pad(data: Uint8Array): Uint8Array {
  const l = data.length;
  const total = (((l + 8) >> 6) + 1) << 6;
  const out = new Uint8Array(total);
  out.set(data);
  out[l] = 0x80;
  const dv = new DataView(out.buffer);
  dv.setUint32(total - 8, Math.floor((l * 8) / 0x100000000));
  dv.setUint32(total - 4, (l * 8) >>> 0);
  return out;
}

export function sha1(data: Uint8Array): Uint8Array {
  const m = pad(data);
  const dv = new DataView(m.buffer);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  for (let i = 0; i < m.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 80; t++) w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f: number, k: number;
      if (t < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const tmp = (rotl(a, 5) + f + e + k + w[t]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = tmp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  const out = new Uint8Array(20);
  const o = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((v, i) => o.setUint32(i * 4, v >>> 0));
  return out;
}

const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256(data: Uint8Array): Uint8Array {
  const m = pad(data);
  const dv = new DataView(m.buffer);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64);
  for (let i = 0; i < m.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, j) => (H[j] = (H[j] + v) | 0));
  }
  const out = new Uint8Array(32);
  const o = new DataView(out.buffer);
  H.forEach((v, i) => o.setUint32(i * 4, v >>> 0));
  return out;
}

const enc = new TextEncoder();
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function sha256Str(str: string): string {
  return toHex(sha256(enc.encode(str)));
}

export function hashPassword(password: string, salt: string): string {
  let h = sha256(enc.encode(salt + ":" + password));
  for (let i = 0; i < 3000; i++) {
    const next = new Uint8Array(h.length + 4);
    next.set(h);
    new DataView(next.buffer).setUint32(h.length, i);
    h = sha256(next);
  }
  return toHex(h);
}

export function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
  if (key.length > 64) key = sha1(key);
  const k = new Uint8Array(64);
  k.set(key);
  const ipad = new Uint8Array(64 + msg.length);
  const opad = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
  ipad.set(msg, 64);
  opad.set(sha1(ipad), 64);
  return sha1(opad);
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export function randomBase32(len = 16): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => B32[x % 32]).join("");
}

export function totp(secret: string, time = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(time / 1000 / step);
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(counter / 0x100000000));
  dv.setUint32(4, counter >>> 0);
  const h = hmacSha1(base32Decode(secret), msg);
  const off = h[19] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const now = Date.now();
  for (let i = -window; i <= window; i++) if (totp(secret, now + i * 30000) === code) return true;
  return false;
}
