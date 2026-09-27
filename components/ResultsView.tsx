"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatFloor, inr } from "@/lib/format";
import type { ResultsView as ResultsData } from "@/lib/groups";
import { PinIcon, PropertyArt } from "./Art";
import { PageBanner } from "./PageBanner";
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
      <PageBanner backHref={`/g/${code}`} backLabel={`Group ${code}`} eyebrow="Your shortlist" title={headline}>
        {result.stats.passing} of {result.stats.considered} listings with 3+ bedrooms pass every dealbreaker. FlatMatch
        doesn&apos;t pick. Use this to decide which tradeoff you&apos;re happy with.
      </PageBanner>

      <section className="card relative z-10 mx-2 !-mt-12 space-y-3 border-sand-200 sm:mx-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sand-100 text-lg" aria-hidden>
            ⚡
          </span>
          <h2 className="section-title">Where you conflict</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-700">
          {result.conflicts.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-400" />
              <span>{c}</span>
            </li>
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
        <li key={f} className="rounded-full border border-brand-900/10 bg-brand-50/50 px-2.5 py-0.5 text-xs font-medium text-brand-900/80">
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
    <article className="overflow-hidden rounded-3xl border border-brand-900/5 bg-white shadow-soft">
      <div className="relative">
        <PropertyArt
          seed={listing.id}
          floor={listing.floor}
          totalFloors={listing.totalFloors}
          hasLift={listing.hasLift}
          className="h-44 w-full sm:h-52"
        />
        <span className="absolute left-3 top-3 rounded-full bg-brand-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          Option {letter}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-800 backdrop-blur">
          <PinIcon /> {listing.area}
        </span>
        <div className="absolute bottom-3 left-3 rounded-2xl bg-white px-3.5 py-2 shadow-lift">
          <p className="font-display text-xl font-semibold leading-none text-brand-950">
            {inr(flat.rentShare)}
            <span className="ml-1 font-sans text-xs font-medium text-gray-500">each / month</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">{inr(listing.rent)} total rent</p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <header className="space-y-2.5">
          <h3 className="font-display text-xl font-semibold leading-snug text-brand-950">{listing.title}</h3>
          <ListingFacts listing={listing} />
          <p className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${FAIRNESS_STYLE[fairness.level]}`}>
            ⚖️ {fairness.label}: {fairness.note}
          </p>
        </header>

        <PeopleTable people={flat.people} />

        {explanation && (
          <p className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-relaxed text-gray-800">✨ {explanation}</p>
        )}
      </div>
    </article>
  );
}

function PeopleTable({ people }: { people: PersonBreakdown[] }) {
  return (
    <div className="divide-y divide-brand-900/5 overflow-hidden rounded-2xl bg-[#fafbf8] ring-1 ring-brand-900/5">
      {people.map((p) => (
        <div key={p.slot} className="grid gap-2.5 p-3.5 sm:grid-cols-[7rem_1fr_1fr]">
          <div className="flex items-center gap-2.5 sm:flex-col sm:items-start">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 font-display text-sm font-semibold text-white">
              {p.name.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-1 items-center justify-between gap-2 sm:block">
              <p className="font-semibold text-brand-950">{p.name}</p>
              <div className="flex items-center gap-1.5" title={`Personal fit ${p.score}/100`}>
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.score}%` }} />
                </div>
                <span className="text-[11px] text-gray-500">{p.score}</span>
              </div>
            </div>
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
        <article key={m.listing.id} className="flex gap-3 overflow-hidden rounded-2xl border border-dashed border-brand-900/15 bg-white p-3">
          <PropertyArt
            seed={m.listing.id}
            floor={m.listing.floor}
            totalFloors={m.listing.totalFloors}
            hasLift={m.listing.hasLift}
            className="hidden h-auto w-28 shrink-0 rounded-xl sm:block"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                  <PinIcon className="h-3 w-3" /> {m.listing.area}
                </p>
                <p className="font-display font-semibold text-brand-950">{m.listing.title}</p>
              </div>
              <p className="shrink-0 text-right font-display font-semibold text-brand-950">
                {inr(m.rentShare)} <span className="block font-sans text-xs font-normal text-gray-500">each</span>
              </p>
            </div>
            <p className="my-2 rounded-xl bg-rose-50 px-3 py-1.5 text-sm text-rose-800">✗ {capitalize(m.violation.message)}</p>
            <ListingFacts listing={m.listing} />
          </div>
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
