import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/ResultsView";
import { isGeminiEnabled } from "@/lib/gemini";
import { getGroupStatus, getResults, HttpError } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  try {
    const view = await getResults(code);
    return <ResultsView view={view} geminiEnabled={isGeminiEnabled()} />;
  } catch (e) {
    if (!(e instanceof HttpError)) throw e;
    if (e.status === 404) notFound();
    if (e.status !== 403) throw e;
  }

  // Not everyone has submitted: show who we're waiting for, never anyone's answers.
  const status = await getGroupStatus(code);
  const waiting = status.members.filter((m) => !m.submitted).map((m) => m.name);
  return (
    <div className="card space-y-3 text-center">
      <p className="text-4xl" aria-hidden>
        🔒
      </p>
      <h1 className="text-xl font-bold">Results unlock when all three have submitted</h1>
      <p className="text-gray-600">Still waiting for {waiting.join(" and ")}.</p>
      <Link href={`/g/${code}`} className="btn-primary">
        Back to group
      </Link>
    </div>
  );
}
