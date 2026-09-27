import { handle, json } from "@/lib/api";
import { createSampleGroup } from "@/lib/groups";

export async function POST() {
  return handle(async () => json(await createSampleGroup(), 201));
}
