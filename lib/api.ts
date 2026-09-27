import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./groups";
import { groupCodeSchema, slotSchema } from "./validation";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Wraps a route handler: validation → 400, HttpError → its status, anything else → 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return json({ error: `Invalid input${first ? `: ${first.path.join(".")} ${first.message}` : ""}` }, 400);
    }
    console.error(e);
    return json({ error: "Something went wrong on our side." }, 500);
  }
}

export function parseCode(raw: string): string {
  const code = raw.toUpperCase();
  if (!groupCodeSchema.safeParse(code).success) throw new HttpError(404, "Group not found. Check the code?");
  return code;
}

export function parseSlot(raw: string): number {
  const r = slotSchema.safeParse(raw);
  if (!r.success) throw new HttpError(404, "No such member slot");
  return r.data;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
}
