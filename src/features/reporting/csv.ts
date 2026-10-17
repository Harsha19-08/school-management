/** CSV with formula-injection neutralisation: cells starting with = + - @ tab or CR are prefixed with a quote. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
export function csvResponse(filename: string, csv: string) {
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
