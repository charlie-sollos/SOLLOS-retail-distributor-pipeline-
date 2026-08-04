import { describe, expect, it } from "vitest";
import { CHANNEL_LABELS, channelOf, isDoor, locations } from "@/lib/locations";

describe("channel", () => {
  it("reads an account with no channel recorded as a door", () => {
    expect(channelOf({ id: "x", name: "x" } as never)).toBe("dsd");
    expect(isDoor({ id: "x", name: "x" } as never)).toBe(true);
  });

  it("holds a distributor and a DTC account out of the door signals", () => {
    expect(isDoor({ id: "x", name: "x", channel: "distributor" } as never)).toBe(false);
    expect(isDoor({ id: "x", name: "x", channel: "dtc" } as never)).toBe(false);
  });

  it("labels every channel, so none can render blank", () => {
    for (const c of ["dsd", "distributor", "dtc"] as const) {
      expect(CHANNEL_LABELS[c]).toBeTruthy();
    }
  });

  it("leaves every seeded account a door", () => {
    // The roster predates the channel field. If a distributor ever gets seeded,
    // this fails and the dashboard counts need looking at.
    expect(locations.every(isDoor)).toBe(true);
  });
});
