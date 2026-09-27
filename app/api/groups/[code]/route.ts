import { handle, json, parseCode } from "@/lib/api";
import { getGroupStatus } from "@/lib/groups";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  return handle(async () => json(await getGroupStatus(parseCode(params.code))));
}
