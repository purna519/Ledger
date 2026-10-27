import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function GlassPanel({ children, className = '', elevated = false }: GlassPanelProps) {
  return (
    <div className={`${elevated ? 'glass-card' : 'glass-panel'} ${className}`}>
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export function MetricCard({ label, value, subtitle, icon, trend, accentColor }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';
  const borderStyle = accentColor ? { borderTop: `2px solid ${accentColor}` } : {};
  
  return (
    <div className="glass-card p-5 animate-fade-in" style={borderStyle}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium tracking-wider uppercase text-slate-400">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold tracking-tight ${trendColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, color = '#3b82f6', height = '6px', showLabel = false }: ProgressBarProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="w-full">
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(51,65,85,0.4)' }}>
        <div
          className="rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%`, height: '100%', background: color }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-400 mt-1 text-right">{percent.toFixed(1)}%</p>
      )}
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3 opacity-40">{icon || '📭'}</span>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
}
