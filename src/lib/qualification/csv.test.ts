import { describe, expect, it } from "vitest";
import { parseCandidateCsv } from "./csv";

const headers = "business_name,industry,location,website,description,source_url,observed_at,contact_path";

describe("parseCandidateCsv", () => {
  it("parses quoted values and removes duplicate domains", () => {
    const csv = `${headers}\n"Bright, Dental",Dentist,Delhi,https://bright.example,"An established clinic with an outdated mobile website.",https://directory.example/bright,2026-11-20T10:00:00+05:30,https://bright.example/contact\nBright Dental,Dentist,Delhi,https://www.bright.example,Duplicate evidence row here.,https://directory.example/bright-2,2026-11-20T11:00:00+05:30,`;
    const result = parseCandidateCsv(csv);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].businessName).toBe("Bright, Dental");
    expect(result.duplicateCount).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects rows without source-backed evidence", () => {
    const csv = `${headers}\nMissing Source,Dentist,Delhi,,This row has no valid source URL.,not-a-url,2026-11-20T10:00:00+05:30,`;
    const result = parseCandidateCsv(csv);

    expect(result.candidates).toHaveLength(0);
    expect(result.issues[0].row).toBe(2);
  });
});
