"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getEditToken, setEditToken } from "@/lib/client";
import { AREAS, type Area } from "@/lib/commute";
import { inr } from "@/lib/format";
import { NICE_TO_HAVES, NICE_TO_HAVE_LABELS, type Anchor, type Furnishing, type NiceToHave, type Preferences } from "@/lib/types";
import { PageBanner } from "./PageBanner";

interface MemberForm {
  name: string;
  submitted: boolean;
  canEdit: boolean;
  preferences: Preferences | null;
  complete: boolean;
}

const DEFAULT_PREFS: Preferences = {
  maxRent: 15000,
  excludedAreas: [],
  anchors: [{ label: "Office", area: "Hinjewadi", maxMinutes: 40 }],
  dealbreakers: { maxFloorWithoutLift: null, parking: false, minBathrooms: 1, petFriendly: false, minFurnishing: "unfurnished" },
  niceToHaves: {},
};

const PLACE_PRESETS = ["Office", "Gym / family", "College", "Partner", "Other"];

const LIFT_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Stairs are fine, any floor" },
  { value: "0", label: "Need a lift unless it's the ground floor" },
  { value: "1", label: "Need a lift above the 1st floor" },
  { value: "2", label: "Need a lift above the 2nd floor" },
  { value: "3", label: "Need a lift above the 3rd floor" },
];

