import { describe, expect, it } from "vitest";
import { lookFor } from "@/components/PixelAvatar";
import { PEOPLE } from "@/lib/people";

/**
 * The avatars are the only thing in the app that says who wrote a message at a
 * glance, so two people sharing one is a correctness problem rather than a
 * cosmetic one. Hashing each address independently is not enough on a roster
 * this small: charlie@ and dillon@ landed on the same head, skin and shirt.
 */
describe("the roster's aliens", () => {
  it("gives everybody a different head and skin", () => {
    const silhouettes = PEOPLE.map((p) => {
      const look = lookFor(p.email);
      return `${look.headIndex}|${look.skin}`;
    });
    expect(new Set(silhouettes).size).toBe(PEOPLE.length);
  });

  it("gives everybody a wholly different look, not just a different outline", () => {
    const looks = PEOPLE.map((p) => JSON.stringify(lookFor(p.email)));
    expect(new Set(looks).size).toBe(PEOPLE.length);
  });

  it("never puts a shirt the same colour as the head under it", () => {
    for (const person of PEOPLE) {
      const look = lookFor(person.email);
      expect(look.shirt).not.toBe(look.skin);
    }
  });
});

describe("lookFor", () => {
  it("returns the same face every time, since that is the whole contract", () => {
    expect(lookFor("rodolfo@drinksollos.com")).toEqual(lookFor("rodolfo@drinksollos.com"));
  });

  it("ignores casing and stray spacing in the address", () => {
    expect(lookFor("  Rodolfo@DrinkSollos.com ")).toEqual(lookFor("rodolfo@drinksollos.com"));
  });

  /** An address left on an old message still has to draw as something. */
  it("still draws somebody who is no longer on the roster", () => {
    const look = lookFor("stephen@drinksollos.com");
    expect(look.headIndex).toBeGreaterThanOrEqual(0);
    expect(look.skin).toMatch(/^#[0-9a-f]{6}$/);
    expect(look.shirt).not.toBe(look.skin);
  });
});
