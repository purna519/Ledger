import React from 'react';
import { GlassPanel, MetricCard, SectionHeader, ProgressBar } from '../components/ui';
import { type DashboardData } from '../api/client';

interface DashboardPageProps {
  data: DashboardData;
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'GBP') return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function DashboardPage({ data }: DashboardPageProps) {
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Spending"
          value={formatCurrency(data.today.total_expenses, 'GBP')}
          icon="💳"
          trend="down"
          accentColor="#ef4444"
        />
        <MetricCard
          label="Loan Outstanding"
          value={formatCurrency(data.loan.outstanding)}
          subtitle={`Daily interest: ${formatCurrency(data.loan.daily_interest)}`}
          icon="🏦"
          trend="neutral"
          accentColor="#f59e0b"
        />
        <MetricCard
          label="Monthly Savings"
          value={formatCurrency(data.budget.savings)}
          subtitle={`Income: ${formatCurrency(data.budget.monthly_income)}`}
          icon="📈"
          trend="up"
          accentColor="#10b981"
        />
        <MetricCard
          label="Emergency Fund"
          value={`${data.emergency_fund.percent.toFixed(1)}%`}
          subtitle={`${formatCurrency(data.emergency_fund.current)} of ${formatCurrency(data.emergency_fund.target)}`}
          icon="🛡️"
          trend="up"
          accentColor="#3b82f6"
        />
      </div>

      {/* ── Main Bento Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Loan Overview */}
        <GlassPanel className="p-5 lg:col-span-1">
          <SectionHeader title="Loan Position" subtitle="Education Loan" />
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Disbursed</span>
              <span className="text-sm font-semibold">{formatCurrency(data.loan.total_disbursed)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Repaid</span>
              <span className="text-sm font-semibold text-emerald-400">{formatCurrency(data.loan.total_repaid)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-400">Outstanding</span>
              <span className="text-sm font-bold text-amber-400">{formatCurrency(data.loan.outstanding)}</span>
            </div>
            <div className="pt-2 border-t border-slate-700/40">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-500">Utilisation</span>
                <span className="text-xs text-slate-400">{data.loan.utilisation_percent}%</span>
              </div>
              <ProgressBar value={data.loan.utilisation_percent} color="#f59e0b" />
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs text-slate-500">Monthly Interest</span>
                <span className="text-xs font-medium text-red-400">{formatCurrency(data.loan.monthly_interest)}</span>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Recent Transactions */}
        <GlassPanel className="p-5 lg:col-span-2">
          <SectionHeader
            title="Recent Transactions"
            subtitle="Latest ledger activity"
            action={
              <button className="glass-button glass-button-ghost text-xs">View All</button>
            }
          />
          <div className="space-y-1">
            {data.recent_transactions.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-700/20 transition-colors"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    tx.is_income ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {tx.is_income ? '↗' : '↙'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{tx.category_name}</p>
                    <p className="text-xs text-slate-500">{formatDate(tx.date)}{tx.source ? ` · ${tx.source}` : ''}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${tx.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.is_income ? '+' : '-'}£{tx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Budget Overview */}
        <GlassPanel className="p-5">
          <SectionHeader title="Monthly Budget" />
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Rent</span>
              <span>{formatCurrency(data.budget.rent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Bills</span>
              <span>{formatCurrency(data.budget.bills)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-700/40 pt-3">
              <span className="text-slate-400">Income</span>
              <span className="text-emerald-400 font-medium">{formatCurrency(data.budget.monthly_income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Expenses</span>
              <span className="text-red-400 font-medium">{formatCurrency(data.budget.monthly_expenses)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-700/40 pt-3">
              <span className="text-slate-300 font-medium">Net Savings</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(data.budget.savings)}</span>
            </div>
          </div>
        </GlassPanel>

        {/* Emergency Fund */}
        <GlassPanel className="p-5">
          <SectionHeader title="Emergency Fund" />
          <div className="flex flex-col items-center py-4">
            <div className="relative w-28 h-28 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${data.emergency_fund.percent * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{data.emergency_fund.percent.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              {formatCurrency(data.emergency_fund.current)} <span className="text-slate-600">of</span> {formatCurrency(data.emergency_fund.target)}
            </p>
          </div>
        </GlassPanel>

        {/* Quick Actions */}
        <GlassPanel className="p-5">
          <SectionHeader title="Quick Actions" />
          <div className="space-y-2.5">
            {[
              { label: 'Add Income', icon: '💰', color: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
              { label: 'Add Expense', icon: '💸', color: 'bg-red-500/10 hover:bg-red-500/20' },
              { label: 'Record Loan Payment', icon: '🏦', color: 'bg-amber-500/10 hover:bg-amber-500/20' },
              { label: 'Log Work Hours', icon: '⏱️', color: 'bg-purple-500/10 hover:bg-purple-500/20' },
              { label: 'View Reports', icon: '📊', color: 'bg-blue-500/10 hover:bg-blue-500/20' },
            ].map(action => (
              <button
                key={action.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${action.color}`}
              >
                <span className="text-base">{action.icon}</span>
                <span className="text-sm font-medium text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
