import { handle, json, parseCode, readJson } from "@/lib/api";
import { requireGroupId } from "@/lib/groups";
import { getListingSource } from "@/lib/listings";
import { listingInputSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: { code: string } }) {
  return handle(async () => {
    const groupId = await requireGroupId(parseCode(params.code));
    const input = listingInputSchema.parse(await readJson(req));
    const listing = await (await getListingSource()).add(groupId, input);
    return json({ listing }, 201);
  });
}
