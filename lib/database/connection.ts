import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'data', 'forge.db');

  db = new Database(dbPath);

  // Enable performance optimizations
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  db.pragma('synchronous = NORMAL'); // Faster writes
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY'); // Temporary tables in memory
  db.pragma('mmap_size = 30000000000'); // Memory-mapped I/O for faster reads

  initializeDatabase();
  return db;
}

function initializeDatabase() {
  if (!db) return;

  // First, create the table with original structure if it doesn't exist
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'agent',
      agent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

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
  `);

  // Add new columns if they don't exist (ALTER TABLE approach for existing data)
  const newColumns = [
    'phone_2 TEXT',
    'address TEXT DEFAULT ""',
    'city TEXT DEFAULT ""',
    'state TEXT DEFAULT ""',
    'zip_code TEXT DEFAULT ""',
    'date_of_birth TEXT',
    'age INTEGER',
    'gender TEXT',
    'marital_status TEXT',
    'occupation TEXT',
    'income TEXT',
    'household_size INTEGER',
    'lead_type TEXT DEFAULT "other"',
    'lead_score INTEGER DEFAULT 0',
    'lead_temperature TEXT',
    'last_contact_date TEXT',
    'next_follow_up TEXT',
    'contact_attempt_count INTEGER DEFAULT 0',
    'owner_id INTEGER',
    'worked_by_id INTEGER'
  ];

  newColumns.forEach(column => {
    try {
      const columnName = column.split(' ')[0];
      db.exec(`ALTER TABLE leads ADD COLUMN ${column};`);
    } catch (error) {
      // Column already exists, ignore error
    }
  });

  // Create related tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      policy_number TEXT,
      policy_type TEXT NOT NULL,
      coverage_amount REAL,
      premium_amount REAL,
      commission_amount REAL,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_detail TEXT NOT NULL,
      outcome TEXT,
      lead_temperature_after TEXT,
      next_follow_up_date TEXT,
      contact_attempt_number INTEGER,
      dial_count INTEGER DEFAULT 1,
      total_dials_at_time INTEGER,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Add dial_count column to existing lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN dial_count INTEGER DEFAULT 1;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_dials_at_time column to existing lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN total_dials_at_time INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_dials column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN total_dials INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add created_by_user_id column to lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN created_by_user_id INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add lead_temperature_after column to lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN lead_temperature_after TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add next_follow_up_date column to lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN next_follow_up_date TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add contact_attempt_number column to lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN contact_attempt_number INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add commission_amount column to lead_policies table
  try {
    db.exec(`ALTER TABLE lead_policies ADD COLUMN commission_amount REAL;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create calendar_events table for agent scheduling
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      lead_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      event_type TEXT DEFAULT 'appointment',
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_zip_code ON leads(zip_code);
    CREATE INDEX IF NOT EXISTS idx_leads_age ON leads(age);
    CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
    CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
    CREATE INDEX IF NOT EXISTS idx_leads_worked_by_id ON leads(worked_by_id);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
    CREATE INDEX IF NOT EXISTS idx_leads_temperature_followup ON leads(lead_temperature, next_follow_up);
    CREATE INDEX IF NOT EXISTS idx_leads_status_temperature ON leads(status, lead_temperature);

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);

    CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_images_lead_id ON lead_images(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_policies_lead_id ON lead_policies(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_policies_created_at ON lead_policies(created_at);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON lead_activities(created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_lead_activities_outcome ON lead_activities(outcome);

    CREATE INDEX IF NOT EXISTS idx_calendar_events_agent_id ON calendar_events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}