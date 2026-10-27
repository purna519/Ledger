import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { GlassPanel, SectionHeader } from '../components/ui';
import CurrencyToggle from '../components/CurrencyToggle';
import { createEntry, deleteEntry } from '../api/client';
import type { LedgerEntry, ConfigData } from '../utils/calc';
import { toINR, toGBP, fmtGBP, fmtINR, todayStr } from '../utils/calc';

interface LedgerPageProps {
  entries: LedgerEntry[];
  config: ConfigData;
  onUpdate: () => void;
}

export default function LedgerPage({ entries, config, onUpdate }: LedgerPageProps) {
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !category) return;
    
    let amountGBP = Number(amount);
    if (currency === 'INR') {
      amountGBP = toGBP(amountGBP, config.fxRate);
    }

    await createEntry({ date, type, category, currency, amountGBP, note });
    setAmount('');
    setNote('');
    setCategory('');
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    onUpdate();
  };

  // Compute live preview of amount
  const displayPreview = () => {
    const num = Number(amount);
    if (!num || isNaN(num)) return null;
    if (currency === 'GBP') return `(${fmtINR(toINR(num, config.fxRate))})`;
    return `(${fmtGBP(toGBP(num, config.fxRate))})`;
  };

  return (
    <div className="space-y-6 animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Form */}
      <GlassPanel className="p-6 lg:col-span-1 h-fit">
        <SectionHeader title="New Transaction" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
            <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${type === 'expense' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-slate-400'}`}>Expense</button>
            <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400'}`}>Income</button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input type="date" required className="glass-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select required className="glass-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category...</option>
              {type === 'expense' ? (
                <>
                  <option value="Groceries">Groceries</option>
                  <option value="Transport">Transport</option>
                  <option value="Eating Out">Eating Out</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </>
              ) : (
                <>
                  <option value="Allowance">Allowance</option>
                  <option value="Gift">Gift</option>
                  <option value="Other">Other</option>
                </>
              )}
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-slate-400">Amount</label>
              <CurrencyToggle currency={currency} onChange={setCurrency} />
            </div>
            <input type="number" step="0.01" required className="glass-input text-lg font-mono" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            <div className="text-right mt-1 h-4 text-xs text-slate-500 font-medium">{displayPreview()}</div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
            <input type="text" className="glass-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Waitrose shopping..." />
          </div>

          <button type="submit" className="w-full glass-button glass-button-primary py-3">
            Add {type === 'expense' ? 'Expense' : 'Income'}
          </button>
        </form>
      </GlassPanel>

      {/* List */}
      <GlassPanel className="p-6 lg:col-span-2">
        <SectionHeader title="Transaction History" />
        <div className="space-y-2">
          {entries.length === 0 ? <p className="text-sm text-slate-500 py-4 text-center">No transactions yet.</p> : entries.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/20 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner ${
                  tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'
                }`}>
                  {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{tx.category}</p>
                  <p className="text-xs text-slate-500">{tx.date}{tx.note ? ` · ${tx.note}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-base font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{fmtGBP(tx.amountGBP)}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums font-medium">{fmtINR(toINR(tx.amountGBP, config.fxRate))}</p>
                </div>
                <button onClick={() => handleDelete(tx.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
      
    </div>
  );
}
