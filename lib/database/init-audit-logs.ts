import Database from 'better-sqlite3';
import path from 'path';

/**
 * Initialize audit logs table
 * Run this once to add audit logging to existing database
 */
export function initAuditLogs() {
  const dbPath = path.join(process.cwd(), 'data', 'forge.db');
  const db = new Database(dbPath);

  // Create audit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      user_email TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      severity TEXT DEFAULT 'info',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
  `);

  console.log('✅ Audit logs table initialized');
  db.close();
}

// Run if executed directly
if (require.main === module) {
  initAuditLogs();
}
