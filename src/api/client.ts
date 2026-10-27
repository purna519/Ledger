import axios from 'axios';
import type { ConfigData, LedgerEntry, Disbursement, JobEntry } from '../utils/calc';

const api = axios.create({ baseURL: '/api' });

// ─── Config ───
export const getConfig = () => api.get<ConfigData>('/config').then(r => r.data);
export const updateConfig = (data: Partial<ConfigData>) => api.put<ConfigData>('/config', data).then(r => r.data);

// ─── FX ───
export const refreshFx = () => api.get<{ rate: number; updated: string; manual: boolean }>('/fx/refresh').then(r => r.data);

// ─── Ledger ───
export const getEntries = () => api.get<LedgerEntry[]>('/entries').then(r => r.data);
export const createEntry = (data: Omit<LedgerEntry, 'id'>) => api.post<LedgerEntry>('/entries', data).then(r => r.data);
export const deleteEntry = (id: string) => api.delete(`/entries/${id}`);

// ─── Disbursements ───
export const getDisbursements = () => api.get<Disbursement[]>('/disbursements').then(r => r.data);
export const createDisbursement = (data: { date: string; amountINR: number }) => api.post<Disbursement>('/disbursements', data).then(r => r.data);
export const deleteDisbursement = (id: string) => api.delete(`/disbursements/${id}`);

// ─── Payment Logs (Tuition & Rent) ───
export interface PaymentLog {
  id: string;
  category: 'tuition' | 'rent';
  date: string;
  amountINR: number;
  amountGBP: number;
  bank: string;
  source: string;
  note: string;
}

export const getPaymentLogs = (category?: string) => 
  api.get<PaymentLog[]>(`/payment-logs${category ? `?category=${category}` : ''}`).then(r => r.data);

export const createPaymentLog = (data: Omit<PaymentLog, 'id'>) => 
  api.post<PaymentLog>('/payment-logs', data).then(r => r.data);

export const deletePaymentLog = (id: string) => 
  api.delete(`/payment-logs/${id}`);

// ─── Job ───
export const getJobEntries = () => api.get<JobEntry[]>('/job/entries').then(r => r.data);
export const createJobEntry = (data: { date: string; hours: number; note: string }) => api.post<JobEntry>('/job/entries', data).then(r => r.data);
export const deleteJobEntry = (id: string) => api.delete(`/job/entries/${id}`);

// ─── Milestones ───
export interface Milestone { key: string; text: string; done: number; }
export const getMilestones = () => api.get<Milestone[]>('/milestones').then(r => r.data);
export const updateMilestone = (key: string, data: { text?: string; done?: boolean }) => api.put<Milestone>(`/milestones/${key}`, data).then(r => r.data);

// ─── Checklists (todos, weekly, monthly) ───
export interface ChecklistItem { id: string; period_key: string; text: string; done: number; }
export const getTodos = (date: string) => api.get<ChecklistItem[]>(`/todos?date=${date}`).then(r => r.data);
export const createTodo = (data: { period_key: string; text: string }) => api.post<ChecklistItem>('/todos', data).then(r => r.data);
export const patchTodo = (id: string, data: { text?: string; done?: boolean }) => api.patch<ChecklistItem>(`/todos/${id}`, data).then(r => r.data);
export const deleteTodo = (id: string) => api.delete(`/todos/${id}`);

export const getWeeklyTargets = (week: string) => api.get<ChecklistItem[]>(`/weekly-targets?week=${week}`).then(r => r.data);
export const createWeeklyTarget = (data: { period_key: string; text: string }) => api.post<ChecklistItem>('/weekly-targets', data).then(r => r.data);
export const patchWeeklyTarget = (id: string, data: { text?: string; done?: boolean }) => api.patch<ChecklistItem>(`/weekly-targets/${id}`, data).then(r => r.data);
export const deleteWeeklyTarget = (id: string) => api.delete(`/weekly-targets/${id}`);

export const getMonthlyTargets = (month: string) => api.get<ChecklistItem[]>(`/monthly-targets?month=${month}`).then(r => r.data);
export const createMonthlyTarget = (data: { period_key: string; text: string }) => api.post<ChecklistItem>('/monthly-targets', data).then(r => r.data);
export const patchMonthlyTarget = (id: string, data: { text?: string; done?: boolean }) => api.patch<ChecklistItem>(`/monthly-targets/${id}`, data).then(r => r.data);
export const deleteMonthlyTarget = (id: string) => api.delete(`/monthly-targets/${id}`);

export default api;
