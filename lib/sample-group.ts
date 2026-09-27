import type { MemberWithPrefs } from "./types";

/**
 * The case study: Riya, Meera and Kavita looking for a shared 3BHK in Pune.
 * - Kavita: short commute to her office in Hinjewadi (Baner at 45 min was a no).
 * - Riya: within 20 min of her gym and family in Aundh (Kothrud, across town, was a no).
 * - Meera: knee condition, so no stairs above the 1st floor without a lift.
 */
export const SAMPLE_MEMBERS: MemberWithPrefs[] = [
  {
    slot: 1,
    name: "Riya",
    preferences: {
      maxRent: 16000,
      excludedAreas: ["Kothrud", "Hadapsar", "Kharadi"],
      anchors: [{ label: "Gym & family", area: "Aundh", maxMinutes: 20 }],
      dealbreakers: { maxFloorWithoutLift: null, parking: true, minBathrooms: 2, petFriendly: false, minFurnishing: "unfurnished" },
      niceToHaves: { balcony: 3, gym: 2, near_metro: 1 },
    },
  },
  {
    slot: 2,
    name: "Meera",
    preferences: {
      maxRent: 15000,
      excludedAreas: ["Hadapsar", "Camp"],
      anchors: [{ label: "Office", area: "Baner", maxMinutes: 30 }],
      dealbreakers: { maxFloorWithoutLift: 1, parking: false, minBathrooms: 2, petFriendly: false, minFurnishing: "unfurnished" },
      niceToHaves: { furnished: 3, power_backup: 2, balcony: 1 },
    },
  },
  {
    slot: 3,
    name: "Kavita",
    preferences: {
      maxRent: 17000,
      excludedAreas: ["Viman Nagar", "Kharadi", "Koregaon Park", "Kalyani Nagar"],
      anchors: [{ label: "Office", area: "Hinjewadi", maxMinutes: 40 }],
      dealbreakers: { maxFloorWithoutLift: null, parking: false, minBathrooms: 1, petFriendly: true, minFurnishing: "unfurnished" },
      niceToHaves: { gym: 3, near_metro: 2, balcony: 1 },
    },
  },
];
