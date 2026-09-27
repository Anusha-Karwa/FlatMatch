import "server-only";
import { getStore } from "./store";
import type { Listing, ListingInput } from "./types";

/**
 * The one place listings come from. v1 = seeded mock listings + listings a member adds by hand.
 * To plug in a real property API later, implement ListingSource (e.g. fetch + map to `Listing`,
 * then merge with the group's manual listings) and return it from getListingSource().
 */
export interface ListingSource {
  /** Listings visible to a group: shared seed listings plus the group's own additions. */
  list(groupId: string): Promise<Listing[]>;
  add(groupId: string, input: ListingInput): Promise<Listing>;
}

export async function getListingSource(): Promise<ListingSource> {
  const store = await getStore();
  return {
    list: (groupId) => store.listListings(groupId),
    add: (groupId, input) => store.addListing(groupId, input),
  };
}
