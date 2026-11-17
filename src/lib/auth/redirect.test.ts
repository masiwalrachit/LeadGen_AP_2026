import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps a local application path", () => {
    expect(safeNextPath("/onboarding?step=profile")).toBe(
      "/onboarding?step=profile",
    );
  });

  it.each([null, "https://example.com", "//example.com", "dashboard"])(
    "falls back for an unsafe destination: %s",
    (destination) => {
      expect(safeNextPath(destination)).toBe("/onboarding");
    },
  );
});
