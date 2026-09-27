import { HomeActions } from "@/components/HomeActions";

const steps = [
  { title: "Fill in your form on your own", body: "Budget, no-go areas, commute limits, dealbreakers, nice-to-haves. Nobody sees anyone else's answers yet." },
  { title: "Results unlock when all 3 are in", body: "Only flats that respect everyone's dealbreakers make the list." },
  { title: "Talk about tradeoffs, not whether a flat qualifies", body: "Each flat shows what each person gets ✅ and gives up ⚠️." },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          Find a flat that works for <span className="text-brand-600">all three</span> of you.
        </h1>
        <p className="text-gray-600">
          No more listings killed one objection at a time in the WhatsApp group. FlatMatch doesn&apos;t pick the flat. It filters out
          the ones that can&apos;t work and explains the tradeoffs in the ones that can.
        </p>
      </section>

      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-2xl bg-white/70 p-3 text-sm ring-1 ring-black/5">
            <span className="mb-1 grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
            <p className="font-semibold">{s.title}</p>
            <p className="text-gray-600">{s.body}</p>
          </li>
        ))}
      </ol>

      <HomeActions />
    </div>
  );
}
