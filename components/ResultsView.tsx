"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatFloor, inr } from "@/lib/format";
import type { ResultsView as ResultsData } from "@/lib/groups";
import { NICE_TO_HAVE_LABELS, type FlatMatch, type Listing, type MemberWithPrefs, type NearMiss, type NiceToHave, type PersonBreakdown } from "@/lib/types";

const OPTION_LETTERS = ["A", "B", "C"];

export function ResultsView({ view, geminiEnabled }: { view: ResultsData; geminiEnabled: boolean }) {
  const { result, members, code } = view;
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  async function explain() {
    setExplaining(true);
    setExplainError(null);
    try {
      const res = await api<{ explanations: Record<string, string> }>(`/api/groups/${code}/explain`, { method: "POST" });
      setExplanations(res.explanations);
    } catch (e) {
      setExplainError((e as Error).message);
    } finally {
      setExplaining(false);
    }
  }

  const n = result.shortlist.length;
  const headline =
    n === 0 ? "No flat passes everyone's dealbreakers yet" : `${n} flat${n === 1 ? "" : "s"} fit${n === 1 ? "s" : ""} all three of you`;

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/g/${code}`} className="text-sm text-brand-700">
          ← Group {code}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{headline}</h1>
        <p className="text-sm text-gray-600">
          {result.stats.passing} of {result.stats.considered} listings with 3+ bedrooms pass every dealbreaker.
          {" "}FlatMatch doesn&apos;t pick. Use this to decide which tradeoff you&apos;re happy with.
        </p>
      </div>

      <section className="card space-y-2 border-amber-200 bg-amber-50/50">
        <h2 className="section-title">⚡ Where you conflict</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
          {result.conflicts.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      {n > 0 && (
        <div className="space-y-2">
          {result.shortlistFairnessNote && <p className="text-sm text-gray-600">⚖️ {result.shortlistFairnessNote}</p>}
          {geminiEnabled && (
            <div>
              <button onClick={explain} className="btn-secondary w-full" disabled={explaining}>
                {explaining ? "Writing a neutral summary…" : Object.keys(explanations).length ? "Re-explain tradeoffs" : "✨ Explain tradeoffs"}
              </button>
              {explainError && <p className="mt-2 text-sm text-red-700">{explainError}</p>}
            </div>
          )}
        </div>
      )}

      {result.nearMissesArePrimary && result.nearMisses.length > 0 && <NearMisses items={result.nearMisses} primary />}

      <div className="space-y-4">
        {result.shortlist.map((f, i) => (
          <FlatCard key={f.listing.id} flat={f} letter={OPTION_LETTERS[i]} explanation={explanations[f.listing.id]} />
        ))}
      </div>

      {!result.nearMissesArePrimary && result.nearMisses.length > 0 && (
        <details className="card group">
          <summary className="cursor-pointer list-none">
            <span className="section-title">Nearly made it ({result.nearMisses.length})</span>
            <span className="hint block">Flats that fail exactly one person&apos;s constraint. Tap to see.</span>
          </summary>
          <div className="mt-3">
            <NearMisses items={result.nearMisses} />
          </div>
        </details>
      )}

      <details className="card">
        <summary className="cursor-pointer list-none">
          <span className="section-title">Everyone&apos;s answers</span>
          <span className="hint block">Unlocked now that all three have submitted.</span>
        </summary>
        <div className="mt-3 space-y-3">
          {members.map((m) => (
            <AnswerSummary key={m.slot} member={m} />
          ))}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/g/${code}/listings/new`} className="btn-secondary">
          + Add a listing
        </Link>
        <Link href={`/g/${code}`} className="btn-ghost">
          Group page
        </Link>
      </div>
    </div>
  );
}

function ListingFacts({ listing }: { listing: Listing }) {
  const facts = [
    `${listing.bhk}BHK`,
    `${formatFloor(listing.floor)} of ${listing.totalFloors}`,
    listing.hasLift ? "Lift" : "No lift",
    `${listing.bathrooms} bath`,
    listing.parking ? "Parking" : "No parking",
    listing.petFriendly ? "Pets OK" : "No pets",
    listing.furnished === "full" ? "Furnished" : listing.furnished === "semi" ? "Semi-furnished" : "Unfurnished",
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {facts.map((f) => (
        <li key={f} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {f}
        </li>
      ))}
    </ul>
  );
}

const FAIRNESS_STYLE = {
  balanced: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  uneven: "bg-amber-50 text-amber-800 ring-amber-200",
  lopsided: "bg-rose-50 text-rose-800 ring-rose-200",
};

