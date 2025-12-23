import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../../../../../lib/security/password-validator';
import { sanitizeUser } from '../../../../../lib/security/input-sanitizer';

// DELETE /api/users/[id] - Delete a user (admin or agent deleting their own setter)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserId = parseInt((session.user as any).id);

    // Only admins and agents can delete users
    if (currentUserRole !== 'admin' && currentUserRole !== 'agent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (userId === currentUserId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const db = getDatabase();

    // Check if user exists and get their details
    const user = db.prepare('SELECT id, role, agent_id FROM users WHERE id = ?').get(userId) as { id: number; role: string; agent_id: number | null } | undefined;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If current user is an agent (not admin), they can only delete their own setters
    if (currentUserRole === 'agent') {
      // Can only delete setters
      if (user.role !== 'setter') {
        return NextResponse.json({ error: 'Agents can only delete setters' }, { status: 403 });
      }
      // Can only delete setters assigned to them
      if (user.agent_id !== currentUserId) {
        return NextResponse.json({ error: 'You can only delete your own team members' }, { status: 403 });
      }
    }

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update a user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update users
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const rawBody = await request.json();

    // Sanitize user inputs to prevent XSS
    const sanitized = sanitizeUser(rawBody);
    const { name, email, role, agent_id } = sanitized;
    const password = rawBody.password; // Password is not sanitized, only validated

    const db = getDatabase();

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (password !== undefined && password !== '') {
      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json({
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (role !== undefined) {
      if (!['admin', 'agent', 'setter'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (agent_id !== undefined) {
      updates.push('agent_id = ?');
      values.push(agent_id || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add userId to values for WHERE clause
    values.push(userId);

    // Execute update
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Return updated user
    const updatedUser = db.prepare(`
      SELECT id, name, email, role, agent_id, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
