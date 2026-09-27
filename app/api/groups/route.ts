import { handle, json, readJson } from "@/lib/api";
import { createGroup } from "@/lib/groups";
import { createGroupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return handle(async () => {
    const { names } = createGroupSchema.parse(await readJson(req));
    return json(await createGroup(names), 201);
  });
}
