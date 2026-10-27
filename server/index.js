import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, runSql } from './db.js';
import { fetchLiveRate } from './fx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Wait for DB to init before serving requests
app.use(async (req, res, next) => {
  await getDb();
  next();
});

// ─── Config ───────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const row = queryOne('SELECT * FROM config WHERE id = 1');
  res.json(row);
});

app.put('/api/config', (req, res) => {
  const current = queryOne('SELECT * FROM config WHERE id = 1');
  const allowed = Object.keys(current).filter(k => k !== 'id');
  const sets = [];
  const vals = [];
  for (const [key, val] of Object.entries(req.body)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      vals.push(val);
    }
  }
  if (sets.length > 0) {
    runSql(`UPDATE config SET ${sets.join(', ')} WHERE id = 1`, vals);
  }
  res.json(queryOne('SELECT * FROM config WHERE id = 1'));
});

// ─── FX Rate ──────────────────────────────────────────────
app.get('/api/fx/refresh', async (req, res) => {
  const rate = await fetchLiveRate();
  if (rate) {
    const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    runSql('UPDATE config SET fxRate = ?, fxUpdated = ?, fxManual = 0 WHERE id = 1', [rate, now]);
    res.json({ rate, updated: now, manual: false });
  } else {
    const current = queryOne('SELECT fxRate, fxUpdated, fxManual FROM config WHERE id = 1');
    res.status(502).json({ error: 'Could not fetch live rate', current });
  }
});

// ─── Ledger Entries ───────────────────────────────────────
app.get('/api/entries', (req, res) => {
  const rows = queryAll('SELECT * FROM ledger_entries ORDER BY date DESC, rowid DESC');
  res.json(rows);
});

app.post('/api/entries', (req, res) => {
  const { date, type, category, currency, amountGBP, note } = req.body;
  const id = uuidv4();
  runSql(
    'INSERT INTO ledger_entries (id, date, type, category, currency, amountGBP, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, date, type, category, currency || 'GBP', amountGBP, note || '']
  );
  res.status(201).json({ id, date, type, category, currency: currency || 'GBP', amountGBP, note: note || '' });
});

app.delete('/api/entries/:id', (req, res) => {
  runSql('DELETE FROM ledger_entries WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Disbursements ────────────────────────────────────────
app.get('/api/disbursements', (req, res) => {
  const rows = queryAll('SELECT * FROM disbursements ORDER BY date ASC');
  res.json(rows);
});

app.post('/api/disbursements', (req, res) => {
  const { date, amountINR } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO disbursements (id, date, amountINR) VALUES (?, ?, ?)', [id, date, amountINR]);
  res.status(201).json({ id, date, amountINR });
});

app.delete('/api/disbursements/:id', (req, res) => {
  runSql('DELETE FROM disbursements WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Payment Logs (Tuition & Rent) ────────────────────────
app.get('/api/payment-logs', (req, res) => {
  const category = req.query.category;
  let rows;
  if (category) {
    rows = queryAll('SELECT * FROM payment_logs WHERE category = ? ORDER BY date DESC, rowid DESC', [category]);
  } else {
    rows = queryAll('SELECT * FROM payment_logs ORDER BY date DESC, rowid DESC');
  }
  res.json(rows);
});

app.post('/api/payment-logs', (req, res) => {
  const { category, date, amountINR, amountGBP, bank, source, note } = req.body;
  const id = uuidv4();
  runSql(
    'INSERT INTO payment_logs (id, category, date, amountINR, amountGBP, bank, source, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, category, date, amountINR || 0, amountGBP || 0, bank || 'Other', source || 'Savings', note || '']
  );
  res.status(201).json({ id, category, date, amountINR: amountINR || 0, amountGBP: amountGBP || 0, bank: bank || 'Other', source: source || 'Savings', note: note || '' });
});

app.delete('/api/payment-logs/:id', (req, res) => {
  runSql('DELETE FROM payment_logs WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Job Entries ──────────────────────────────────────────
app.get('/api/job/entries', (req, res) => {
  const rows = queryAll('SELECT * FROM job_entries ORDER BY date DESC');
  res.json(rows);
});

app.post('/api/job/entries', (req, res) => {
  const { date, hours, note } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO job_entries (id, date, hours, note) VALUES (?, ?, ?, ?)', [id, date, hours, note || '']);
  res.status(201).json({ id, date, hours, note: note || '' });
});

app.delete('/api/job/entries/:id', (req, res) => {
  runSql('DELETE FROM job_entries WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── Milestones ───────────────────────────────────────────
app.get('/api/milestones', (req, res) => {
  const rows = queryAll('SELECT * FROM milestones ORDER BY key ASC');
  res.json(rows);
});

app.put('/api/milestones/:key', (req, res) => {
  const { text, done } = req.body;
  if (text !== undefined) {
    runSql('UPDATE milestones SET text = ? WHERE key = ?', [text, req.params.key]);
  }
  if (done !== undefined) {
    runSql('UPDATE milestones SET done = ? WHERE key = ?', [done ? 1 : 0, req.params.key]);
  }
  const row = queryOne('SELECT * FROM milestones WHERE key = ?', [req.params.key]);
  res.json(row);
});

// ─── Generic checklist helper (todos, weekly_targets, monthly_targets) ─
function checklistRoutes(tableName, basePath) {
  app.get(basePath, (req, res) => {
    const periodKey = req.query.date || req.query.week || req.query.month || '';
    let rows;
    if (periodKey) {
      rows = queryAll(`SELECT * FROM ${tableName} WHERE period_key = ? ORDER BY rowid ASC`, [periodKey]);
    } else {
      rows = queryAll(`SELECT * FROM ${tableName} ORDER BY period_key DESC, rowid ASC`);
    }
    res.json(rows);
  });

  app.post(basePath, (req, res) => {
    const { period_key, text } = req.body;
    const id = uuidv4();
    runSql(`INSERT INTO ${tableName} (id, period_key, text, done) VALUES (?, ?, ?, 0)`, [id, period_key, text]);
    res.status(201).json({ id, period_key, text, done: 0 });
  });

  app.patch(`${basePath}/:id`, (req, res) => {
    const { text, done } = req.body;
    if (text !== undefined) {
      runSql(`UPDATE ${tableName} SET text = ? WHERE id = ?`, [text, req.params.id]);
    }
    if (done !== undefined) {
      runSql(`UPDATE ${tableName} SET done = ? WHERE id = ?`, [done ? 1 : 0, req.params.id]);
    }
    const row = queryOne(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
    res.json(row);
  });

  app.delete(`${basePath}/:id`, (req, res) => {
    runSql(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  });
}

checklistRoutes('todos', '/api/todos');
checklistRoutes('weekly_targets', '/api/weekly-targets');
checklistRoutes('monthly_targets', '/api/monthly-targets');

// ─── Serve built frontend in production ───────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, async () => {
  await getDb(); // Init DB
  console.log(`\n  ✦ Ledger server running at http://localhost:${PORT}\n`);
});
