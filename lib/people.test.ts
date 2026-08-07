import { describe, expect, it } from "vitest";
import { PEOPLE, buildRoster, displayName, findPersonByHandle, isSamePerson } from "@/lib/people";

describe("buildRoster", () => {
  it("reads a name and a handle off the address", () => {
    const [person] = buildRoster(["rodolfo@drinksollos.com"]);
    expect(person.name).toBe("Rodolfo");
    expect(person.handle).toBe("rodolfo");
    expect(person.initials).toBe("RO");
  });

  it("splits a dotted address into a full name", () => {
    const [person] = buildRoster(["maria.forero@drinksollos.com"]);
    expect(person.name).toBe("Maria Forero");
    expect(person.handle).toBe("maria");
    expect(person.initials).toBe("MF");
  });

  it("lowercases and trims, so one person is never two", () => {
    const [person] = buildRoster(["  Charlie@DrinkSollos.com "]);
    expect(person.email).toBe("charlie@drinksollos.com");
  });

  /**
   * The case that matters: an ambiguous @sam has to reach nobody rather than
   * whichever of the two happens to be first in the list.
   */
  it("falls back to the whole local part when two people share a first name", () => {
    const roster = buildRoster(["sam.hall@drinksollos.com", "sam.ortiz@drinksollos.com"]);
    expect(roster.map((p) => p.handle)).toEqual(["sam.hall", "sam.ortiz"]);
  });

  it("leaves a unique first name alone even when someone else has a dotted address", () => {
    const roster = buildRoster(["charlie@drinksollos.com", "sam.ortiz@drinksollos.com"]);
    expect(roster.map((p) => p.handle)).toEqual(["charlie", "sam"]);
  });
});

describe("the live roster", () => {
  it("holds the four people who can sign in", () => {
    expect(PEOPLE.map((p) => p.handle)).toEqual(["charlie", "rodolfo", "dillon", "jaseem"]);
  });

  it("has no two people answering to the same handle", () => {
    expect(new Set(PEOPLE.map((p) => p.handle)).size).toBe(PEOPLE.length);
  });

  it("finds a person by their handle", () => {
    expect(findPersonByHandle("dillon")?.email).toBe("dillon@drinksollos.com");
    expect(findPersonByHandle("DILLON")?.email).toBe("dillon@drinksollos.com");
    expect(findPersonByHandle("nobody")).toBeUndefined();
  });
});

describe("displayName", () => {
  it("names someone who is no longer on the roster rather than dropping them", () => {
    expect(displayName("stephen@drinksollos.com")).toBe("Stephen");
  });

  it("degrades to something safe with nothing to go on", () => {
    expect(displayName(null)).toBe("Someone");
    expect(displayName("")).toBe("Someone");
  });
});

describe("isSamePerson", () => {
  it("ignores case and spacing", () => {
    expect(isSamePerson("Charlie@drinksollos.com", "charlie@drinksollos.com ")).toBe(true);
  });

  it("is false when either side is missing, rather than matching everything", () => {
    expect(isSamePerson(null, null)).toBe(false);
    expect(isSamePerson("charlie@drinksollos.com", null)).toBe(false);
  });
});
