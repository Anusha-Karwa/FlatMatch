import { notFound } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { isGeminiEnabled } from "@/lib/gemini";
import { getGroupStatus, HttpError } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function NewListingPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  try {
    await getGroupStatus(code);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return <ListingForm code={code} geminiEnabled={isGeminiEnabled()} />;
}
