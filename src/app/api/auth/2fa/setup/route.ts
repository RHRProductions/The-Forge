import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { generateSecret, generateQRCode, generateBackupCodes } from '../../../../../../lib/security/totp-manager';
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

    // Apply rate limiting: 10 setup attempts per hour
    const rateLimitKey = `2fa-setup:${userId}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 10, 60 * 60 * 1000, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      const blockedMinutes = rateLimit.blockedUntil
        ? Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000)
        : 0;

      await logAudit({
        action: '2fa_setup_rate_limit',
        resourceType: '2fa',
        details: { message: `Rate limit exceeded - blocked for ${blockedMinutes} minutes` },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        severity: 'warning',
      });

      return NextResponse.json(
        {
          error: `Too many 2FA setup attempts. Please try again in ${blockedMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    // Generate new TOTP secret
    const secret = generateSecret();

    // Generate QR code for authenticator app
    const qrCodeDataUrl = await generateQRCode(secret, userEmail);

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Log setup initiation
    await logAudit({
      action: '2fa_setup_initiated',
      resourceType: '2fa',
      details: { message: '2FA setup process started' },
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      severity: 'info',
    });

    // Return secret, QR code, and backup codes
    // Note: This doesn't save to database yet - that happens in verify endpoint
    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize 2FA setup' },
      { status: 500 }
    );
  }
}
