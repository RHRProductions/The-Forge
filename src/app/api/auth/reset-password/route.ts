import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import bcrypt from 'bcryptjs';

// Admin reset code - change this to a secure code of your choice
// For production, consider using environment variables
const ADMIN_RESET_CODE = 'FORGE2025RESET';

export async function POST(request: NextRequest) {
  try {
    const { email, resetCode, newPassword } = await request.json();

    // Validate inputs
    if (!email || !resetCode || !newPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify reset code
    if (resetCode !== ADMIN_RESET_CODE) {
      return NextResponse.json(
        { error: 'Invalid reset code' },
        { status: 401 }
      );
    }

    // Validate password length
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check if user exists
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      return NextResponse.json(
        { error: 'No user found with this email address' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const stmt = db.prepare(`
      UPDATE users
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `);

    stmt.run(hashedPassword, email);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
