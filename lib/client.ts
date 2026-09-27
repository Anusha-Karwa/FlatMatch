"use client";

/** Per-browser edit token for a member slot. Storage can be unavailable (private mode), so never throw. */
const key = (code: string, slot: number) => `flatmatch:${code}:${slot}`;

export function getEditToken(code: string, slot: number): string | null {
  try {
    return window.localStorage.getItem(key(code, slot));
  } catch {
    return null;
  }
}

export function setEditToken(code: string, slot: number, token: string) {
  try {
    window.localStorage.setItem(key(code, slot), token);
  } catch {
    /* ignore */
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}
