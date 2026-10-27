import React, { useState, useEffect } from 'react';
import { GlassPanel, SectionHeader, MetricCard } from '../components/ui';
import CurrencyToggle from '../components/CurrencyToggle';
import { getJobEntries, createJobEntry, deleteJobEntry, updateConfig } from '../api/client';
import type { JobEntry, ConfigData } from '../utils/calc';
import { fmtGBP, fmtINR, toINR, todayStr } from '../utils/calc';

interface JobPageProps {
  config: ConfigData;
  onUpdate: () => void;
}

export default function JobPage({ config, onUpdate }: JobPageProps) {
  const [entries, setEntries] = useState<JobEntry[]>([]);
  const [jobName, setJobName] = useState(config.jobName);
  const [rate, setRate] = useState(config.jobRateGBP);
  
  // form state
  const [date, setDate] = useState(todayStr());
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const loadData = async () => {
    const data = await getJobEntries();
    setEntries(data);
  };

  useEffect(() => { loadData(); }, []);

  const saveConfig = async () => {
    await updateConfig({ jobName, jobRateGBP: rate });
    onUpdate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || isNaN(Number(hours))) return;
    await createJobEntry({ date, hours: Number(hours), note });
    setDate(todayStr());
    setHours('');
    setNote('');
    loadData();
    onUpdate();
  };

  const handleDel = async (id: string) => {
    await deleteJobEntry(id);
    loadData();
    onUpdate();
  };

  const thisMonthKey = todayStr().substring(0, 7);
  const monthEntries = entries.filter(e => e.date.startsWith(thisMonthKey));
  const monthHours = monthEntries.reduce((s, e) => s + e.hours, 0);
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6 animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div className="lg:col-span-1 space-y-6">
        <GlassPanel className="p-6">
          <SectionHeader title="Job Settings" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Employer / Job Title</label>
              <input type="text" className="glass-input" value={jobName} onChange={e => setJobName(e.target.value)} onBlur={saveConfig} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hourly Rate (GBP)</label>
              <input type="number" step="0.1" className="glass-input" value={rate || ''} onChange={e => setRate(Number(e.target.value))} onBlur={saveConfig} />
            </div>
          </div>
        </GlassPanel>

        <MetricCard label="This Month's Earnings" value={fmtGBP(monthHours * config.jobRateGBP)} subtitle={`${monthHours} hours logged`} trend="up" accentColor="#10b981" />
        <MetricCard label="All-Time Earnings" value={fmtGBP(totalHours * config.jobRateGBP)} subtitle={`${totalHours} hours logged`} trend="neutral" accentColor="#3b82f6" />
      </div>

      <div className="lg:col-span-2 space-y-6">
        <GlassPanel className="p-6">
          <SectionHeader title="Log Hours" />
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input type="date" required className="glass-input w-36" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hours</label>
              <input type="number" step="0.25" required className="glass-input w-24" value={hours} onChange={e => setHours(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
              <input type="text" className="glass-input" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button type="submit" className="glass-button glass-button-primary">Log Shift</button>
          </form>
          {hours && !isNaN(Number(hours)) && (
            <p className="text-xs text-emerald-400 mt-3 font-medium">
              Will earn: {fmtGBP(Number(hours) * config.jobRateGBP)} ({fmtINR(toINR(Number(hours) * config.jobRateGBP, config.fxRate))})
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="p-6">
          <SectionHeader title="Shift History" />
          <div className="space-y-2">
            {entries.length === 0 ? <p className="text-sm text-slate-500 py-4">No hours logged yet.</p> : entries.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <div>
                  <p className="text-sm font-medium text-slate-200">{e.date}</p>
                  <p className="text-xs text-slate-500">{e.note || 'No note'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{fmtGBP(e.hours * config.jobRateGBP)}</p>
                  <p className="text-xs text-slate-400">{e.hours} hrs</p>
                </div>
                <button onClick={() => handleDel(e.id)} className="ml-4 text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

    </div>
  );
}
