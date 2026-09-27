export function MemoryBanner({ storage }: { storage: "supabase" | "memory" }) {
  if (storage !== "memory") return null;
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
      Demo storage: no database is configured, so groups live in server memory and will disappear on restart. Set the Supabase
      env vars to keep them.
    </p>
  );
}
