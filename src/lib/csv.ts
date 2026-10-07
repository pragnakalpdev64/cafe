// Spreadsheet-safe CSV. Pure, so it's unit-tested.

export type CsvCell = string | number | boolean | null | undefined;

/**
 * One cell: quoted when needed, and text that a spreadsheet would run as a formula
 * (starting with = + - @ or a tab) gets a leading ' so it opens as plain text.
 */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text with Windows line endings and a BOM, so Excel reads ₹ and Indian names correctly. */
export function toCsv(rows: CsvCell[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
