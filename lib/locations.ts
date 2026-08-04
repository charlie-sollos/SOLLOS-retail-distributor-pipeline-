import raw from "@/data/locations.json";

/**
 * How product reaches the end drinker through this account.
 *
 * "dsd" is a door SOLLOS delivers to directly, which is what every velocity,
 * leaderboard and restock signal in the app is built to reason about. A
 * distributor takes a pallet and sells it on, so its volume dwarfs a door's and
 * says nothing about sell-through. Mixing the two makes every door-level
 * comparison meaningless, so channel is recorded rather than assumed.
 */
export type Channel = "dsd" | "distributor" | "dtc";

export const CHANNEL_LABELS: Record<Channel, string> = {
  dsd: "Direct store",
  distributor: "Distributor",
  dtc: "Direct to consumer",
};

export type StoreLocation = {
  id: string;
  name: string;
  /** Absent means direct store delivery, which every seeded account is. */
  channel?: Channel;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  website: string;
  lat?: number;
  lng?: number;
  approximate?: boolean;
};

export const locations = raw as StoreLocation[];

/**
 * Every seeded account predates the channel field and is a door SOLLOS delivers
 * to, so an absent channel reads as "dsd" rather than as unknown.
 */
export function channelOf(loc: StoreLocation): Channel {
  return loc.channel ?? "dsd";
}

/** True for the accounts the door-level signals are meant to describe. */
export function isDoor(loc: StoreLocation): boolean {
  return channelOf(loc) === "dsd";
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  Florida: "FL",
  "New Jersey": "NJ",
  "New York": "NY",
};

export function normalizeState(state: string): string {
  return STATE_ABBREVIATIONS[state] ?? state;
}
