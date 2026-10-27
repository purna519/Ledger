import React, { useState } from 'react';
import { LayoutDashboard, BookOpen, Landmark, GraduationCap, Briefcase, CheckSquare } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'ledger', label: 'Ledger', icon: <BookOpen size={20} /> },
  { id: 'loans', label: 'Loans', icon: <Landmark size={20} /> },
  { id: 'tuition', label: 'Tuition', icon: <GraduationCap size={20} /> },
  { id: 'jobs', label: 'Jobs', icon: <Briefcase size={20} /> },
  { id: 'todos', label: 'Tasks', icon: <CheckSquare size={20} /> },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] z-40 flex flex-col
                       bg-[rgba(10,15,30,0.85)] backdrop-blur-xl border-r border-slate-700/20
                       max-lg:hidden">
      
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-700/20">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Ledger
        </h1>
        <p className="text-[10px] text-slate-600 tracking-widest uppercase mt-0.5">Financial OS</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/20 border border-transparent'
                }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/20">
        <p className="text-[10px] text-slate-600">v1.0.0 · Local</p>
      </div>
    </aside>
  );
}

/* ── Mobile Bottom Nav ── */
export function MobileNav({ activeTab, onTabChange }: SidebarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
                    bg-[rgba(10,15,30,0.92)] backdrop-blur-xl border-t border-slate-700/20
                    flex items-center justify-around px-2 py-2 safe-bottom">
      {navItems.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all
              ${isActive ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
