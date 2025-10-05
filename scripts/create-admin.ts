import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';

async function createAdminUser() {
  const dbPath = path.join(process.cwd(), 'data', 'forge.db');
  const db = new Database(dbPath);

  const email = 'admin@theforge.com';
  const password = 'admin123'; // Change this password after first login!
  const name = 'Admin User';

  // Check if admin already exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (existingUser) {
    console.log('Admin user already exists!');
    console.log('Email:', email);
    db.close();
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert admin user
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `).run(name, email, hashedPassword, 'admin');

  console.log('✅ Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('⚠️  Please change this password after first login!');

  db.close();
}

createAdminUser().catch(console.error);
