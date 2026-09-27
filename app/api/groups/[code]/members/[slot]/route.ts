import { handle, json, parseCode, parseSlot, readJson } from "@/lib/api";
import { getMemberForm, submitPreferences } from "@/lib/groups";
import { preferencesSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: { code: string; slot: string } };

const tokenFrom = (req: Request) => req.headers.get("x-edit-token") || null;

export async function GET(req: Request, { params }: Ctx) {
  return handle(async () => json(await getMemberForm(parseCode(params.code), parseSlot(params.slot), tokenFrom(req))));
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const body = (await readJson(req)) as { preferences?: unknown };
    const prefs = preferencesSchema.parse(body?.preferences);
    return json(await submitPreferences(parseCode(params.code), parseSlot(params.slot), prefs, tokenFrom(req)));
  });
}
