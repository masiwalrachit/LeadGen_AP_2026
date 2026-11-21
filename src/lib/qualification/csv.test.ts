import { describe, expect, it } from "vitest";
import { CsvFormatError, parseCandidateCsv } from "./csv";

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

  it("rejects non-http(s) URLs that could become script links", () => {
    const row = (website: string, source: string, contact: string) =>
      `${headers}\nUnsafe Dental,Dentist,Delhi,${website},A clinic description that is long enough.,${source},2026-11-20T10:00:00+05:30,${contact}`;
    for (const csv of [
      row("javascript:alert(1)", "https://directory.example/a", ""),
      row("", "javascript:alert(1)", ""),
      row("", "data:text/html,hi", ""),
      row("", "https://directory.example/a", "javascript:alert(1)"),
      row("ftp://files.example", "https://directory.example/a", ""),
    ]) {
      const result = parseCandidateCsv(csv);
      expect(result.candidates).toHaveLength(0);
      expect(result.issues).toHaveLength(1);
    }
  });

  it("still accepts http(s) URLs and an email contact path", () => {
    const csv = `${headers}\nSafe Dental,Dentist,Delhi,http://safe.example,A clinic description that is long enough.,https://directory.example/safe,2026-11-20T10:00:00+05:30,hello@safe.example`;
    expect(parseCandidateCsv(csv).candidates).toHaveLength(1);
  });

  it.each([
    ["", "The CSV file is empty."],
    ["business_name,industry\nA,B", "Missing required columns"],
    [`${headers}\n"Unclosed,Dentist`, "unclosed quoted value"],
  ])("throws a CsvFormatError for a broken file", (csv, message) => {
    expect(() => parseCandidateCsv(csv)).toThrow(CsvFormatError);
    expect(() => parseCandidateCsv(csv)).toThrow(message);
  });
});