export function PreferencesForm({ code, slot }: { code: string; slot: number }) {
  const router = useRouter();
  const [info, setInfo] = useState<MemberForm | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getEditToken(code, slot);
    api<MemberForm>(`/api/groups/${code}/members/${slot}`, { headers: token ? { "x-edit-token": token } : {} })
      .then((res) => {
        setInfo(res);
        if (res.preferences) setPrefs(res.preferences);
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [code, slot]);

  if (loadError) return <p className="card text-red-700">{loadError}</p>;
  if (!info) return <p className="card animate-pulse text-gray-500">Loading your form…</p>;

  if (info.submitted && !info.canEdit) {
    return (
      <div className="card space-y-3 text-center">
        <h1 className="text-xl font-bold">{info.name} has already submitted ✓</h1>
        <p className="text-gray-600">
          Answers stay private until all three are in, and only {info.name}&apos;s own browser can change them.
        </p>
        <Link href={`/g/${code}`} className="btn-primary">
          Back to group
        </Link>
      </div>
    );
  }

  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const setDb = <K extends keyof Preferences["dealbreakers"]>(k: K, v: Preferences["dealbreakers"][K]) =>
    setPrefs((p) => ({ ...p, dealbreakers: { ...p.dealbreakers, [k]: v } }));
  const setAnchor = (i: number, patch: Partial<Anchor>) =>
    set("anchors", prefs.anchors.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const toggleArea = (a: Area) =>
    set("excludedAreas", prefs.excludedAreas.includes(a) ? prefs.excludedAreas.filter((x) => x !== a) : [...prefs.excludedAreas, a]);
  const setWeight = (k: NiceToHave, w: 0 | 1 | 2 | 3) => {
    const next = { ...prefs.niceToHaves };
    if (w === 0) delete next[k];
    else next[k] = w;
    set("niceToHaves", next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = getEditToken(code, slot);
      const res = await api<{ editToken: string; complete: boolean }>(`/api/groups/${code}/members/${slot}`, {
        method: "PUT",
        headers: token ? { "x-edit-token": token } : {},
        body: JSON.stringify({ preferences: prefs }),
      });
      setEditToken(code, slot, res.editToken);
      router.push(res.complete ? `/g/${code}/results` : `/g/${code}?submitted=${slot}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PageBanner backHref={`/g/${code}`} backLabel={`Group ${code}`} eyebrow="Private form" title={`${info.name}'s requirements`}>
        🔒 The others won&apos;t see this until all three of you have submitted. Be honest: it saves arguments later.
      </PageBanner>

      <section className="card space-y-2">
        <label className="section-title" htmlFor="maxRent">
          Your max rent contribution
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg text-gray-500">₹</span>
          <input
            id="maxRent"
            type="number"
            inputMode="numeric"
            className="input"
            min={1000}
            step={500}
            required
            value={prefs.maxRent || ""}
            onChange={(e) => set("maxRent", Math.round(Number(e.target.value)))}
          />
          <span className="shrink-0 text-sm text-gray-500">/ month</span>
        </div>
        <p className="hint">
          Rent is split equally, so you can afford flats up to {inr((prefs.maxRent || 0) * 3)} total rent.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">Areas you won&apos;t consider</h2>
        <p className="hint">Tap to exclude. Leave everything unselected if you&apos;re open to anywhere.</p>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const on = prefs.excludedAreas.includes(a);
            return (
              <button type="button" key={a} onClick={() => toggleArea(a)} className={on ? "chip border-red-400 bg-red-50 text-red-700" : "chip-off"} aria-pressed={on}>
                {on ? "✕ " : ""}
                {a}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="section-title">Places you need to be close to</h2>
          <p className="hint">Office, gym, family… and the longest one-way commute you&apos;d accept at peak time.</p>
        </div>
        {prefs.anchors.map((a, i) => (
          <div key={i} className="space-y-2 rounded-2xl bg-brand-50/60 p-3">
            <div className="flex gap-2">
              <input
                className="input"
                aria-label="What is it?"
                list="place-presets"
                value={a.label}
                maxLength={40}
                required
                onChange={(e) => setAnchor(i, { label: e.target.value })}
              />
              <button type="button" className="btn-ghost shrink-0 px-3" onClick={() => set("anchors", prefs.anchors.filter((_, k) => k !== i))} aria-label="Remove place">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" aria-label="Area" value={a.area} onChange={(e) => setAnchor(i, { area: e.target.value as Area })}>
                {AREAS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  className="input"
                  aria-label="Max minutes"
                  min={5}
                  max={180}
                  step={5}
                  required
                  value={a.maxMinutes || ""}
                  onChange={(e) => setAnchor(i, { maxMinutes: Math.round(Number(e.target.value)) })}
                />
                <span className="shrink-0 text-sm text-gray-500">min max</span>
              </div>
            </div>
          </div>
        ))}
        <datalist id="place-presets">
          {PLACE_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {prefs.anchors.length < 5 && (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => set("anchors", [...prefs.anchors, { label: prefs.anchors.length ? "Gym / family" : "Office", area: "Aundh", maxMinutes: 30 }])}
          >
            + Add a place
          </button>
        )}
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="section-title">Dealbreakers</h2>
          <p className="hint">A flat that fails any of these is filtered out for everyone. Only add what you truly can&apos;t live with.</p>
        </div>
        <div>
          <label className="label" htmlFor="lift">
            Lift / stairs
          </label>
          <select
            id="lift"
            className="input"
            value={prefs.dealbreakers.maxFloorWithoutLift === null ? "any" : String(prefs.dealbreakers.maxFloorWithoutLift)}
            onChange={(e) => setDb("maxFloorWithoutLift", e.target.value === "any" ? null : Number(e.target.value))}
          >
            {LIFT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="baths">
              Min bathrooms
            </label>
            <select id="baths" className="input" value={prefs.dealbreakers.minBathrooms} onChange={(e) => setDb("minBathrooms", Number(e.target.value))}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="furn">
              Furnishing
            </label>
            <select id="furn" className="input" value={prefs.dealbreakers.minFurnishing} onChange={(e) => setDb("minFurnishing", e.target.value as Furnishing)}>
              <option value="unfurnished">Any</option>
              <option value="semi">At least semi</option>
              <option value="full">Fully furnished</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Toggle label="Must have parking" checked={prefs.dealbreakers.parking} onChange={(v) => setDb("parking", v)} />
          <Toggle label="Must be pet-friendly" checked={prefs.dealbreakers.petFriendly} onChange={(v) => setDb("petFriendly", v)} />
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="section-title">Nice-to-haves</h2>
          <p className="hint">These don&apos;t filter anything out. They decide which of the qualifying flats rank higher for you.</p>
        </div>
        <ul className="space-y-2">
          {NICE_TO_HAVES.map((k) => {
            const w = prefs.niceToHaves[k] ?? 0;
            return (
              <li key={k} className="flex items-center justify-between gap-2">
                <span className="text-sm">{NICE_TO_HAVE_LABELS[k]}</span>
                <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs" role="radiogroup" aria-label={NICE_TO_HAVE_LABELS[k]}>
                  {(["–", "1", "2", "3"] as const).map((lbl, i) => (
                    <button
                      type="button"
                      key={lbl}
                      role="radio"
                      aria-checked={w === i}
                      title={i === 0 ? "Don't care" : `Weight ${i}`}
                      onClick={() => setWeight(k, i as 0 | 1 | 2 | 3)}
                      className={`w-9 py-1.5 font-semibold ${w === i ? "bg-brand-500 text-brand-950" : "bg-white text-gray-600 hover:bg-brand-50"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hint">– don&apos;t care · 1 a bit · 2 quite a lot · 3 really want</p>
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn-primary sticky bottom-3 w-full py-3.5 text-base shadow-lg" disabled={saving}>
        {saving ? "Saving…" : info.submitted ? "Save changes" : "Submit my answers"}
      </button>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-brand-50/60 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
