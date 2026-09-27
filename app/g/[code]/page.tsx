import { notFound } from "next/navigation";
import { GroupHub } from "@/components/GroupHub";
import { getGroupStatus, HttpError } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params, searchParams }: { params: { code: string }; searchParams: { new?: string } }) {
  const code = params.code.toUpperCase();
  try {
    const status = await getGroupStatus(code);
    return <GroupHub initial={status} isNew={searchParams.new === "1"} />;
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
}
