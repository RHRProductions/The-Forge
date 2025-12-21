import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import bcrypt from 'bcryptjs';

/**
 * Check if a user has 2FA enabled
 * This endpoint is called by the login page to determine if TOTP input should be shown
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT id, password, two_factor_enabled FROM users WHERE email = ?').get(email) as any;

    if (!user || !user.password) {
      // Return false to avoid leaking whether user exists
      return NextResponse.json({ requires2FA: false });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Return false to avoid leaking whether user exists
      return NextResponse.json({ requires2FA: false });
    }

    // Password is valid, return whether 2FA is enabled
    return NextResponse.json({
      requires2FA: user.two_factor_enabled === 1,
    });
  } catch (error) {
    console.error('Check 2FA error:', error);
    return NextResponse.json({ error: 'Failed to check 2FA status' }, { status: 500 });
  }
}
