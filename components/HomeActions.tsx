"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function HomeActions() {
  const router = useRouter();
  const [names, setNames] = useState(["Riya", "Meera", "Kavita"]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError(null);
    try {
      const res = await api<{ code: string }>("/api/groups", { method: "POST", body: JSON.stringify({ names }) });
      router.push(`/g/${res.code}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy("demo");
    setError(null);
    try {
      const res = await api<{ code: string }>("/api/demo", { method: "POST" });
      router.push(`/g/${res.code}/results`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) router.push(`/g/${c}`);
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={create} className="card space-y-3">
        <div>
          <h2 className="section-title">Start a group</h2>
          <p className="hint">You get a link and a short code to send on WhatsApp. No login needed.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {names.map((n, i) => (
            <div key={i}>
              <label className="label" htmlFor={`name-${i}`}>
                Flatmate {i + 1}
              </label>
              <input
                id={`name-${i}`}
                className="input"
                value={n}
                maxLength={30}
                required
                onChange={(e) => setNames(names.map((x, k) => (k === i ? e.target.value : x)))}
              />
            </div>
          ))}
        </div>
        <button className="btn-primary w-full" disabled={busy !== null}>
          {busy === "create" ? "Creating…" : "Create group"}
        </button>
      </form>

      <form onSubmit={join} className="card">
        <h2 className="section-title mb-2">Got a group code?</h2>
        <div className="flex gap-2">
          <input
            className="input uppercase tracking-widest"
            placeholder="e.g. K7PQ2M"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Group code"
          />
          <button className="btn-secondary shrink-0">Open</button>
        </div>
      </form>

      <div className="card border-dashed bg-brand-50/60">
        <h2 className="section-title">Just exploring?</h2>
        <p className="hint mb-3">
          Creates a group with the Riya / Meera / Kavita case study already filled in, so you can see results straight away.
        </p>
        <button onClick={loadDemo} className="btn-secondary w-full" disabled={busy !== null}>
          {busy === "demo" ? "Loading…" : "Load sample group (Riya, Meera, Kavita)"}
        </button>
      </div>
    </div>
  );
}
