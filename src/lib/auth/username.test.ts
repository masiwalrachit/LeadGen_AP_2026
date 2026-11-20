import { describe, expect, it } from "vitest";
import { usernameInitial, usernameSchema } from "./username";

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
