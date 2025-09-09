import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'data', 'forge.db');
  
  db = new Database(dbPath);
  initializeDatabase();
  return db;
}

function initializeDatabase() {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      status TEXT DEFAULT 'new',
      contact_method TEXT,
      cost_per_lead REAL DEFAULT 0,
      sales_amount REAL DEFAULT 0,
      notes TEXT,
      source TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}