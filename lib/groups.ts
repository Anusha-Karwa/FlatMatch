import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { getListingSource } from "./listings";
import { matchListings } from "./matching";
import { SAMPLE_MEMBERS } from "./sample-group";
import { DuplicateCodeError, getStore, type MemberRecord } from "./store";
import type { MatchResult, MemberWithPrefs, Preferences } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
const newToken = () => randomBytes(24).toString("base64url");

export interface GroupStatusView {
  code: string;
  complete: boolean;
  members: { slot: number; name: string; submitted: boolean }[];
  storage: "supabase" | "memory";
}

async function loadGroup(code: string) {
  const store = await getStore();
  const found = await store.getGroupByCode(code);
  if (!found) throw new HttpError(404, "Group not found. Check the code?");
  return { store, ...found };
}

const allSubmitted = (members: MemberRecord[]) => members.length === 3 && members.every((m) => m.submittedAt);

function statusView(code: string, members: MemberRecord[], storage: GroupStatusView["storage"]): GroupStatusView {
  return {
    code,
    complete: allSubmitted(members),
    members: members.map((m) => ({ slot: m.slot, name: m.name, submitted: Boolean(m.submittedAt) })),
    storage,
  };
}

export async function createGroup(names: string[]): Promise<{ code: string }> {
  const store = await getStore();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { group } = await store.createGroup(newCode(), names);
      return { code: group.code };
    } catch (e) {
      if (!(e instanceof DuplicateCodeError)) throw e;
    }
  }
  throw new HttpError(500, "Couldn't generate a unique group code, please try again");
}

/** Names + submitted flags only. Never anyone's answers. */
export async function getGroupStatus(code: string): Promise<GroupStatusView> {
  const { store, members } = await loadGroup(code);
  return statusView(code, members, store.kind);
}

/**
 * What a member sees when she opens her slot. Her previous answers are only returned
 * to the browser that submitted them (it holds the edit token).
 */
export async function getMemberForm(code: string, slot: number, editToken: string | null) {
  const { store, members } = await loadGroup(code);
  const member = members.find((m) => m.slot === slot);
  if (!member) throw new HttpError(404, "No such member slot");
  const canEdit = !member.submittedAt || (editToken !== null && editToken === member.editToken);
  let preferences: Preferences | null = null;
  if (member.submittedAt && canEdit) {
    preferences = (await store.getPreferences([member.id]))[member.id] ?? null;
  }
  return { name: member.name, submitted: Boolean(member.submittedAt), canEdit, preferences, complete: allSubmitted(members) };
}

export async function submitPreferences(code: string, slot: number, prefs: Preferences, editToken: string | null) {
  const { store, group, members } = await loadGroup(code);
  const member = members.find((m) => m.slot === slot);
  if (!member) throw new HttpError(404, "No such member slot");
  if (member.submittedAt && editToken !== member.editToken) {
    throw new HttpError(403, `${member.name} has already submitted. Only her browser can change her answers.`);
  }
  const token = member.editToken ?? newToken();
  await store.savePreferences(member.id, prefs, token);

  const updated = members.map((m) => (m.id === member.id ? { ...m, submittedAt: new Date().toISOString() } : m));
  const complete = allSubmitted(updated);
  if (complete) {
    const { result } = await computeResults(group.id, updated);
    await store.setGroupState(group.id, "complete", result);
  }
  return { editToken: token, complete };
}

async function computeResults(groupId: string, members: MemberRecord[]) {
  const store = await getStore();
  const prefs = await store.getPreferences(members.map((m) => m.id));
  const withPrefs: MemberWithPrefs[] = members.map((m) => {
    const p = prefs[m.id];
    if (!p) throw new HttpError(500, `Missing answers for ${m.name}`);
    return { slot: m.slot, name: m.name, preferences: p };
  });
  const listings = await (await getListingSource()).list(groupId);
  return { members: withPrefs, result: matchListings(withPrefs, listings) };
}

export interface ResultsView {
  code: string;
  members: MemberWithPrefs[];
  result: MatchResult;
}

/** Unlocks only once all three have submitted. Recomputed each time so newly added listings count. */
export async function getResults(code: string): Promise<ResultsView> {
  const { store, group, members } = await loadGroup(code);
  if (!allSubmitted(members)) throw new HttpError(403, "Results unlock once all three have submitted.");
  const { members: withPrefs, result } = await computeResults(group.id, members);
  await store.setGroupState(group.id, "complete", result);
  return { code, members: withPrefs, result };
}

export async function requireGroupId(code: string): Promise<string> {
  const { group } = await loadGroup(code);
  return group.id;
}

/** Demo: a group with Riya, Meera and Kavita's case-study answers already submitted. */
export async function createSampleGroup(): Promise<{ code: string }> {
  const { code } = await createGroup(SAMPLE_MEMBERS.map((m) => m.name));
  for (const m of SAMPLE_MEMBERS) {
    await submitPreferences(code, m.slot, m.preferences, null);
  }
  return { code };
}
