import { describe, expect, it } from "vitest";
import { USERNAME_INPUT_PATTERN, usernameInitial, usernameSchema } from "./username";

describe("usernameSchema", () => {
  it("normalizes a valid username", () => {
    expect(usernameSchema.parse("  Rachit_Masiwal  ")).toBe("rachit_masiwal");
  });

  it.each(["ab", "-rachit", "rachit-", "rachit masiwal", "rachit@agency"])(
    "rejects invalid username %s",
    (username) => {
      expect(usernameSchema.safeParse(username).success).toBe(false);
    },
  );
});

describe("usernameInitial", () => {
  it("returns an uppercase initial", () => {
    expect(usernameInitial("rachit")).toBe("R");
  });
});

describe("USERNAME_INPUT_PATTERN", () => {
  // Browsers compile the pattern attribute with the "v" flag; an invalid pattern is silently ignored.
  it("is a valid regular expression under the v flag", () => {
    expect(() => new RegExp(`^(?:${USERNAME_INPUT_PATTERN})$`, "v")).not.toThrow();
  });

  it("accepts and rejects the same names as usernameSchema", () => {
    const pattern = new RegExp(`^(?:${USERNAME_INPUT_PATTERN})$`, "v");
    for (const name of ["rachit_masiwal", "a-b", "abc", "A1", "x_y-z9"]) expect(pattern.test(name)).toBe(true);
    for (const name of ["-bad", "bad-", "_x", "has space", "dot.name", ""]) expect(pattern.test(name)).toBe(false);
  });
});
