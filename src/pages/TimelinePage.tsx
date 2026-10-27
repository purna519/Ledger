import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { GlassPanel, SectionHeader } from '../components/ui';
import { getMilestones, updateMilestone, getTodos, createTodo, patchTodo, deleteTodo } from '../api/client';
import type { Milestone, ChecklistItem } from '../api/client';
import { todayStr } from '../utils/calc';

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [todos, setTodos] = useState<ChecklistItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  const loadData = async () => {
    const [m, t] = await Promise.all([
      getMilestones(),
      getTodos(todayStr())
    ]);
    setMilestones(m);
    setTodos(t);
  };

  useEffect(() => { loadData(); }, []);

  const handleToggleTodo = async (todo: ChecklistItem) => {
    await patchTodo(todo.id, { done: todo.done === 1 ? false : true });
    loadData();
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await createTodo({ period_key: todayStr(), text: newTodo.trim() });
    setNewTodo('');
    loadData();
  };

  const handleDelTodo = async (id: string) => {
    await deleteTodo(id);
    loadData();
  };

  const handleToggleMilestone = async (m: Milestone) => {
    await updateMilestone(m.key, { done: m.done === 1 ? false : true });
    loadData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Today's Tasks */}
      <GlassPanel className="p-6 lg:col-span-1">
        <SectionHeader title="Today's Tasks" subtitle={todayStr()} />
        
        <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
          <input 
            type="text" className="glass-input" placeholder="Add a task..." 
            value={newTodo} onChange={e => setNewTodo(e.target.value)}
          />
          <button type="submit" className="glass-button glass-button-primary px-3">+</button>
        </form>

        <div className="space-y-2">
          {todos.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/20 rounded-md group">
              <button onClick={() => handleToggleTodo(t)} className={`w-5 h-5 rounded border flex flex-shrink-0 items-center justify-center ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 text-transparent'}`}>
                <Check size={14} />
              </button>
              <span className={`flex-1 text-sm ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{t.text}</span>
              <button onClick={() => handleDelTodo(t.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={16} />
              </button>
            </div>
          ))}
          {todos.length === 0 && <p className="text-sm text-slate-500 text-center py-4">All clear for today!</p>}
        </div>
      </GlassPanel>

      {/* Program Milestones */}
      <GlassPanel className="p-6 lg:col-span-2">
        <SectionHeader title="Program Calendar" subtitle="Sep 2026 → Sep 2028" />
        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3">
          {milestones.map(m => {
            const [y, mo] = m.key.split('-');
            const dateStr = new Date(Number(y), Number(mo)-1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            return (
              <div key={m.key} className={`flex items-start gap-4 p-3 rounded-lg border ${m.done ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-800/30 border-slate-700/30'}`}>
                <div className="w-20 pt-0.5 text-xs font-semibold text-slate-400 shrink-0">{dateStr}</div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-none outline-none text-sm text-slate-200" 
                    defaultValue={m.text}
                    placeholder="Add milestone description..."
                    onBlur={e => updateMilestone(m.key, { text: e.target.value })}
                  />
                </div>
                <button onClick={() => handleToggleMilestone(m)} className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border ${m.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'}`}>
                  {m.done ? <Check size={14} /> : ''}
                </button>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
