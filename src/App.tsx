import { useState, useEffect } from 'react';
import Sidebar, { MobileNav } from './components/Sidebar';
import FxBanner from './components/FxBanner';
import DashboardPage from './pages/OverviewPage';
import LedgerPage from './pages/LedgerPage';
import LoanPage from './pages/LoanPage';
import TuitionPage from './pages/TuitionPage';
import JobPage from './pages/JobPage';
import TimelinePage from './pages/TimelinePage';
import { LoadingState } from './components/ui';
import {
  getConfig, getEntries, getDisbursements, getJobEntries
} from './api/client';
import type { ConfigData, LedgerEntry, Disbursement, JobEntry } from './utils/calc';
import {
  calcPrincipal, calcTotalInterestToDate, calcOutstanding,
  calcMonthlyTotals, todayStr
} from './utils/calc';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [jobEntries, setJobEntries] = useState<JobEntry[]>([]);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [cfg, txns, disb, jobs] = await Promise.all([
        getConfig(), getEntries(), getDisbursements(), getJobEntries()
      ]);
      setConfig(cfg);
      setEntries(txns);
      setDisbursements(disb);
      setJobEntries(jobs);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  if (loading || !config) return <div className="min-h-screen bg-[#06081a] flex items-center justify-center"><LoadingState /></div>;

  // Compute common top-level derived states needed across tabs
  const principal = calcPrincipal(disbursements);
  const totalInterest = calcTotalInterestToDate(disbursements, config.loanROI);
  const outstanding = calcOutstanding(principal, totalInterest, config.loanRepaid);
  
  const thisMonthKey = todayStr().substring(0, 7); // 'YYYY-MM'
  const monthly = calcMonthlyTotals(entries, jobEntries, config.jobRateGBP, config.fxRate, config.rent, config.bills, thisMonthKey);
  const todayEntries = entries.filter(e => e.date === todayStr());
  const todayExpenseGBP = todayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amountGBP, 0);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage 
          config={config} 
          entries={entries} 
          jobEntries={jobEntries}
          disbursements={disbursements}
          outstanding={outstanding}
          monthly={monthly}
          todayExpenseGBP={todayExpenseGBP}
        />;
      case 'ledger':
        return <LedgerPage entries={entries} config={config} onUpdate={loadData} />;
      case 'loans':
        return <LoanPage config={config} disbursements={disbursements} onUpdate={loadData} />;
      case 'tuition':
        return <TuitionPage config={config} onUpdate={loadData} />;
      case 'jobs':
        return <JobPage config={config} onUpdate={loadData} />;
      case 'todos':
        return <TimelinePage />;
      default:
        return <DashboardPage config={config} entries={entries} jobEntries={jobEntries} disbursements={disbursements} outstanding={outstanding} monthly={monthly} todayExpenseGBP={todayExpenseGBP} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <FxBanner 
        fxRate={config.fxRate} 
        fxUpdated={config.fxUpdated} 
        fxManual={config.fxManual === 1} 
        onFxUpdated={loadData} 
      />
      
      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 lg:ml-[220px] pb-20 lg:pb-0 relative z-10">
          <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
