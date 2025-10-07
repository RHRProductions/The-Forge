import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log('\n🔧 Password Reset Tool\n');

  // Connect to database
  const dbPath = path.join(process.cwd(), 'data', 'forge.db');
  console.log(`Database: ${dbPath}\n`);

  const db = new Database(dbPath);

  // List all users
  const users = db.prepare('SELECT id, name, email, role FROM users').all() as any[];

  if (users.length === 0) {
    console.log('❌ No users found in database');
    db.close();
    rl.close();
    return;
  }

  console.log('Available users:');
  users.forEach(user => {
    console.log(`  ${user.id}. ${user.name} (${user.email}) - Role: ${user.role}`);
  });

  console.log('');

  // Get user selection
  const userIdStr = await question('Enter user ID to reset password: ');
  const userId = parseInt(userIdStr);

  const selectedUser = users.find(u => u.id === userId);

  if (!selectedUser) {
    console.log('❌ Invalid user ID');
    db.close();
    rl.close();
    return;
  }

  console.log(`\nResetting password for: ${selectedUser.name} (${selectedUser.email})`);

  // Get new password
  const newPassword = await question('Enter new password: ');

  if (!newPassword || newPassword.length < 4) {
    console.log('❌ Password must be at least 4 characters');
    db.close();
    rl.close();
    return;
  }

  // Hash the password
  console.log('\n🔐 Hashing password...');
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update in database
  const stmt = db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(hashedPassword, userId);

  console.log('✅ Password updated successfully!');
  console.log(`\nYou can now login with:`);
  console.log(`  Email: ${selectedUser.email}`);
  console.log(`  Password: ${newPassword}`);

  db.close();
  rl.close();
}

resetPassword().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
