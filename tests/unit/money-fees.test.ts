import { describe, expect, it } from "vitest";
import { applyBasisPoints, computeBalance, computeLateFee, formatINR, toPaise } from "@/lib/money";
import { netOf, statusOf } from "@/services/fees";

describe("money", () => {
  it("converts rupees to integer paise without float drift", () => {
    expect(toPaise("1250.50")).toBe(125050); expect(toPaise(0.1 + 0.2)).toBe(30); expect(toPaise("10")).toBe(1000);
  });
  it("rejects malformed amounts", () => { expect(() => toPaise("12.345")).toThrow(); expect(() => toPaise("abc")).toThrow(); });
  it("formats with Indian grouping", () => { expect(formatINR(12345678)).toBe("₹1,23,456.78"); expect(formatINR(100000)).toBe("₹1,000"); expect(formatINR(0)).toBe("₹0"); });
  it("applies basis points with half-up rounding", () => { expect(applyBasisPoints(10000, 1000)).toBe(1000); expect(applyBasisPoints(333, 5000)).toBe(167); expect(() => applyBasisPoints(1, 10001)).toThrow(); });
  it("computes balances", () => { expect(computeBalance({ charges: [1000, 500], concessions: [200], payments: [800], reversals: [100] })).toEqual({ gross: 1500, net: 1300, paid: 700, outstanding: 600 }); });
  it("charges late fee per started period with cap and grace", () => {
    const due = new Date("2026-01-01"); const day = (n: number) => new Date(due.getTime() + n * 86_400_000);
    expect(computeLateFee({ dueDate: due, asOf: day(5), flatPerPeriod: 5000, graceDays: 7, periodDays: 30 })).toBe(0);
    expect(computeLateFee({ dueDate: due, asOf: day(10), flatPerPeriod: 5000, graceDays: 7, periodDays: 30 })).toBe(5000);
    expect(computeLateFee({ dueDate: due, asOf: day(100), flatPerPeriod: 5000, graceDays: 0, periodDays: 30 })).toBe(20000);
    expect(computeLateFee({ dueDate: due, asOf: day(100), flatPerPeriod: 5000, graceDays: 0, periodDays: 30, cap: 12000 })).toBe(12000);
  });
});
describe("fee status", () => {
  it("derives status from net and paid", () => {
    expect(netOf({ amountPaise: 1000, concessionPaise: 300 })).toBe(700);
    expect(statusOf({ amountPaise: 1000, paidPaise: 0 })).toBe("pending"); expect(statusOf({ amountPaise: 1000, paidPaise: 400 })).toBe("partial");
    expect(statusOf({ amountPaise: 1000, concessionPaise: 300, paidPaise: 700 })).toBe("paid"); expect(statusOf({ amountPaise: 1000, concessionPaise: 1000 })).toBe("waived");
  });
});
