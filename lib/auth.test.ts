import { describe, expect, it } from "vitest";
import {
  ALLOWED_EMAILS,
  checkCredentials,
  usingBuiltInCredentials,
  constantTimeEqual,
  createSessionToken,
  isAllowedEmail,
  readAuthConfig,
  verifySessionToken,
} from "@/lib/auth";

const SECRET = "test-secret-that-is-long-enough";
/** The real team password, so the compiled-in derivation is actually exercised. */
const TEAM_PASSWORD = "builtinacabana2026";
const CONFIG = { secret: SECRET, password: "correct horse battery staple" };
const HOUR = 60 * 60 * 1000;

describe("the allowlist", () => {
  it("holds the three team addresses", () => {
    expect(ALLOWED_EMAILS).toEqual([
      "charlie@drinksollos.com",
      "rodolfo@drinksollos.com",
      "dillon@drinksollos.com",
    ]);
  });

  it("ignores case and stray whitespace, which people type", () => {
    expect(isAllowedEmail("  Charlie@DrinkSollos.com ")).toBe(true);
  });

  it("turns away anyone else", () => {
    expect(isAllowedEmail("someone@example.com")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
    // A lookalike domain must not pass.
    expect(isAllowedEmail("charlie@drinksollos.com.evil.com")).toBe(false);
  });
});

describe("constantTimeEqual", () => {
  it("matches identical values and rejects everything else", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "ab")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
  });
});

describe("readAuthConfig", () => {
  it("falls back to the built-in credentials so a deploy is never unusable", () => {
    const c = readAuthConfig({});
    expect(c.secret.length).toBeGreaterThanOrEqual(32);
    expect(usingBuiltInCredentials(c)).toBe(true);
  });

  it("ignores a signing secret too short to be worth anything", () => {
    const c = readAuthConfig({ AUTH_SECRET: "short", AUTH_PASSWORD: "hunter2" });
    expect(c.secret).not.toBe("short");
    expect(usingBuiltInCredentials(c)).toBe(true);
  });

  it("prefers a fully configured environment over the built-ins", () => {
    const c = readAuthConfig({ AUTH_SECRET: "x".repeat(32), AUTH_PASSWORD: "hunter2" });
    expect(c.password).toBe("hunter2");
    expect(usingBuiltInCredentials(c)).toBe(false);
  });
});

describe("checkCredentials against an environment password", () => {
  it("lets a listed address in with the right password", async () => {
    const r = await checkCredentials("Charlie@drinksollos.com", CONFIG.password, CONFIG);
    expect(r).toEqual({ ok: true, email: "charlie@drinksollos.com" });
  });

  it("rejects the right password from an address not on the list", async () => {
    expect((await checkCredentials("nobody@example.com", CONFIG.password, CONFIG)).ok).toBe(false);
  });

  it("rejects a listed address with the wrong password", async () => {
    expect((await checkCredentials("charlie@drinksollos.com", "wrong", CONFIG)).ok).toBe(false);
  });

  it("gives the same message either way, so it cannot be used to find valid emails", async () => {
    const unknownEmail = await checkCredentials("nobody@example.com", CONFIG.password, CONFIG);
    const wrongPassword = await checkCredentials("charlie@drinksollos.com", "wrong", CONFIG);
    expect(unknownEmail.ok).toBe(false);
    expect(wrongPassword.ok).toBe(false);
    if (!unknownEmail.ok && !wrongPassword.ok) {
      expect(unknownEmail.reason).toBe(wrongPassword.reason);
    }
  });
});

describe("checkCredentials against the built-in derivation", () => {
  const builtIn = readAuthConfig({});

  it("admits each of the three addresses with the team password", async () => {
    for (const email of ALLOWED_EMAILS) {
      const r = await checkCredentials(email, TEAM_PASSWORD, builtIn);
      expect(r.ok).toBe(true);
    }
  });

  it("turns away every other address, even with the right password", async () => {
    for (const email of ["nobody@example.com", "charlie@example.com", "", "charlie@drinksollos.com.evil.com"]) {
      expect((await checkCredentials(email, TEAM_PASSWORD, builtIn)).ok).toBe(false);
    }
  });

  it("turns away a listed address with any other password", async () => {
    for (const pw of ["", "wrong", TEAM_PASSWORD + "x", TEAM_PASSWORD.toUpperCase()]) {
      expect((await checkCredentials("charlie@drinksollos.com", pw, builtIn)).ok).toBe(false);
    }
  });
});

describe("session tokens", () => {
  it("round-trips a valid session", async () => {
    const token = await createSessionToken("charlie@drinksollos.com", SECRET, Date.now() + HOUR);
    const session = await verifySessionToken(token, SECRET);
    expect(session?.email).toBe("charlie@drinksollos.com");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("charlie@drinksollos.com", "other-secret-long", Date.now() + HOUR);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    // Swapping the email for one not on the list must not survive the signature.
    const token = await createSessionToken("charlie@drinksollos.com", SECRET, Date.now() + HOUR);
    const forged = btoa("attacker@example.com|" + (Date.now() + HOUR)) + "." + token.split(".")[1];
    expect(await verifySessionToken(forged, SECRET)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const token = await createSessionToken("charlie@drinksollos.com", SECRET, Date.now() - 1);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a session for someone since removed from the allowlist", async () => {
    const token = await createSessionToken("former@drinksollos.com", SECRET, Date.now() + HOUR);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects junk rather than throwing", async () => {
    for (const junk of ["", "no-dot", "...", "!!!.!!!", null, undefined]) {
      expect(await verifySessionToken(junk, SECRET)).toBeNull();
    }
  });
});
