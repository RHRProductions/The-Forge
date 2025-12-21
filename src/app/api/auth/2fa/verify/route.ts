import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';
import {
  verifyToken,
  encryptSecret,
  hashBackupCodes,
} from '../../../../../../lib/security/totp-manager';
import { rateLimiter, getClientIp } from '../../../../../../lib/security/rate-limiter';
import { logAudit } from '../../../../../../lib/security/audit-logger';

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

    // Apply rate limiting: 5 verification attempts per 15 minutes
    const rateLimitKey = `2fa-verify:${userId}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      const blockedMinutes = rateLimit.blockedUntil
        ? Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000)
        : 0;

      await logAudit({
        action: '2fa_verify_rate_limit',
        resourceType: '2fa',
        details: { message: `Rate limit exceeded - blocked for ${blockedMinutes} minutes` },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        severity: 'warning',
      });

      return NextResponse.json(
        {
          error: `Too many verification attempts. Please try again in ${blockedMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    const { secret, token, backupCodes } = await request.json();

    // Validate input
    if (!secret || !token || !backupCodes || !Array.isArray(backupCodes)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the TOTP token
    const isValid = verifyToken(secret, token);

    if (!isValid) {
      await logAudit({
        action: '2fa_verify_failed',
        resourceType: '2fa',
        details: { message: 'Invalid TOTP token provided' },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        severity: 'warning',
      });

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Encrypt the secret for database storage
    const encryptedSecret = encryptSecret(secret);

    // Hash the backup codes for secure storage
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Save to database
    const db = getDatabase();
    db.prepare(`
      UPDATE users
      SET two_factor_enabled = 1,
          two_factor_secret = ?,
          backup_codes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(encryptedSecret, JSON.stringify(hashedBackupCodes), userId);

    // Log successful 2FA enablement
    await logAudit({
      action: '2fa_enabled',
      resourceType: '2fa',
      details: { message: 'Two-factor authentication enabled successfully' },
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      severity: 'info',
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to enable two-factor authentication' },
      { status: 500 }
    );
  }
}
