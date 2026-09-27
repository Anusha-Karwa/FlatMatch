"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getEditToken } from "@/lib/client";
import type { GroupStatusView } from "@/lib/groups";
import { MemoryBanner } from "./MemoryBanner";

export function GroupHub({ initial, isNew }: { initial: GroupStatusView; isNew: boolean }) {
  const [status, setStatus] = useState(initial);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [mySlots, setMySlots] = useState<number[]>([]);
  const { code } = status;

  useEffect(() => {
    setOrigin(window.location.origin);
    setMySlots([1, 2, 3].filter((s) => getEditToken(code, s)));
  }, [code]);

  // Poll until everyone has submitted.
  useEffect(() => {
    if (status.complete) return;
    const id = setInterval(async () => {
      try {
        setStatus(await api<GroupStatusView>(`/api/groups/${code}`));
      } catch {
        /* keep last known status */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [code, status.complete]);

  const link = `${origin}/g/${code}`;
  const waText = `Let's sort the flat hunt! Fill in your flat requirements privately on FlatMatch: ${link} (group code ${code})`;
  const submittedCount = status.members.filter((m) => m.submitted).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="space-y-4">
      <MemoryBanner storage={status.storage} />

      <section className="card space-y-3">
        {isNew && <p className="text-sm font-medium text-brand-700">Group created! Send this to the other two.</p>}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="hint">Group code</p>
            <p className="font-mono text-3xl font-bold tracking-[0.2em] text-brand-700">{code}</p>
          </div>
          <p className="text-right text-sm text-gray-500">
            {submittedCount}/3 submitted
          </p>
        </div>
        <p className="break-all rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{link || "…"}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="btn-secondary">
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <a className="btn-primary" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">
            Share on WhatsApp
          </a>
        </div>
      </section>

      {status.complete && (
        <Link href={`/g/${code}/results`} className="btn-primary w-full py-4 text-base">
          🎉 Everyone&apos;s in. See matching flats →
        </Link>
      )}

      <section className="card">
        <h2 className="section-title">Who are you?</h2>
        <p className="hint mb-3">Pick your name to fill in your form. Answers stay hidden from the others until all three have submitted.</p>
        <ul className="divide-y divide-gray-100">
          {status.members.map((m) => {
            const mine = mySlots.includes(m.slot);
            return (
              <li key={m.slot} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                      m.submitted ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium">
                      {m.name} {mine && <span className="text-xs text-gray-400">(you)</span>}
                    </p>
                    <p className={`text-xs ${m.submitted ? "text-brand-700" : "text-gray-500"}`}>
                      {m.submitted ? "✓ Submitted" : "Waiting…"}
                    </p>
                  </div>
                </div>
                {!m.submitted ? (
                  <Link href={`/g/${code}/form/${m.slot}`} className="btn-primary">
                    I&apos;m {m.name}
                  </Link>
                ) : mine ? (
                  <Link href={`/g/${code}/form/${m.slot}`} className="btn-ghost">
                    Edit my answers
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Found a listing?</h2>
          <p className="hint">Add it by hand, or paste the listing text.</p>
        </div>
        <Link href={`/g/${code}/listings/new`} className="btn-secondary shrink-0">
          Add listing
        </Link>
      </section>
    </div>
  );
}
