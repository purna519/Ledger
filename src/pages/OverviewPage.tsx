import React from 'react';
import { CreditCard, Landmark, TrendingUp, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlassPanel, SectionHeader, MetricCard, ProgressBar } from '../components/ui';
import type { ConfigData, LedgerEntry, JobEntry, Disbursement } from '../utils/calc';
import {
  calcPrincipal, calcTotalInterestToDate, calcOutstanding,
  calcDailyInterest, calcMonthProjected, calcUtilisation,
  toINR, fmtINR, fmtGBP, fmtDual, todayStr
} from '../utils/calc';

interface DashboardProps {
  config: ConfigData;
  entries: LedgerEntry[];
  jobEntries: JobEntry[];
  disbursements: Disbursement[];
  outstanding: number;
  monthly: { income: number; expense: number; net: number };
  todayExpenseGBP: number;
}

export default function DashboardPage({ config, entries, disbursements, outstanding, monthly, todayExpenseGBP }: DashboardProps) {
  const principal = calcPrincipal(disbursements);
  const dailyInt = calcDailyInterest(principal, config.loanROI);
  const projInt = calcMonthProjected(principal, config.loanROI);
  
  const allExpensesINR = entries.filter(e => e.type === 'expense').reduce((s, e) => s + toINR(e.amountGBP, config.fxRate), 0);
  const { utilised, remainingUtil } = calcUtilisation(allExpensesINR, principal);
  const utilPercent = principal > 0 ? (utilised / principal) * 100 : 0;

  const efPercent = config.emergencyTarget > 0 ? (config.emergencyCurrent / config.emergencyTarget) * 100 : 0;
  
  const recentTxs = entries.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Spending"
          value={fmtGBP(todayExpenseGBP)}
          subtitle={fmtINR(toINR(todayExpenseGBP, config.fxRate))}
          icon={<CreditCard size={20} />}
          trend="down"
          accentColor="#ef4444"
        />
        <MetricCard
          label="Loan Outstanding"
          value={fmtINR(outstanding)}
          subtitle={fmtGBP(outstanding / config.fxRate)}
          icon={<Landmark size={20} />}
          trend="neutral"
          accentColor="#f59e0b"
        />
        <MetricCard
          label="This Month's Savings"
          value={fmtINR(monthly.net)}
          subtitle={fmtGBP(monthly.net / config.fxRate)}
          icon={<TrendingUp size={20} />}
          trend={monthly.net >= 0 ? "up" : "down"}
          accentColor={monthly.net >= 0 ? "#10b981" : "#ef4444"}
        />
        <MetricCard
          label="Emergency Fund"
          value={`${efPercent.toFixed(1)}%`}
          subtitle={`${fmtINR(config.emergencyCurrent)} / ${fmtINR(config.emergencyTarget)}`}
          icon={<Shield size={20} />}
          trend="up"
          accentColor="#3b82f6"
        />
      </div>

      {/* ── Main Bento Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Loan Overview */}
        <GlassPanel className="p-5 lg:col-span-1">
          <SectionHeader title="Loan Position" />
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Disbursed</span>
              <span className="text-sm font-semibold">{fmtINR(principal)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Repaid</span>
              <span className="text-sm font-semibold text-emerald-400">{fmtINR(config.loanRepaid)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Outstanding</span>
              <span className="text-sm font-bold text-amber-400">{fmtINR(outstanding)}</span>
            </div>
            <div className="pt-2 border-t border-slate-700/40">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-500">Utilisation</span>
                <span className="text-xs text-slate-400">{utilPercent.toFixed(1)}%</span>
              </div>
              <ProgressBar value={utilPercent} color="#f59e0b" />
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-500">Projected Month Interest</span>
                <span className="text-xs font-medium text-red-400">{fmtINR(projInt)}</span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Recent Transactions */}
        <GlassPanel className="p-5 lg:col-span-2">
          <SectionHeader title="Recent Transactions" />
          <div className="space-y-1">
            {recentTxs.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No transactions yet.</p>
            ) : recentTxs.map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    tx.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{tx.category}</p>
                    <p className="text-xs text-slate-500">{tx.date}{tx.note ? ` · ${tx.note}` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'} {fmtGBP(tx.amountGBP)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtINR(toINR(tx.amountGBP, config.fxRate))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
