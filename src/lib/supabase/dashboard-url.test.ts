import { describe, expect, it } from "vitest";
import { supabaseSqlEditorUrl } from "./dashboard-url";

describe("supabaseSqlEditorUrl", () => {
  it("builds the SQL editor link from the configured project", () => {
    expect(supabaseSqlEditorUrl("https://abcdefgh.supabase.co")).toBe("https://supabase.com/dashboard/project/abcdefgh/sql/new");
  });

  it.each([undefined, "", "not a url", "https://example.com", "http://localhost:54321"])(
    "falls back to the general dashboard for %s",
    (value) => expect(supabaseSqlEditorUrl(value)).toBe("https://supabase.com/dashboard"),
  );
});
