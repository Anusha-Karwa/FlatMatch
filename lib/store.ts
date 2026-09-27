import "server-only";
import { randomUUID } from "node:crypto";
import { SEED_LISTINGS } from "./seed-listings";
import type { Listing, ListingInput, MatchResult, Preferences } from "./types";

export type GroupStatus = "collecting" | "complete";

export interface GroupRecord {
  id: string;
  code: string;
  status: GroupStatus;
  createdAt: string;
}

export interface MemberRecord {
  id: string;
  groupId: string;
  slot: number;
  name: string;
  submittedAt: string | null;
  editToken: string | null;
}

export class DuplicateCodeError extends Error {}

/** Everything the app persists. Only ever used from server routes. */
export interface Store {
  kind: "supabase" | "memory";
  /** Throws DuplicateCodeError if the code is taken. */
  createGroup(code: string, names: string[]): Promise<{ group: GroupRecord; members: MemberRecord[] }>;
  getGroupByCode(code: string): Promise<{ group: GroupRecord; members: MemberRecord[] } | null>;
  getPreferences(memberIds: string[]): Promise<Record<string, Preferences>>;
  savePreferences(memberId: string, prefs: Preferences, editToken: string): Promise<void>;
  setGroupState(groupId: string, status: GroupStatus, results: MatchResult | null): Promise<void>;
  listListings(groupId: string): Promise<Listing[]>;
  addListing(groupId: string, input: ListingInput): Promise<Listing>;
}

// ---------- in-memory fallback (local dev without Supabase) ----------

interface MemoryState {
  groups: (GroupRecord & { results: MatchResult | null })[];
  members: MemberRecord[];
  prefs: Map<string, Preferences>;
  listings: Listing[];
}

const g = globalThis as unknown as { __flatmatchMemory?: MemoryState };

function memoryState(): MemoryState {
  g.__flatmatchMemory ??= { groups: [], members: [], prefs: new Map(), listings: [...SEED_LISTINGS] };
  return g.__flatmatchMemory;
}

const clone = <T,>(v: T): T => structuredClone(v);

export const memoryStore: Store = {
  kind: "memory",
  async createGroup(code, names) {
    const s = memoryState();
    if (s.groups.some((x) => x.code === code)) throw new DuplicateCodeError(code);
    const group = { id: randomUUID(), code, status: "collecting" as const, createdAt: new Date().toISOString(), results: null };
    const members = names.map((name, i) => ({ id: randomUUID(), groupId: group.id, slot: i + 1, name, submittedAt: null, editToken: null }));
    s.groups.push(group);
    s.members.push(...members);
    return clone({ group, members });
  },
  async getGroupByCode(code) {
    const s = memoryState();
    const group = s.groups.find((x) => x.code === code);
    if (!group) return null;
    const members = s.members.filter((m) => m.groupId === group.id).sort((a, b) => a.slot - b.slot);
    return clone({ group, members });
  },
  async getPreferences(memberIds) {
    const s = memoryState();
    const out: Record<string, Preferences> = {};
    for (const id of memberIds) {
      const p = s.prefs.get(id);
      if (p) out[id] = clone(p);
    }
    return out;
  },
  async savePreferences(memberId, prefs, editToken) {
    const s = memoryState();
    const m = s.members.find((x) => x.id === memberId);
    if (!m) throw new Error("member not found");
    s.prefs.set(memberId, clone(prefs));
    m.submittedAt = new Date().toISOString();
    m.editToken = editToken;
  },
  async setGroupState(groupId, status, results) {
    const group = memoryState().groups.find((x) => x.id === groupId);
    if (group) {
      group.status = status;
      group.results = results;
    }
  },
  async listListings(groupId) {
    return clone(memoryState().listings.filter((l) => !l.groupId || l.groupId === groupId));
  },
  async addListing(groupId, input) {
    const listing: Listing = { ...input, id: randomUUID(), source: input.source ?? "manual", groupId };
    memoryState().listings.push(listing);
    return clone(listing);
  },
};

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: Store | null = null;

export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (isSupabaseConfigured()) {
    const { createSupabaseStore } = await import("./supabase-store");
    cached = createSupabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  } else {
    cached = memoryStore;
  }
  return cached;
}