function FlatCard({ flat, letter, explanation }: { flat: FlatMatch; letter: string; explanation?: string }) {
  const { listing, fairness } = flat;
  return (
    <article className="card space-y-3">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Option {letter} · {listing.area}
            </p>
            <h3 className="text-lg font-bold leading-snug">{listing.title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold">{inr(flat.rentShare)}</p>
            <p className="text-xs text-gray-500">each · {inr(listing.rent)} total</p>
          </div>
        </div>
        <ListingFacts listing={listing} />
        <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${FAIRNESS_STYLE[fairness.level]}`}>
          ⚖️ {fairness.label}: {fairness.note}
        </p>
      </header>

      <PeopleTable people={flat.people} />

      {explanation && <p className="rounded-xl bg-brand-50 p-3 text-sm leading-relaxed text-gray-800">✨ {explanation}</p>}
    </article>
  );
}

function PeopleTable({ people }: { people: PersonBreakdown[] }) {
  return (
    <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100">
      {people.map((p) => (
        <div key={p.slot} className="grid gap-2 p-3 sm:grid-cols-[6rem_1fr_1fr]">
          <div className="flex items-center justify-between sm:block">
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs text-gray-500">fit {p.score}/100</p>
          </div>
          <ul className="space-y-1 text-sm">
            {p.gets.map((g) => (
              <li key={g}>✅ {g}</li>
            ))}
          </ul>
          <ul className="space-y-1 text-sm">
            {p.compromises.length ? (
              p.compromises.map((c) => (
                <li key={c} className="text-amber-900">
                  ⚠️ {c}
                </li>
              ))
            ) : (
              <li className="text-gray-400">No compromises</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NearMisses({ items, primary = false }: { items: NearMiss[]; primary?: boolean }) {
  return (
    <section className="space-y-3">
      {primary && (
        <div>
          <h2 className="section-title">Closest options (each fails one constraint)</h2>
          <p className="hint">Fewer than two flats pass everything. These would work if one person stretched a single limit.</p>
        </div>
      )}
      {items.map((m) => (
        <article key={m.listing.id} className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{m.listing.area}</p>
              <p className="font-semibold">{m.listing.title}</p>
            </div>
            <p className="shrink-0 text-right text-sm font-semibold">
              {inr(m.rentShare)} <span className="block text-xs font-normal text-gray-500">each</span>
            </p>
          </div>
          <p className="my-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-sm text-rose-800">✗ {capitalize(m.violation.message)}</p>
          <ListingFacts listing={m.listing} />
        </article>
      ))}
    </section>
  );
}

function AnswerSummary({ member }: { member: MemberWithPrefs }) {
  const p = member.preferences;
  const d = p.dealbreakers;
  const deal = [
    d.maxFloorWithoutLift === null ? null : d.maxFloorWithoutLift === 0 ? "lift unless ground floor" : `lift above ${formatFloor(d.maxFloorWithoutLift)}`,
    d.parking ? "parking" : null,
    d.minBathrooms > 1 ? `${d.minBathrooms}+ bathrooms` : null,
    d.petFriendly ? "pet-friendly" : null,
    d.minFurnishing !== "unfurnished" ? (d.minFurnishing === "full" ? "fully furnished" : "at least semi-furnished") : null,
  ].filter(Boolean);
  const nice = (Object.entries(p.niceToHaves) as [NiceToHave, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k, w]) => `${NICE_TO_HAVE_LABELS[k]} (${w})`);
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-sm">
      <p className="font-semibold">{member.name}</p>
      <dl className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1 text-gray-700">
        <dt className="text-gray-500">Max rent</dt>
        <dd>{inr(p.maxRent)}/month</dd>
        <dt className="text-gray-500">Won&apos;t live in</dt>
        <dd>{p.excludedAreas.length ? p.excludedAreas.join(", ") : "Open to anywhere"}</dd>
        <dt className="text-gray-500">Close to</dt>
        <dd>{p.anchors.length ? p.anchors.map((a) => `${a.label} (${a.area}) ≤ ${a.maxMinutes} min`).join("; ") : "None"}</dd>
        <dt className="text-gray-500">Dealbreakers</dt>
        <dd>{deal.length ? deal.join(", ") : "None"}</dd>
        <dt className="text-gray-500">Nice-to-haves</dt>
        <dd>{nice.length ? nice.join(", ") : "None"}</dd>
      </dl>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
