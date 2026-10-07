/** Tiny typed fetch wrapper. All calls go to same-origin /api (proxied to Express by Next rewrites). */

const TOKEN_KEY = "sdv.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  else window.sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T;
  constructor(status: number, message: string, data: T) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, body, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Cannot reach the vault API (is the backend running on :4000?)", null);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

/* ---------- Shared response types ---------- */

export interface User {
  id: number;
  username: string;
  role: string;
  createdAt?: string;
}

export interface LoginResult {
  mode: "vulnerable" | "secure";
  query: string;
  params?: string[];
  detected: string[];
  success: boolean;
  bypassed?: boolean;
  blocked?: boolean;
  token?: string;
  user?: User;
  rows?: Record<string, unknown>[];
  error?: string;
}

export interface RawNote {
  id: number;
  userId: number;
  iv: string;
  ciphertext: string;
  mac: string;
  createdAt: string;
}

export interface EncryptMeta {
  algorithm: string;
  padding: string;
  integrity: string;
  kdf: string;
  keyFingerprint: string;
  plaintextBytes: number;
  ciphertextBytes: number;
  blocks: number;
}

export interface DecryptedNote {
  id: number;
  title: string;
  content: string;
  keyFingerprint: string;
  integrity: "verified";
}
