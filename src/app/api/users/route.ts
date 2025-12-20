import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../../../../lib/security/password-validator';

// GET /api/users - List all users (admin only)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can list users
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDatabase();
    const users = db.prepare(`
      SELECT id, name, email, role, agent_id, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create users
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, agent_id } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'agent', 'setter'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      }, { status: 400 });
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, agent_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, hashedPassword, role, agent_id || null);

    // Return user without password
    const newUser = db.prepare(`
      SELECT id, name, email, role, agent_id, created_at
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
