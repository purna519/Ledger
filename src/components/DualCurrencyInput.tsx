import React, { useState, useEffect } from 'react';
import { toGBP, toINR } from '../utils/calc';

interface DualCurrencyInputProps {
  label: string;
  valueINR?: number;
  valueGBP?: number;
  onChangeINR?: (val: number) => void;
  onChangeGBP?: (val: number) => void;
  onBlur?: () => void;
  fxRate: number;
  primary?: 'INR' | 'GBP';
  required?: boolean;
}

function cleanNumStr(num?: number): string {
  if (num === undefined || num === null || isNaN(num) || num === 0) return '';
  const rounded = Math.round(num * 100) / 100;
  return rounded.toString();
}

export default function DualCurrencyInput({ 
  label, valueINR, valueGBP, onChangeINR, onChangeGBP, onBlur, fxRate, primary = 'INR', required = false
}: DualCurrencyInputProps) {
  
  // Track string values so user can type decimals properly (e.g. "12.")
  const [inrStr, setInrStr] = useState('');
  const [gbpStr, setGbpStr] = useState('');

  // Sync internal state if props change from outside
  useEffect(() => {
    if (primary === 'INR' && valueINR !== undefined) {
      const parsedCurrent = parseFloat(inrStr);
      const roundedProp = Math.round(valueINR * 100) / 100;
      if (isNaN(parsedCurrent) || parsedCurrent !== roundedProp) {
        setInrStr(cleanNumStr(valueINR));
        setGbpStr(cleanNumStr(toGBP(valueINR, fxRate)));
      }
    }
    if (primary === 'GBP' && valueGBP !== undefined) {
      const parsedCurrent = parseFloat(gbpStr);
      const roundedProp = Math.round(valueGBP * 100) / 100;
      if (isNaN(parsedCurrent) || parsedCurrent !== roundedProp) {
        setGbpStr(cleanNumStr(valueGBP));
        setInrStr(cleanNumStr(toINR(valueGBP, fxRate)));
      }
    }
  }, [valueINR, valueGBP, fxRate, primary]);

  const handleInrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInrStr(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const roundedINR = Math.round(num * 100) / 100;
      const calculatedGBP = toGBP(roundedINR, fxRate);
      setGbpStr(cleanNumStr(calculatedGBP));
      onChangeINR?.(roundedINR);
      onChangeGBP?.(calculatedGBP);
    } else {
      setGbpStr('');
      onChangeINR?.(0);
      onChangeGBP?.(0);
    }
  };

  const handleGbpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGbpStr(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const roundedGBP = Math.round(num * 100) / 100;
      const calculatedINR = toINR(roundedGBP, fxRate);
      setInrStr(cleanNumStr(calculatedINR));
      onChangeINR?.(calculatedINR);
      onChangeGBP?.(roundedGBP);
    } else {
      setInrStr('');
      onChangeINR?.(0);
      onChangeGBP?.(0);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₹</span>
          <input 
            type="number" 
            className="glass-input !pl-8" 
            value={inrStr} 
            onChange={handleInrChange} 
            onBlur={onBlur}
            step="0.01" 
            placeholder="0.00"
            required={required}
          />
        </div>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">£</span>
          <input 
            type="number" 
            className="glass-input !pl-8" 
            value={gbpStr} 
            onChange={handleGbpChange} 
            onBlur={onBlur}
            step="0.01" 
            placeholder="0.00"
            required={required && primary === 'GBP'}
          />
        </div>
      </div>
    </div>
  );
}
