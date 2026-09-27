"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type Tab = "start" | "join";

export function HomeActions() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("start");
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

  const tabClass = (t: Tab) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
      tab === t ? "bg-brand-500 text-brand-950 shadow-sm" : "text-brand-800 hover:bg-brand-50"
    }`;

  return (
    <div className="space-y-4">
      <div className="card shadow-lift sm:p-7">
        <div className="mb-5 flex gap-1 rounded-full bg-brand-50 p-1" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "start"} className={tabClass("start")} onClick={() => setTab("start")}>
            Start a group
          </button>
          <button type="button" role="tab" aria-selected={tab === "join"} className={tabClass("join")} onClick={() => setTab("join")}>
            I have a code
          </button>
        </div>

        {error && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {tab === "start" ? (
          <form onSubmit={create} className="space-y-4">
            <p className="text-sm text-gray-600">Name the three flatmates. You&apos;ll get a link and a code to share on WhatsApp.</p>
            <div className="grid gap-3 sm:grid-cols-3">
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
            <button className="btn-primary w-full py-3 text-base" disabled={busy !== null}>
              {busy === "create" ? "Creating…" : "Create group →"}
            </button>
          </form>
        ) : (
          <form onSubmit={join} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-character code from your group chat.</p>
            <input
              className="input text-center font-mono text-2xl uppercase tracking-[0.4em]"
              placeholder="K7PQ2M"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Group code"
              autoFocus
            />
            <button className="btn-primary w-full py-3 text-base">Open group →</button>
          </form>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 rounded-3xl border border-sand-200 bg-sand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-brand-950">Just exploring?</p>
          <p className="text-sm text-gray-600">All three forms pre-filled from the case study, so you see results instantly.</p>
        </div>
        <button onClick={loadDemo} className="btn-sand w-full shrink-0 sm:w-auto" disabled={busy !== null}>
          {busy === "demo" ? "Loading…" : "Load sample group (Riya, Meera, Kavita)"}
        </button>
      </div>
    </div>
  );
}
