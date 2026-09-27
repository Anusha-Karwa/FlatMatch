import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isArea } from "./commute";
import { DuplicateCodeError, type GroupRecord, type MemberRecord, type Store } from "./store";
import type { Amenity, Furnishing, Listing } from "./types";

interface ListingRow {
  id: string;
  group_id: string | null;
  title: string;
  area: string;
  bhk: number;
  rent: number;
  floor: number;
  total_floors: number;
  has_lift: boolean;
  parking: boolean;
  bathrooms: number;
  pet_friendly: boolean;
  furnished: Furnishing;
  amenities: string[] | null;
  description: string | null;
  source: Listing["source"];
}

const toGroup = (r: { id: string; code: string; status: GroupRecord["status"]; created_at: string }): GroupRecord => ({
  id: r.id,
  code: r.code,
  status: r.status,
  createdAt: r.created_at,
});

const toMember = (r: {
  id: string;
  group_id: string;
  slot: number;
  name: string;
  submitted_at: string | null;
  edit_token: string | null;
}): MemberRecord => ({
  id: r.id,
  groupId: r.group_id,
  slot: r.slot,
  name: r.name,
  submittedAt: r.submitted_at,
  editToken: r.edit_token,
});

function toListing(r: ListingRow): Listing | null {
  if (!isArea(r.area)) return null; // ignore rows for areas the commute matrix doesn't know
  return {
    id: r.id,
    groupId: r.group_id,
    title: r.title,
    area: r.area,
    bhk: r.bhk,
    rent: r.rent,
    floor: r.floor,
    totalFloors: r.total_floors,
    hasLift: r.has_lift,
    parking: r.parking,
    bathrooms: r.bathrooms,
    petFriendly: r.pet_friendly,
    furnished: r.furnished,
    amenities: (r.amenities ?? []) as Amenity[],
    description: r.description ?? undefined,
    source: r.source,
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const MEMBER_COLS = "id, group_id, slot, name, submitted_at, edit_token";

  return {
    kind: "supabase",

    async createGroup(code, names) {
      const res = await db.from("groups").insert({ code }).select("id, code, status, created_at").single();
      if (res.error?.code === "23505") throw new DuplicateCodeError(code);
      const group = toGroup(check(res)!);
      const rows = names.map((name, i) => ({ group_id: group.id, slot: i + 1, name }));
      const members = check(await db.from("members").insert(rows).select(MEMBER_COLS))!.map(toMember);
      return { group, members: members.sort((a, b) => a.slot - b.slot) };
    },

    async getGroupByCode(code) {
      const res = await db.from("groups").select("id, code, status, created_at").eq("code", code).maybeSingle();
      const row = check(res);
      if (!row) return null;
      const members = check(await db.from("members").select(MEMBER_COLS).eq("group_id", row.id).order("slot"))!.map(toMember);
      return { group: toGroup(row), members };
    },

    async getPreferences(memberIds) {
      if (!memberIds.length) return {};
      const rows = check(await db.from("preferences").select("member_id, data").in("member_id", memberIds))!;
      return Object.fromEntries(rows.map((r) => [r.member_id, r.data]));
    },

    async savePreferences(memberId, prefs, editToken) {
      check(
        await db.from("preferences").upsert({ member_id: memberId, data: prefs, updated_at: new Date().toISOString() }),
      );
      check(
        await db.from("members").update({ submitted_at: new Date().toISOString(), edit_token: editToken }).eq("id", memberId),
      );
    },

    async setGroupState(groupId, status, results) {
      check(
        await db
          .from("groups")
          .update({ status, results, results_updated_at: results ? new Date().toISOString() : null })
          .eq("id", groupId),
      );
    },

    async listListings(groupId) {
      const rows = check(
        await db.from("listings").select("*").or(`group_id.is.null,group_id.eq.${groupId}`).order("id"),
      ) as ListingRow[];
      return rows.map(toListing).filter((l): l is Listing => l !== null);
    },

    async addListing(groupId, input) {
      const row = {
        group_id: groupId,
        title: input.title,
        area: input.area,
        bhk: input.bhk,
        rent: input.rent,
        floor: input.floor,
        total_floors: input.totalFloors,
        has_lift: input.hasLift,
        parking: input.parking,
        bathrooms: input.bathrooms,
        pet_friendly: input.petFriendly,
        furnished: input.furnished,
        amenities: input.amenities,
        description: input.description ?? null,
        source: input.source ?? "manual",
      };
      const saved = check(await db.from("listings").insert(row).select("*").single()) as ListingRow;
      return toListing(saved)!;
    },
  };
}
