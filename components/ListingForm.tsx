"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { AREAS, type Area } from "@/lib/commute";
import { AMENITIES, NICE_TO_HAVE_LABELS, type Amenity, type Furnishing, type ListingInput } from "@/lib/types";

interface FormState {
  title: string;
  area: Area | "";
  bhk: string;
  rent: string;
  floor: string;
  totalFloors: string;
  hasLift: boolean;
  parking: boolean;
  bathrooms: string;
  petFriendly: boolean;
  furnished: Furnishing;
  amenities: Amenity[];
  description: string;
}

const EMPTY: FormState = {
  title: "",
  area: "",
  bhk: "3",
  rent: "",
  floor: "",
  totalFloors: "",
  hasLift: true,
  parking: true,
  bathrooms: "2",
  petFriendly: false,
  furnished: "semi",
  amenities: [],
  description: "",
};

const str = (n: number | undefined, fallback: string) => (n === undefined ? fallback : String(n));

export function ListingForm({ code, geminiEnabled }: { code: string; geminiEnabled: boolean }) {
  const [f, setF] = useState<FormState>(EMPTY);
  const [source, setSource] = useState<"manual" | "pasted">("manual");
  const [paste, setPaste] = useState("");
  const [parsing, setParsing] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function parse() {
    setParsing(true);
    setError(null);
    setNotes([]);
    try {
      const res = await api<{ fields: Partial<ListingInput>; warnings: string[] }>(`/api/groups/${code}/listings/parse`, {
        method: "POST",
        body: JSON.stringify({ text: paste }),
      });
      const p = res.fields;
      setF((s) => ({
        title: p.title ?? s.title,
        area: p.area ?? s.area,
        bhk: str(p.bhk, s.bhk),
        rent: str(p.rent, s.rent),
        floor: str(p.floor, s.floor),
        totalFloors: str(p.totalFloors, s.totalFloors),
        hasLift: p.hasLift ?? s.hasLift,
        parking: p.parking ?? s.parking,
        bathrooms: str(p.bathrooms, s.bathrooms),
        petFriendly: p.petFriendly ?? s.petFriendly,
        furnished: p.furnished ?? s.furnished,
        amenities: p.amenities ?? s.amenities,
        description: p.description ?? s.description,
      }));
      setSource("pasted");
      setNotes(["Fields filled from the text. Check every field below before saving.", ...res.warnings]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.area) {
      setError("Pick an area");
      return;
    }
    setSaving(true);
    const body: ListingInput = {
      title: f.title.trim(),
      area: f.area,
      bhk: Number(f.bhk),
      rent: Number(f.rent),
      floor: Number(f.floor),
      totalFloors: Number(f.totalFloors),
      hasLift: f.hasLift,
      parking: f.parking,
      bathrooms: Number(f.bathrooms),
      petFriendly: f.petFriendly,
      furnished: f.furnished,
      amenities: f.amenities,
      description: f.description.trim() || undefined,
      source,
    };
    try {
      await api(`/api/groups/${code}/listings`, { method: "POST", body: JSON.stringify(body) });
      setSaved(body.title);
      setF(EMPTY);
      setPaste("");
      setNotes([]);
      setSource("manual");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${code}`} className="text-sm text-brand-700">
          ← Group {code}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Add a listing</h1>
        <p className="text-sm text-gray-600">It&apos;s checked against everyone&apos;s requirements automatically, and shows up in results if it fits.</p>
      </div>

      {saved && (
        <div className="card space-y-2 border-brand-200 bg-brand-50">
          <p className="font-medium text-brand-900">Saved “{saved}” ✓</p>
          <div className="flex gap-2">
            <Link href={`/g/${code}/results`} className="btn-primary">
              See results
            </Link>
            <button className="btn-ghost" onClick={() => setSaved(null)}>
              Add another
            </button>
          </div>
        </div>
      )}

      {geminiEnabled && (
        <section className="card space-y-2">
          <h2 className="section-title">Paste listing text</h2>
          <p className="hint">Copy the description from 99acres, MagicBricks, NoBroker or a WhatsApp forward. Gemini fills in the fields and you review them.</p>
          <textarea
            className="input min-h-28"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="e.g. Spacious 3BHK in Balewadi, 7th floor of 12, lift, 2 covered parking, 3 bathrooms, semi-furnished, 45k/month, society gym and pool, pets allowed…"
          />
          <button type="button" onClick={parse} className="btn-secondary w-full" disabled={parsing || paste.trim().length < 20}>
            {parsing ? "Reading listing…" : "✨ Fill fields from text"}
          </button>
        </section>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" className="input" required minLength={3} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="3BHK near Balewadi High Street" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="area">
              Area
            </label>
            <select id="area" className="input" required value={f.area} onChange={(e) => set("area", e.target.value as Area)}>
              <option value="" disabled>
                Choose…
              </option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <NumberField id="rent" label="Total rent (₹/month)" value={f.rent} onChange={(v) => set("rent", v)} min={1000} step={500} />
          <NumberField id="bhk" label="Bedrooms (BHK)" value={f.bhk} onChange={(v) => set("bhk", v)} min={1} max={6} />
          <NumberField id="baths" label="Bathrooms" value={f.bathrooms} onChange={(v) => set("bathrooms", v)} min={1} max={6} />
          <NumberField id="floor" label="Floor (0 = ground)" value={f.floor} onChange={(v) => set("floor", v)} min={0} max={80} />
          <NumberField id="totalFloors" label="Total floors" value={f.totalFloors} onChange={(v) => set("totalFloors", v)} min={0} max={80} />
        </div>
        <div>
          <label className="label" htmlFor="furnished">
            Furnishing
          </label>
          <select id="furnished" className="input" value={f.furnished} onChange={(e) => set("furnished", e.target.value as Furnishing)}>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi">Semi-furnished</option>
            <option value="full">Fully furnished</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Check label="Lift" checked={f.hasLift} onChange={(v) => set("hasLift", v)} />
          <Check label="Parking" checked={f.parking} onChange={(v) => set("parking", v)} />
          <Check label="Pet-friendly" checked={f.petFriendly} onChange={(v) => set("petFriendly", v)} />
        </div>
        <div>
          <p className="label">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = f.amenities.includes(a);
              return (
                <button
                  type="button"
                  key={a}
                  aria-pressed={on}
                  className={on ? "chip-on" : "chip-off"}
                  onClick={() => set("amenities", on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])}
                >
                  {NICE_TO_HAVE_LABELS[a]}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="desc">
            Notes (optional)
          </label>
          <textarea id="desc" className="input min-h-20" maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Save listing"}
        </button>
      </form>
    </div>
  );
}

function NumberField(props: { id: string; label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        type="number"
        inputMode="numeric"
        className="input"
        required
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
      {label}
      <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
