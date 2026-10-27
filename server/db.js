import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'tracker.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      loanSanctioned     REAL DEFAULT 0,
      loanROI            REAL DEFAULT 8.5,
      loanRepayStart     TEXT DEFAULT '2028-10-01',
      loanTenure         INTEGER DEFAULT 10,
      loanRepaid         REAL DEFAULT 0,
      repaySavings       REAL DEFAULT 0,
      schoApplied        TEXT DEFAULT 'no',
      schoAppliedAmt     REAL DEFAULT 0,
      schoReceived       REAL DEFAULT 0,
      tuitionTotal       REAL DEFAULT 0,
      tuitionPaid        REAL DEFAULT 0,
      rent               REAL DEFAULT 0,
      bills              REAL DEFAULT 0,
      emergencyTarget    REAL DEFAULT 0,
      emergencyCurrent   REAL DEFAULT 0,
      progStart          TEXT DEFAULT 'Sep 2026',
      progEnd            TEXT DEFAULT 'Sep 2028',
      fxRate             REAL DEFAULT 110.0,
      fxUpdated          TEXT DEFAULT '',
      fxManual           INTEGER DEFAULT 1,
      jobName            TEXT DEFAULT '',
      jobRateGBP         REAL DEFAULT 0,
      displayCurrencyPrefs TEXT DEFAULT '{}'
    );
  `);
  db.run(`INSERT OR IGNORE INTO config (id) VALUES (1)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id        TEXT PRIMARY KEY,
      date      TEXT NOT NULL,
      type      TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category  TEXT NOT NULL,
      currency  TEXT NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'INR')),
      amountGBP REAL NOT NULL,
      note      TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS disbursements (
      id        TEXT PRIMARY KEY,
      date      TEXT NOT NULL,
      amountINR REAL NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_logs (
      id        TEXT PRIMARY KEY,
      category  TEXT NOT NULL CHECK (category IN ('tuition', 'rent')),
      date      TEXT NOT NULL,
      amountINR REAL NOT NULL,
      amountGBP REAL NOT NULL,
      bank      TEXT NOT NULL,
      source    TEXT NOT NULL,
      note      TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_entries (
      id    TEXT PRIMARY KEY,
      date  TEXT NOT NULL,
      hours REAL NOT NULL,
      note  TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS milestones (
      key  TEXT PRIMARY KEY,
      text TEXT DEFAULT '',
      done INTEGER DEFAULT 0
    );
  `);

  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY, period_key TEXT NOT NULL, text TEXT NOT NULL, done INTEGER DEFAULT 0
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS weekly_targets (
    id TEXT PRIMARY KEY, period_key TEXT NOT NULL, text TEXT NOT NULL, done INTEGER DEFAULT 0
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS monthly_targets (
    id TEXT PRIMARY KEY, period_key TEXT NOT NULL, text TEXT NOT NULL, done INTEGER DEFAULT 0
  );`);

  // Seed milestones
  const seedMilestones = {
    '2026-09': 'Program begins · first tuition installment due',
    '2027-01': 'Spring term tuition installment due',
    '2027-06': 'Scholarship renewal review',
    '2027-09': 'Second-year tuition installment due',
    '2028-01': 'Final term tuition installment due',
    '2028-09': 'Program ends · loan repayment plan begins',
  };

  const count = db.exec('SELECT COUNT(*) as c FROM milestones')[0]?.values[0][0] || 0;
  if (count === 0) {
    for (let y = 2026; y <= 2028; y++) {
      const startM = y === 2026 ? 9 : 1;
      const endM = y === 2028 ? 9 : 12;
      for (let m = startM; m <= endM; m++) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const text = seedMilestones[key] || '';
        db.run('INSERT OR IGNORE INTO milestones (key, text, done) VALUES (?, ?, 0)', [key, text]);
      }
    }
  }

  saveDb();
  return db;
}

// Persist to disk
export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run query and return rows as objects
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

export function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}
