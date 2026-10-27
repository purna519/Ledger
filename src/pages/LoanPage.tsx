import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  GlassPanel,
  SectionHeader,
} from '../components/ui';
import DualCurrencyInput from '../components/DualCurrencyInput';
import {
  createDisbursement,
  deleteDisbursement,
  updateConfig,
} from '../api/client';

import type { ConfigData, Disbursement } from '../utils/calc';

import {
  calcPrincipal,
  calcTotalInterestToDate,
  calcOutstanding,
  calcDailyInterest,
  calcEMI,
  calcPayoff,
  fmtINR,
  fmtGBP,
  todayStr,
} from '../utils/calc';

interface LoanPageProps {
  config: ConfigData;
  disbursements: Disbursement[];
  onUpdate: () => void;
}

export default function LoanPage({
  config,
  disbursements,
  onUpdate,
}: LoanPageProps) {
  // Config state
  const [sanctioned, setSanctioned] = useState<number>(config.loanSanctioned);
  const [roi, setRoi] = useState<number>(config.loanROI);
  const [repaid, setRepaid] = useState<number>(config.loanRepaid);
  const [savings, setSavings] = useState<number>(config.repaySavings);

  // Payoff planner state
  const [targetDate, setTargetDate] = useState<string>(config.loanRepayStart);
  const [tenure, setTenure] = useState<number>(config.loanTenure);

  // New disbursement state
  const [dDate, setDDate] = useState<string>(todayStr());
  const [dAmt, setDAmt] = useState<string>('');

  const saveConfig = async (key: keyof ConfigData, value: number | string) => {
    try {
      await updateConfig({ [key]: value });
      onUpdate();
    } catch (error) {
      console.error(`Failed to update ${String(key)}:`, error);
    }
  };

  const handleAddDisb = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(dAmt);
    if (!dAmt || !Number.isFinite(amount) || amount <= 0) return;

    try {
      await createDisbursement({ date: dDate, amountINR: amount });
      setDAmt('');
      setDDate(todayStr());
      onUpdate();
    } catch (error) {
      console.error('Failed to create disbursement:', error);
    }
  };

  const handleDelDisb = async (id: string) => {
    try {
      await deleteDisbursement(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete disbursement:', error);
    }
  };

  // Calculations
  const principal = calcPrincipal(disbursements);
  const totalInterest = calcTotalInterestToDate(disbursements, config.loanROI);
  const outstanding = calcOutstanding(principal, totalInterest, config.loanRepaid);
  const dailyInt = calcDailyInterest(principal, config.loanROI);
  const payoff = calcPayoff(disbursements, config.loanROI, targetDate, config.loanRepaid, config.repaySavings);
  const emi = calcEMI(payoff.totalDue, config.loanROI, tenure);

  const fxRate = config.fxRate > 0 ? config.fxRate : 1;
  const principalInterestTotal = principal + totalInterest;
  const principalPercentage = principalInterestTotal > 0 ? (principal / principalInterestTotal) * 100 : 0;
  const interestPercentage = principalInterestTotal > 0 ? (totalInterest / principalInterestTotal) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Top Hero Banner: Current Position (Full Width Row) ── */}
      <GlassPanel className="p-8 relative overflow-hidden group border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-blue-500/5 to-transparent opacity-60 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Active Loan Position
            </h2>
            <div className="text-4xl lg:text-5xl font-black text-white tracking-tight tabular-nums">
              {fmtINR(outstanding)}
              <span className="text-lg lg:text-xl font-medium text-slate-400 ml-3">
                (≈ {fmtGBP(outstanding / fxRate)})
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              Daily Interest Accrual: <span className="text-red-400 font-bold tabular-nums">+{fmtINR(dailyInt)}</span>
              <span className="text-xs text-slate-500 ml-2">({fmtGBP(dailyInt / fxRate)}/day)</span>
            </p>
          </div>

          <div className="flex gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-700/50">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 min-w-[140px]">
              <div className="text-xs text-slate-400 mb-1">Active Principal</div>
              <div className="text-lg font-bold text-slate-100">{fmtINR(principal)}</div>
              <div className="text-xs text-slate-500">{fmtGBP(principal / fxRate)}</div>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 min-w-[140px]">
              <div className="text-xs text-slate-400 mb-1">Accrued Interest</div>
              <div className="text-lg font-bold text-red-400">{fmtINR(totalInterest)}</div>
              <div className="text-xs text-slate-500">{fmtGBP(totalInterest / fxRate)}</div>
            </div>
          </div>
        </div>

        {/* Stacked ratio bar */}
        {principalInterestTotal > 0 && (
          <div className="mt-6 flex h-2 rounded-full overflow-hidden bg-slate-800/80">
            <div className="bg-blue-500" style={{ width: `${principalPercentage}%` }} title={`Principal: ${principalPercentage.toFixed(1)}%`} />
            <div className="bg-red-500" style={{ width: `${interestPercentage}%` }} title={`Interest: ${interestPercentage.toFixed(1)}%`} />
          </div>
        )}
      </GlassPanel>

      {/* ── Middle Row: 2 Spacious Equal Columns (50% Width Each) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Loan Setup & Repayment Pool */}
        <GlassPanel className="p-6 space-y-6">
          <SectionHeader title="Loan Configuration & Parameters" subtitle="Sanctioned limits & repayment tracking" />
          
          <div className="space-y-5">
            <DualCurrencyInput
              label="Total Sanctioned Loan Limit"
              valueINR={sanctioned}
              onChangeINR={setSanctioned}
              onBlur={() => saveConfig('loanSanctioned', sanctioned)}
              fxRate={fxRate}
            />

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Annual Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="glass-input text-amber-400 font-semibold"
                value={roi || ''}
                onChange={(e) => setRoi(Number(e.target.value))}
                onBlur={() => saveConfig('loanROI', roi)}
                placeholder="8.5"
              />
            </div>

            <div className="pt-4 border-t border-slate-700/30 space-y-4">
              <DualCurrencyInput
                label="Total Repaid So Far"
                valueINR={repaid}
                onChangeINR={setRepaid}
                onBlur={() => saveConfig('loanRepaid', repaid)}
                fxRate={fxRate}
              />

              <DualCurrencyInput
                label="Repayment Savings Pool (Allocated)"
                valueINR={savings}
                onChangeINR={setSavings}
                onBlur={() => saveConfig('repaySavings', savings)}
                fxRate={fxRate}
              />
            </div>
          </div>
        </GlassPanel>

        {/* Right Column: Disbursement Tranches */}
        <GlassPanel className="p-6 space-y-6">
          <SectionHeader title="Disbursement Tranches" subtitle="Add & manage active loan tranches" />
          
          <form onSubmit={handleAddDisb} className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/40">
            <DualCurrencyInput
              label="New Tranche Disbursement Amount"
              valueINR={Number(dAmt) || 0}
              onChangeINR={(value) => setDAmt(value.toString())}
              fxRate={fxRate}
              required
            />

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Disbursement Date</label>
                <input
                  type="date"
                  required
                  className="glass-input"
                  value={dDate}
                  onChange={(e) => setDDate(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="glass-button glass-button-primary px-6 h-[42px] font-semibold flex items-center justify-center gap-2"
              >
                + Add Tranche
              </button>
            </div>
          </form>

          {/* Tranches list */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Disbursed Tranches History</h4>
            {disbursements.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-700/40 rounded-xl">
                No tranches logged yet. Add your first disbursement above.
              </p>
            ) : (
              disbursements.map((d) => (
                <div
                  key={d.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {fmtINR(d.amountINR)}
                      <span className="text-xs text-slate-400 font-normal ml-2">
                        ({fmtGBP(d.amountINR / fxRate)})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">Disbursed on {d.date}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelDisb(d.id)}
                    className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
                    aria-label={`Delete tranche ${d.id}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

      </div>

      {/* ── Bottom Section: Payoff Planner (Full Width Row) ── */}
      <GlassPanel className="p-6 space-y-6">
        <SectionHeader
          title="Target Loan Payoff & Amortization Planner"
          subtitle="Projected debt liability, EMI calculation, and required monthly savings target"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target Repayment Start Date
            </label>
            <input
              type="date"
              className="glass-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              onBlur={() => saveConfig('loanRepayStart', targetDate)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Amortization Tenure (Years)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              step="1"
              className="glass-input"
              value={tenure || ''}
              onChange={(e) => setTenure(Number(e.target.value))}
              onBlur={() => saveConfig('loanTenure', tenure)}
            />
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">Projected Total Debt</div>
            <div className="text-lg font-bold text-amber-400">{fmtINR(payoff.totalDue)}</div>
            <div className="text-xs text-slate-500">{fmtGBP(payoff.totalDue / fxRate)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">Payoff Shortfall (Needed)</div>
            <div className="text-lg font-bold text-red-400">{fmtINR(payoff.needed)}</div>
            <div className="text-xs text-slate-500">{fmtGBP(payoff.needed / fxRate)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">Required Monthly Savings</div>
            <div className="text-lg font-bold text-blue-400">{fmtINR(payoff.perMonth)}</div>
            <div className="text-xs text-slate-500">{fmtGBP(payoff.perMonth / fxRate)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">Projected Monthly EMI</div>
            <div className="text-lg font-bold text-emerald-400">{fmtINR(emi)} / mo</div>
            <div className="text-xs text-slate-500">{fmtGBP(emi / fxRate)}</div>
          </div>
        </div>
      </GlassPanel>

    </div>
  );
}