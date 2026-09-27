import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card space-y-3 text-center">
      <h1 className="text-xl font-bold">We couldn&apos;t find that group</h1>
      <p className="text-gray-600">Double-check the 6-character code from your WhatsApp group.</p>
      <Link href="/" className="btn-primary">
        Back home
      </Link>
    </div>
  );
}
