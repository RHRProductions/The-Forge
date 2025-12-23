import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';
import bcrypt from 'bcryptjs';
import { logAuditFromRequest } from '../../../../../lib/security/audit-logger';
import { validatePassword } from '../../../../../lib/security/password-validator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only agents and admins can create setters
    if (!session?.user || !['agent', 'admin'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      }, { status: 400 });
    }

    const db = getDatabase();
    const agentId = (session.user as any).id;

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the setter user
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, agent_id, created_at, updated_at)
      VALUES (?, ?, ?, 'setter', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(name, email, hashedPassword, agentId);

    // AUDIT LOG: User creation
    await logAuditFromRequest(request, {
      action: 'user_create',
      resourceType: 'user',
      resourceId: result.lastInsertRowid.toString(),
      details: {
        newUserEmail: email,
        newUserRole: 'setter',
        createdByAgentId: agentId
      },
      severity: 'warning'
    });

    return NextResponse.json({
      success: true,
      message: 'Setter created successfully',
      userId: result.lastInsertRowid,
      user: {
        id: result.lastInsertRowid,
        name,
        email,
        role: 'setter'
      }
    });

  } catch (error) {
    console.error('Error creating setter:', error);
    return NextResponse.json(
      { error: 'Failed to create setter' },
      { status: 500 }
    );
  }
}
