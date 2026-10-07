import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell("Patel, Yash")).toBe('"Patel, Yash"');
    expect(csvCell('likes "extra" chutney')).toBe('"likes ""extra"" chutney"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("keeps formulas from running in a spreadsheet", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+91 98")).toBe("'+91 98");
    expect(csvCell(-5)).toBe("-5"); // real numbers stay numbers
  });

  it("writes empty cells, booleans and a BOM", () => {
    expect(toCsv([["a", null, true, 2]])).toBe("﻿a,,yes,2\r\n");
  });
});
