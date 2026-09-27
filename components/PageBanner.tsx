import Link from "next/link";
import { Skyline } from "./Art";

/** Sea-green page header with a skyline, used on every inner page. */
export function PageBanner({
  backHref,
  backLabel,
  eyebrow,
  title,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-5 pb-16 pt-5 text-white shadow-lift sm:px-7">
      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" seed={eyebrow ?? "banner"} />
      <div className="relative">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
            ← {backLabel}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mt-3 text-sand-200">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {children && <div className="mt-2 max-w-xl text-sm text-white/85">{children}</div>}
      </div>
    </section>
  );
}
