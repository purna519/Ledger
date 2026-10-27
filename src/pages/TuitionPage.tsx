import React, { useState, useEffect } from 'react';
import { Trash2, Building2, Landmark, Plus } from 'lucide-react';
import { GlassPanel, SectionHeader, ProgressBar } from '../components/ui';
import DualCurrencyInput from '../components/DualCurrencyInput';
import type { ConfigData } from '../utils/calc';
import { calcTuition, fmtINR, fmtGBP, todayStr } from '../utils/calc';
import { updateConfig, getPaymentLogs, createPaymentLog, deletePaymentLog } from '../api/client';
import type { PaymentLog } from '../api/client';

interface TuitionPageProps {
  config: ConfigData;
  onUpdate: () => void;
}

const BANK_OPTIONS = [
  'HDFC Bank', 'ICICI Bank', 'SBI (State Bank of India)', 'Axis Bank', 
  'Barclays UK', 'Monzo Bank', 'Revolut', 'HSBC UK', 'Wise (TransferWise)', 'Other Bank'
];

const SOURCE_OPTIONS = [
  'Education Loan Disbursement', 'Personal / Family Savings', 
  'Part-Time Job Earnings', 'Scholarship Grant', 'Forex Card Transfer', 'Other Source'
];

export default function TuitionPage({ config, onUpdate }: TuitionPageProps) {
  const [tuition, setTuition] = useState(config.tuitionTotal);
  const [scho, setScho] = useState(config.schoReceived);
  const [rent, setRent] = useState(config.rent);
  const [bills, setBills] = useState(config.bills);
  const [efTarget, setEfTarget] = useState(config.emergencyTarget);
  const [efCurrent, setEfCurrent] = useState(config.emergencyCurrent);

  // Payment Logs State
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logCategory, setLogCategory] = useState<'tuition' | 'rent'>('tuition');
  const [logDate, setLogDate] = useState<string>(todayStr());
  const [logAmountINR, setLogAmountINR] = useState<number>(0);
  const [logBank, setLogBank] = useState<string>(BANK_OPTIONS[0]);
  const [logSource, setLogSource] = useState<string>(SOURCE_OPTIONS[0]);
  const [logNote, setLogNote] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'tuition' | 'rent'>('all');

  const loadLogs = async () => {
    try {
      const logs = await getPaymentLogs();
      setPaymentLogs(logs);
      setLogsLoaded(true);
    } catch (err) {
      console.error('Failed to load payment logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const fxRate = config.fxRate > 0 ? config.fxRate : 1;

  // Calculate totals from payment logs
  const totalTuitionPaidFromLogs = paymentLogs
    .filter(l => l.category === 'tuition')
    .reduce((sum, l) => sum + l.amountINR, 0);

  // Sync total tuition paid with config if changed (only after logs are loaded)
  useEffect(() => {
    if (!logsLoaded) return;
    if (totalTuitionPaidFromLogs !== config.tuitionPaid) {
      updateConfig({ tuitionPaid: totalTuitionPaidFromLogs }).then(onUpdate);
    }
  }, [logsLoaded, totalTuitionPaidFromLogs, config.tuitionPaid]);

  const saveConfig = async (key: keyof ConfigData, value: number) => {
    await updateConfig({ [key]: value });
    onUpdate();
  };

  const handleAddPaymentLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAmountINR || logAmountINR <= 0) return;

    try {
      await createPaymentLog({
        category: logCategory,
        date: logDate,
        amountINR: logAmountINR,
        amountGBP: logAmountINR / fxRate,
        bank: logBank,
        source: logSource,
        note: logNote
      });

      setLogAmountINR(0);
      setLogNote('');
      loadLogs();
      onUpdate();
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deletePaymentLog(id);
      loadLogs();
      onUpdate();
    } catch (err) {
      console.error('Failed to delete payment log:', err);
    }
  };

  const { remaining, pctPaid } = calcTuition(config.tuitionTotal, totalTuitionPaidFromLogs, config.schoReceived);

  const filteredLogs = filterCategory === 'all' 
    ? paymentLogs 
    : paymentLogs.filter(l => l.category === filterCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Top Summary Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tuition & Scholarship Overview */}
        <GlassPanel className="p-6 space-y-5">
          <SectionHeader title="Tuition & Scholarships" subtitle="Manage fee targets & awards" />
          
          <DualCurrencyInput
            label="Total Academic Tuition Fee"
            valueINR={tuition}
            onChangeINR={setTuition}
            onBlur={() => saveConfig('tuitionTotal', tuition)}
            fxRate={fxRate}
          />

          <DualCurrencyInput
            label="Scholarship / Grant Awarded"
            valueINR={scho}
            onChangeINR={setScho}
            onBlur={() => saveConfig('schoReceived', scho)}
            fxRate={fxRate}
          />
          
          <div className="pt-4 border-t border-slate-700/40">
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <span className="text-sm font-medium text-slate-300 block">Remaining Payable Balance</span>
                <span className="text-xs text-slate-500">Tracked automatically from payment logs below</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-amber-400 block">{fmtINR(remaining)}</span>
                <span className="text-xs text-slate-400 font-normal">≈ {fmtGBP(remaining / fxRate)}</span>
              </div>
            </div>
            <ProgressBar value={pctPaid} color="#10b981" />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Paid So Far: {fmtINR(totalTuitionPaidFromLogs)}</span>
              <span>{pctPaid.toFixed(1)}% covered</span>
            </div>
          </div>
        </GlassPanel>

        {/* Rent & Emergency Budget Settings */}
        <GlassPanel className="p-6 space-y-5">
          <SectionHeader title="Monthly Rent & Emergency Reserves" subtitle="Set targets & track transfers" />
          
          <DualCurrencyInput
            label="Monthly Rent Baseline"
            valueINR={rent}
            onChangeINR={setRent}
            onBlur={() => saveConfig('rent', rent)}
            fxRate={fxRate}
          />

          <DualCurrencyInput
            label="Monthly Utility Bills Baseline"
            valueINR={bills}
            onChangeINR={setBills}
            onBlur={() => saveConfig('bills', bills)}
            fxRate={fxRate}
          />
          
          <div className="pt-4 border-t border-slate-700/40 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Emergency Fund Allocation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DualCurrencyInput
                label="Target Reserve"
                valueINR={efTarget}
                onChangeINR={setEfTarget}
                onBlur={() => saveConfig('emergencyTarget', efTarget)}
                fxRate={fxRate}
              />
              <DualCurrencyInput
                label="Current Fund"
                valueINR={efCurrent}
                onChangeINR={setEfCurrent}
                onBlur={() => saveConfig('emergencyCurrent', efCurrent)}
                fxRate={fxRate}
              />
            </div>
            <ProgressBar value={efTarget > 0 ? (efCurrent / efTarget) * 100 : 0} color="#3b82f6" />
          </div>
        </GlassPanel>
      </div>

      {/* ── Detailed Payment & Transfer Tracker (Tuition + Rent) ── */}
      <GlassPanel className="p-6 space-y-6">
        <SectionHeader 
          title="Payment & Transfer Tracker (Tuition & Rent)" 
          subtitle="Track exact dates, amounts, sending banks, and funding sources (Loan vs Savings)" 
        />

        {/* Log Payment Form */}
        <form onSubmit={handleAddPaymentLog} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Category Select */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Type</label>
              <select 
                className="glass-input bg-slate-900/80 font-semibold"
                value={logCategory}
                onChange={(e) => setLogCategory(e.target.value as 'tuition' | 'rent')}
              >
                <option value="tuition">🎓 Tuition Fee Transfer</option>
                <option value="rent">🏠 House Rent Payment</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Transfer Date</label>
              <input 
                type="date" 
                required 
                className="glass-input" 
                value={logDate} 
                onChange={(e) => setLogDate(e.target.value)} 
              />
            </div>

            {/* Bank Choice */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Transfer Bank / Channel</label>
              <select 
                className="glass-input bg-slate-900/80"
                value={logBank}
                onChange={(e) => setLogBank(e.target.value)}
              >
                {BANK_OPTIONS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Funding Source */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Funding Source</label>
              <select 
                className="glass-input bg-slate-900/80"
                value={logSource}
                onChange={(e) => setLogSource(e.target.value)}
              >
                {SOURCE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-2">
              <DualCurrencyInput
                label="Transfer Amount"
                valueINR={logAmountINR}
                onChangeINR={setLogAmountINR}
                fxRate={fxRate}
                required
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Note / Reference ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. Term 1 Fee / Aug Rent" 
                  className="glass-input"
                  value={logNote} 
                  onChange={(e) => setLogNote(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="glass-button glass-button-primary px-5 h-[42px] font-semibold flex items-center gap-2 flex-shrink-0"
              >
                <Plus size={16} /> Record Transfer
              </button>
            </div>
          </div>
        </form>

        {/* Transfer History Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Transfer History ({filteredLogs.length} logged)
            </h4>

            {/* Category Filter Tabs */}
            <div className="flex gap-1 p-1 bg-slate-900/60 rounded-lg border border-slate-700/40">
              {(['all', 'tuition', 'rent'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                    filterCategory === cat 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-700/40 rounded-2xl">
              No transfers recorded yet. Log your tuition fee or rent payments above.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div 
                  key={log.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600/50 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      log.category === 'tuition' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {log.category === 'tuition' ? <Landmark size={20} /> : <Building2 size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 capitalize">
                          {log.category} Payment
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 font-medium">
                          {log.bank}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-medium border border-blue-500/20">
                          {log.source}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Transferred on {log.date} {log.note ? `· ${log.note}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-100">
                        {fmtINR(log.amountINR)}
                      </div>
                      <div className="text-xs text-slate-400">
                        ≈ {fmtGBP(log.amountGBP || log.amountINR / fxRate)}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
                      title="Delete transfer record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassPanel>

    </div>
  );
}
