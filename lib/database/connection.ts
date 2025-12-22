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
    'worked_by_id INTEGER',
    'wrong_info BOOLEAN DEFAULT 0'
  ];

  newColumns.forEach(column => {
    try {
      const columnName = column.split(' ')[0];
      db.exec(`ALTER TABLE leads ADD COLUMN ${column};`);
    } catch (error) {
      // Column already exists, ignore error
    }
  });

  // Add 2FA columns to users table
  try {
    db.exec(`ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN two_factor_secret TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN backup_codes TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

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

  // Add total_texts_at_time column to existing lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN total_texts_at_time INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_emails_at_time column to existing lead_activities table
  try {
    db.exec(`ALTER TABLE lead_activities ADD COLUMN total_emails_at_time INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_dials column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN total_dials INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_texts column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN total_texts INTEGER DEFAULT 0;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add total_emails column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN total_emails INTEGER DEFAULT 0;`);
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

  // Add seminar_id to calendar_events for funnel tracking
  try {
    db.exec(`ALTER TABLE calendar_events ADD COLUMN seminar_id INTEGER;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add seminar_id to lead_policies for conversion tracking
  try {
    db.exec(`ALTER TABLE lead_policies ADD COLUMN seminar_id INTEGER;`);
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

  // Add color column to calendar_events table
  try {
    db.exec(`ALTER TABLE calendar_events ADD COLUMN color TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create clients table for client management
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      phone_2 TEXT,
      date_of_birth TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      client_since DATE,
      products TEXT,
      notes TEXT,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS client_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      notes TEXT,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
  `);

  // Create email campaign tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject_line TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      from_name TEXT NOT NULL,
      from_email TEXT NOT NULL,
      reply_to_email TEXT,
      segment_filter TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_for DATETIME,
      sent_at DATETIME,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS email_sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      email_address TEXT NOT NULL,
      sent_at DATETIME,
      delivered_at DATETIME,
      opened_at DATETIME,
      clicked_at DATETIME,
      bounced BOOLEAN DEFAULT 0,
      bounce_reason TEXT,
      sendgrid_message_id TEXT,
      FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_send_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email_send_id) REFERENCES email_sends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_unsubscribes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      email TEXT NOT NULL,
      reason TEXT,
      unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    );
  `);

  // Create email sequence tables for drip campaigns
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      goal TEXT,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS email_sequence_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      delay_days INTEGER NOT NULL DEFAULT 0,
      delay_hours INTEGER NOT NULL DEFAULT 0,
      subject_line TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      from_name TEXT NOT NULL,
      from_email TEXT NOT NULL,
      reply_to_email TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      stopped_at DATETIME,
      stop_reason TEXT,
      last_email_sent_at DATETIME,
      FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      UNIQUE(sequence_id, lead_id)
    );

    CREATE TABLE IF NOT EXISTS email_sequence_sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL,
      step_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      email_address TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME,
      opened_at DATETIME,
      clicked_at DATETIME,
      bounced BOOLEAN DEFAULT 0,
      bounce_reason TEXT,
      sendgrid_message_id TEXT,
      converted BOOLEAN DEFAULT 0,
      conversion_type TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (step_id) REFERENCES email_sequence_steps(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // Create seminar/event tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS seminars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      seminar_type TEXT DEFAULT 'medicare',
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      timezone TEXT DEFAULT 'America/Denver',
      duration_minutes INTEGER DEFAULT 60,
      platform TEXT DEFAULT 'zoom',
      meeting_link TEXT,
      meeting_id TEXT,
      meeting_password TEXT,
      max_attendees INTEGER,
      status TEXT DEFAULT 'scheduled',
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS seminar_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seminar_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      email_campaign_id INTEGER,
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_opened BOOLEAN DEFAULT 0,
      link_clicked BOOLEAN DEFAULT 0,
      registered BOOLEAN DEFAULT 0,
      registered_at DATETIME,
      attended BOOLEAN DEFAULT 0,
      FOREIGN KEY (seminar_id) REFERENCES seminars(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (email_campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
      UNIQUE(seminar_id, lead_id)
    );

    CREATE TABLE IF NOT EXISTS seminar_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seminar_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      invitation_id INTEGER,
      registration_source TEXT DEFAULT 'email',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (seminar_id) REFERENCES seminars(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (invitation_id) REFERENCES seminar_invitations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT NOT NULL,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      severity TEXT DEFAULT 'info',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

    CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);

    CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON client_activities(created_at);

    CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by_user_id);

    CREATE INDEX IF NOT EXISTS idx_seminars_event_date ON seminars(event_date);
    CREATE INDEX IF NOT EXISTS idx_seminars_status ON seminars(status);
    CREATE INDEX IF NOT EXISTS idx_seminars_type ON seminars(seminar_type);

    CREATE INDEX IF NOT EXISTS idx_seminar_invitations_seminar_id ON seminar_invitations(seminar_id);
    CREATE INDEX IF NOT EXISTS idx_seminar_invitations_lead_id ON seminar_invitations(lead_id);
    CREATE INDEX IF NOT EXISTS idx_seminar_invitations_registered ON seminar_invitations(registered);

    CREATE INDEX IF NOT EXISTS idx_seminar_registrations_seminar_id ON seminar_registrations(seminar_id);
    CREATE INDEX IF NOT EXISTS idx_seminar_registrations_lead_id ON seminar_registrations(lead_id);
    CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);
    CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id);
    CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(email_address);
    CREATE INDEX IF NOT EXISTS idx_email_sends_opened_at ON email_sends(opened_at);
    CREATE INDEX IF NOT EXISTS idx_email_events_send_id ON email_events(email_send_id);
    CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
    CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_lead_id ON email_unsubscribes(lead_id);

    CREATE INDEX IF NOT EXISTS idx_email_sequences_active ON email_sequences(is_active);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence_id ON email_sequence_steps(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_order ON email_sequence_steps(sequence_id, step_order);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_sequence_id ON email_sequence_enrollments(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_lead_id ON email_sequence_enrollments(lead_id);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_status ON email_sequence_enrollments(status);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_enrollment_id ON email_sequence_sends(enrollment_id);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_lead_id ON email_sequence_sends(lead_id);
    CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_converted ON email_sequence_sends(converted);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
  `);

  // Create lead_vendors table for managing standardized vendor names
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default vendors if table is empty
  const vendorCount = db.prepare('SELECT COUNT(*) as count FROM lead_vendors').get() as { count: number };
  if (vendorCount.count === 0) {
    const insertVendor = db.prepare('INSERT INTO lead_vendors (vendor_name) VALUES (?)');
    insertVendor.run('Marc Publishing Leads');
    insertVendor.run('Integrity Leads');
    insertVendor.run('Lead Hero Leads');
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}