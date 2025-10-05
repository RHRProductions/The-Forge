import Database from 'better-sqlite3';
import path from 'path';

async function migrateLeadsToAdmin() {
  const dbPath = path.join(process.cwd(), 'data', 'forge.db');
  const db = new Database(dbPath);

  try {
    // Get the admin user ID
    const admin = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin') as any;

    if (!admin) {
      console.error('❌ No admin user found. Please create an admin user first.');
      db.close();
      return;
    }

    const adminId = admin.id;
    console.log(`✅ Found admin user with ID: ${adminId}`);

    // Count leads without owner
    const unassignedLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE owner_id IS NULL').get() as any;
    console.log(`📊 Found ${unassignedLeads.count} unassigned leads`);

    if (unassignedLeads.count === 0) {
      console.log('✅ All leads are already assigned!');
      db.close();
      return;
    }

    // Assign all unassigned leads to admin
    const result = db.prepare('UPDATE leads SET owner_id = ? WHERE owner_id IS NULL').run(adminId);

    console.log(`✅ Successfully assigned ${result.changes} leads to admin user (ID: ${adminId})`);
  } catch (error) {
    console.error('❌ Error migrating leads:', error);
  } finally {
    db.close();
  }
}

migrateLeadsToAdmin().catch(console.error);
