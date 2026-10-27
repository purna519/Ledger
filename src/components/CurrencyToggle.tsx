import React from 'react';

interface CurrencyToggleProps {
  currency: string;
  onChange: (currency: string) => void;
}

export default function CurrencyToggle({ currency, onChange }: CurrencyToggleProps) {
  return (
    <div className="flex items-center bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50">
      <button
        type="button"
        onClick={() => onChange('GBP')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
          currency === 'GBP' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        £ GBP
      </button>
      <button
        type="button"
        onClick={() => onChange('INR')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
          currency === 'INR' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        ₹ INR
      </button>
    </div>
  );
}
