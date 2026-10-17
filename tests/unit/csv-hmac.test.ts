import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/features/reporting/csv";
import { hmacSha256Hex, safeEqualHex, verifyHmacSha256 } from "@/lib/security/hmac";

describe("csv", () => {
  it("neutralises spreadsheet formula injection", () => { for (const v of ["=1+1", "+cmd", "-2", "@SUM(A1)", "\tx", "\rx"]) expect(csvCell(v).replace(/^"/, "").startsWith("'")).toBe(true); });
  it("quotes commas, quotes and newlines", () => { expect(csvCell('a,b')).toBe('"a,b"'); expect(csvCell('say "hi"')).toBe('"say ""hi"""'); expect(csvCell("a\nb")).toBe('"a\nb"'); });
  it("handles null and dates", () => { expect(csvCell(null)).toBe(""); expect(csvCell(new Date("2026-03-04T00:00:00Z"))).toBe("2026-03-04"); });
  it("builds rows with BOM and CRLF", () => { const c = toCsv(["a", "b"], [[1, "x"]]); expect(c.startsWith("﻿")).toBe(true); expect(c).toContain("a,b\r\n1,x\r\n"); });
});
describe("hmac", () => {
  const secret = "whsec_test";
  it("verifies a correct signature and rejects tampering", () => {
    const body = '{"amount":100}'; const sig = hmacSha256Hex(secret, body);
    expect(verifyHmacSha256(secret, body, sig)).toBe(true); expect(verifyHmacSha256(secret, body + " ", sig)).toBe(false); expect(verifyHmacSha256("other", body, sig)).toBe(false);
  });
  it("compares in a length-safe way", () => { expect(safeEqualHex("ab", "abcd")).toBe(false); expect(safeEqualHex("abcd", "abcd")).toBe(true); });
});
