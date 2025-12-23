import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../../../../../lib/security/password-validator';

// PATCH /api/users/profile - Update current user's own profile (email/password)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    const db = getDatabase();

    // Get current user
    const user = db.prepare('SELECT id, email, password FROM users WHERE id = ?').get(userId) as {
      id: number;
      email: string;
      password: string;
    } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Update email if provided
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check if email is already taken
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      updates.push('email = ?');
      values.push(email);
    }

    // Update password if provided
    if (newPassword) {
      // Require current password to change password
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json({
          error: 'New password does not meet requirements',
          details: passwordValidation.errors
        }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No changes to update' }, { status: 400 });
    }

    // Add updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    // Execute update
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Return updated user info (without password)
    const updatedUser = db.prepare(`
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
    `).get(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
