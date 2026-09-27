import { handle, json, parseCode, readJson } from "@/lib/api";
import { isGeminiEnabled, parseListingText } from "@/lib/gemini";
import { HttpError, requireGroupId } from "@/lib/groups";

export const maxDuration = 30;

/** Scoped to a group so the Gemini key can't be used by anyone who finds the endpoint. */
export async function POST(req: Request, { params }: { params: { code: string } }) {
  return handle(async () => {
    if (!isGeminiEnabled()) throw new HttpError(404, "Listing parsing is not enabled");
    await requireGroupId(parseCode(params.code));
    const body = (await readJson(req)) as { text?: unknown };
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (text.length < 20) throw new HttpError(400, "Paste a bit more of the listing text");
    try {
      return json(await parseListingText(text));
    } catch (e) {
      console.error(e);
      throw new HttpError(502, "Gemini couldn't read that listing. Try again or fill the fields manually.");
    }
  });
}
