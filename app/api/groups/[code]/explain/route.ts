import { handle, json, parseCode } from "@/lib/api";
import { explainTradeoffs, isGeminiEnabled } from "@/lib/gemini";
import { getResults, HttpError } from "@/lib/groups";

export const maxDuration = 30;

/** Explanations are generated from the server's own match results, never from client-supplied text. */
export async function POST(_req: Request, { params }: { params: { code: string } }) {
  return handle(async () => {
    if (!isGeminiEnabled()) throw new HttpError(404, "Explanations are not enabled");
    const view = await getResults(parseCode(params.code));
    try {
      return json({ explanations: await explainTradeoffs(view) });
    } catch (e) {
      console.error(e);
      throw new HttpError(502, "Gemini couldn't write the explanation right now. Try again in a moment.");
    }
  });
}
