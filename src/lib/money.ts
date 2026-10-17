/**
 * All money is stored and computed as integer minor units (paise).
 * Floating point is only used at the display boundary, never for totals.
 */
export type Paise = number;

export function toPaise(rupees: number | string): Paise {
  const s = typeof rupees === "number" ? rupees.toFixed(2) : String(rupees).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error("Invalid amount");
  const neg = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const value = parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
  if (!Number.isSafeInteger(value)) throw new Error("Amount too large");
  return neg ? -value : value;
}

export function formatINR(paise: Paise): string {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100).toString();
  const frac = (abs % 100).toString().padStart(2, "0");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${neg ? "-" : ""}₹${grouped}${frac === "00" ? "" : "." + frac}`;
}

/** Apply percentage discount in basis points (1% = 100 bp), rounding half up on integers. */
export function applyBasisPoints(amount: Paise, bp: number): Paise {
  if (!Number.isInteger(bp) || bp < 0 || bp > 10000) throw new Error("Invalid basis points");
  return Math.floor((amount * bp + 5000) / 10000);
}

export interface BalanceInput {
  charges: Paise[];
  concessions: Paise[];
  payments: Paise[];
  reversals: Paise[];
  lateFee?: Paise;
}

export function computeBalance(i: BalanceInput) {
  const sum = (a: Paise[]) => a.reduce((x, y) => x + y, 0);
  const gross = sum(i.charges) + (i.lateFee ?? 0);
  const net = Math.max(0, gross - sum(i.concessions));
  const paid = sum(i.payments) - sum(i.reversals);
  return { gross, net, paid, outstanding: Math.max(0, net - paid) };
}

/** Late fee: flat per-started-period after due date. Pure and testable. */
export function computeLateFee(opts: { dueDate: Date; asOf: Date; flatPerPeriod: Paise; graceDays: number; periodDays: number; cap?: Paise }): Paise {
  const ms = opts.asOf.getTime() - opts.dueDate.getTime();
  const lateDays = Math.floor(ms / 86_400_000) - opts.graceDays;
  if (lateDays <= 0 || opts.periodDays <= 0) return 0;
  const periods = Math.ceil(lateDays / opts.periodDays);
  const fee = periods * opts.flatPerPeriod;
  return opts.cap !== undefined ? Math.min(fee, opts.cap) : fee;
}
