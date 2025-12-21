import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';
import { logAudit } from '../../../../../../lib/security/audit-logger';
import { getClientIp } from '../../../../../../lib/security/rate-limiter';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const userEmail = (session.user as any).email;

    const { password } = await request.json();

    // Validate password is provided
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to disable 2FA' },
        { status: 400 }
      );
    }

    // Get user from database to verify password
    const db = getDatabase();
    const user = db.prepare('SELECT password, two_factor_enabled FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if 2FA is actually enabled
    if (!user.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await logAudit({
        action: '2fa_disable_failed',
        resourceType: '2fa',
        details: { message: 'Invalid password provided when attempting to disable 2FA' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        severity: 'warning',
      });

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Disable 2FA and clear secrets
    db.prepare(`
      UPDATE users
      SET two_factor_enabled = 0,
          two_factor_secret = NULL,
          backup_codes = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(userId);

    // Log successful 2FA disablement
    await logAudit({
      action: '2fa_disabled',
      resourceType: '2fa',
      details: { message: 'Two-factor authentication disabled' },
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      severity: 'info',
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}
