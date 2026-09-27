import Link from "next/link";
import { Skyline } from "./Art";
import { BackgroundVideo } from "./BackgroundVideo";

/** Sea-green page header over city footage, used on every inner page. */
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
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-5 pb-16 pt-5 text-white shadow-lift sm:px-7">
      <BackgroundVideo className="-z-20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-800/85 via-brand-700/65 to-brand-900/85" />
      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 w-full" seed={eyebrow ?? "banner"} />
      <div className="relative">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
            ← {backLabel}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mt-3 text-sand-200">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight drop-shadow-sm sm:text-3xl">{title}</h1>
        {children && <div className="mt-2 max-w-xl text-sm text-white/90">{children}</div>}
      </div>
    </section>
  );
}
