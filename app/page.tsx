import { Skyline } from "@/components/Art";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { HomeActions } from "@/components/HomeActions";
import { AREAS } from "@/lib/commute";
import { SEED_LISTINGS } from "@/lib/seed-listings";

const steps = [
  { icon: "🔒", title: "Private forms", body: "Each of you adds budget, commute limits and dealbreakers alone. No anchoring, no guilt." },
  { icon: "🏢", title: "Only flats that fit", body: "Results unlock when all three submit, showing only listings that respect every dealbreaker." },
  { icon: "⚖️", title: "Clear tradeoffs", body: "Every flat shows what each person gets ✅ and gives up ⚠️, so you talk tradeoffs, not vetoes." },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-600 to-brand-700 px-6 pb-28 pt-9 text-white shadow-lift sm:px-10 sm:pt-12">
        <BackgroundVideo className="-z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-900/85 via-brand-700/60 to-brand-800/85" />
        <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-sand-300/20 blur-3xl" />
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 w-full sm:h-40" seed="hero" />
        <div className="relative max-w-xl">
          <p className="eyebrow text-sand-200">Flat hunting for three · Pune</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.1] sm:text-5xl">
            Find a home that works for <em className="font-display italic text-sand-200">all three</em> of you.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            No more listings shot down one objection at a time in the group chat. FlatMatch filters out the flats that can&apos;t
            work and spells out the tradeoffs in the ones that can. You still choose.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">{SEED_LISTINGS.length} listings</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">{AREAS.length} Pune areas</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">No login needed</span>
          </div>
        </div>
      </section>

      <div className="relative z-10 !-mt-24 px-1 sm:px-4">
        <HomeActions />
      </div>

      <section>
        <p className="eyebrow text-center text-brand-600">How it works</p>
        <h2 className="mt-1 text-center font-display text-2xl font-semibold text-brand-950">Three forms. One shortlist.</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="card relative">
              <span className="absolute right-5 top-4 font-display text-3xl font-semibold text-brand-100">{i + 1}</span>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-xl" aria-hidden>
                {s.icon}
              </span>
              <p className="mt-3 font-display text-lg font-semibold text-brand-950">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
