// ─── §6 Business Logic — Exact Formulas from Spec ───

export interface ConfigData {
  loanSanctioned: number;
  loanROI: number;
  loanRepayStart: string;
  loanTenure: number;
  loanRepaid: number;
  repaySavings: number;
  schoApplied: string;
  schoAppliedAmt: number;
  schoReceived: number;
  tuitionTotal: number;
  tuitionPaid: number;
  rent: number;
  bills: number;
  emergencyTarget: number;
  emergencyCurrent: number;
  fxRate: number;
  fxUpdated: string;
  fxManual: number;
  jobName: string;
  jobRateGBP: number;
  progStart: string;
  progEnd: string;
  displayCurrencyPrefs: string;
}

export interface Disbursement {
  id: string;
  date: string;
  amountINR: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  currency: string;
  amountGBP: number;
  note: string;
}

export interface JobEntry {
  id: string;
  date: string;
  hours: number;
  note: string;
}

// §6.1 Currency conversion
export function toINR(gbp: number, fxRate: number): number {
  return gbp * fxRate;
}

export function toGBP(inr: number, fxRate: number): number {
  return fxRate > 0 ? inr / fxRate : 0;
}

// §6.2 Loan interest (per-tranche simple interest)
export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getActiveTranches(disbursements: Disbursement[], asOf?: string): Disbursement[] {
  const ref = asOf || todayStr();
  return disbursements.filter(d => d.date <= ref);
}

export function calcPrincipal(disbursements: Disbursement[], asOf?: string): number {
  return getActiveTranches(disbursements, asOf).reduce((s, d) => s + d.amountINR, 0);
}

export function calcTotalInterestToDate(disbursements: Disbursement[], roi: number, asOf?: string): number {
  const ref = asOf || todayStr();
  const dailyRate = roi / 100 / 365;
  return getActiveTranches(disbursements, ref).reduce((sum, d) => {
    return sum + d.amountINR * dailyRate * daysBetween(d.date, ref);
  }, 0);
}

export function calcDailyInterest(principal: number, roi: number): number {
  return principal * (roi / 100 / 365);
}

export function calcMonthSoFar(principal: number, roi: number): number {
  const today = new Date();
  return principal * (roi / 100 / 365) * today.getDate();
}

export function calcMonthProjected(principal: number, roi: number): number {
  const today = new Date();
  return principal * (roi / 100 / 365) * daysInMonth(today.getFullYear(), today.getMonth());
}

export function calcNextMonthProjected(principal: number, roi: number): number {
  const today = new Date();
  const nextMonth = today.getMonth() + 1;
  const nextYear = nextMonth > 11 ? today.getFullYear() + 1 : today.getFullYear();
  return principal * (roi / 100 / 365) * daysInMonth(nextYear, nextMonth % 12);
}

export function calcOutstanding(principal: number, interestToDate: number, repaid: number): number {
  return principal + interestToDate - repaid;
}

// §6.3 Utilisation
export function calcUtilisation(totalExpensesINR: number, principal: number) {
  const utilised = Math.min(totalExpensesINR, principal);
  const remainingUtil = principal - utilised;
  return { utilised, remainingUtil };
}

// §6.4 Repayment projection & payoff planner
export function projectedTotalAt(disbursements: Disbursement[], roi: number, targetDate: string): number {
  const dailyRate = roi / 100 / 365;
  return getActiveTranches(disbursements, targetDate).reduce((sum, d) => {
    const days = daysBetween(d.date, targetDate);
    return sum + d.amountINR + d.amountINR * dailyRate * days;
  }, 0);
}

export function calcEMI(principal: number, annualRate: number, tenureYears: number): number {
  if (annualRate === 0) return tenureYears > 0 ? principal / (tenureYears * 12) : 0;
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calcPayoff(
  disbursements: Disbursement[],
  roi: number,
  targetDate: string,
  repaid: number,
  savings: number
) {
  const totalDue = Math.max(projectedTotalAt(disbursements, roi, targetDate) - repaid, 0);
  const needed = Math.max(totalDue - savings, 0);
  const daysLeft = daysBetween(todayStr(), targetDate);
  const monthsLeft = daysLeft / 30.44;
  return {
    totalDue,
    needed,
    daysLeft,
    monthsLeft,
    perDay: daysLeft > 0 ? needed / daysLeft : 0,
    perMonth: monthsLeft > 0 ? needed / monthsLeft : 0,
  };
}

// §6.5 Tuition
export function calcTuition(total: number, paid: number, scholarshipReceived: number) {
  const remaining = Math.max(total - paid - scholarshipReceived, 0);
  const pctPaid = total > 0 ? Math.min(((paid + scholarshipReceived) / total) * 100, 100) : 0;
  return { remaining, pctPaid, scholarshipCovered: scholarshipReceived };
}

// §6.6 Monthly totals
export function calcMonthlyTotals(
  entries: LedgerEntry[],
  jobEntries: JobEntry[],
  jobRateGBP: number,
  fxRate: number,
  rent: number,
  bills: number,
  monthKey: string // 'YYYY-MM'
) {
  const monthEntries = entries.filter(e => e.date.startsWith(monthKey));
  const monthJobs = jobEntries.filter(j => j.date.startsWith(monthKey));

  const income = monthEntries
    .filter(e => e.type === 'income')
    .reduce((s, e) => s + toINR(e.amountGBP, fxRate), 0)
    + toINR(monthJobs.reduce((s, j) => s + j.hours * jobRateGBP, 0), fxRate);

  const expense = monthEntries
    .filter(e => e.type === 'expense')
    .reduce((s, e) => s + toINR(e.amountGBP, fxRate), 0)
    + rent + bills;

  return { income, expense, net: income - expense };
}

// §6.7 Job earnings
export function calcJobEarningsGBP(hours: number, rate: number): number {
  return hours * rate;
}

// Format helpers
export function fmtINR(n: number): string {
  if (!n || isNaN(n)) return '₹0';
  const rounded = Math.round(n * 100) / 100;
  const hasDecimals = rounded % 1 !== 0;
  return '₹' + rounded.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function fmtGBP(n: number): string {
  if (!n || isNaN(n)) return '£0';
  const rounded = Math.round(n * 100) / 100;
  const hasDecimals = rounded % 1 !== 0;
  return '£' + rounded.toLocaleString('en-GB', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function fmtDual(inr: number, fxRate: number): { inr: string; gbp: string } {
  return { inr: fmtINR(inr), gbp: fmtGBP(toGBP(inr, fxRate)) };
}

export function fmtBoth(inr: number, fxRate: number): string {
  if (!inr) return `${fmtINR(0)} (${fmtGBP(0)})`;
  return `${fmtINR(inr)} (${fmtGBP(toGBP(inr, fxRate))})`;
}

export function fmtBothFromGBP(gbp: number, fxRate: number): string {
  if (!gbp) return `${fmtGBP(0)} (${fmtINR(0)})`;
  return `${fmtGBP(gbp)} (${fmtINR(toINR(gbp, fxRate))})`;
}
