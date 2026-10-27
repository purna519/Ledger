import React, { useState } from 'react';
import { refreshFx } from '../api/client';

interface FxBannerProps {
  fxRate: number;
  fxUpdated: string;
  fxManual: boolean;
  onFxUpdated: () => void; // Trigger a config reload
}

export default function FxBanner({ fxRate, fxUpdated, fxManual, onFxUpdated }: FxBannerProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshFx();
      onFxUpdated();
    } catch (e) {
      console.error('Failed to fetch FX rate', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-blue-900/40 border-b border-blue-500/20 px-6 py-2 flex items-center justify-between z-50 relative backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Live Rate</span>
          <span className="text-lg font-bold text-blue-100">£1 = ₹{fxRate.toFixed(2)}</span>
        </div>
        <div className="text-[10px] text-slate-400 hidden sm:block">
          Last updated: {fxUpdated || 'Never'} {fxManual ? '(Manual override)' : '(Live API)'}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Live'}
        </button>
      </div>
    </div>
  );
}
