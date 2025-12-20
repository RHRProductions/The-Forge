import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import bcrypt from 'bcryptjs';
import { rateLimiter, getClientIp, RateLimitPresets } from '../../../../../lib/security/rate-limiter';
import { validatePassword } from '../../../../../lib/security/password-validator';
import { createAuditLog } from '../../../../../lib/security/audit-logger';

// Admin reset code - change this to a secure code of your choice
// For production, consider using environment variables
const ADMIN_RESET_CODE = 'FORGE2025RESET';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const { email, resetCode, newPassword } = await request.json();

    // Apply rate limiting: 3 attempts per hour
    const rateLimitKey = `password-reset:${clientIp}:${email || 'unknown'}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RateLimitPresets.PASSWORD_RESET.maxAttempts,
      RateLimitPresets.PASSWORD_RESET.windowMs,
      RateLimitPresets.PASSWORD_RESET.blockDurationMs
    );

    if (!rateLimit.allowed) {
      const blockedMinutes = rateLimit.blockedUntil
        ? Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000)
        : 0;

      // Log suspicious activity
      await createAuditLog({
        action: 'password_reset_rate_limit',
        userId: null,
        userEmail: email || null,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        resourceType: 'password_reset',
        resourceId: email,
        details: `Rate limit exceeded - blocked for ${blockedMinutes} minutes`,
        severity: 'warning',
      });

      return NextResponse.json(
        {
          error: `Too many password reset attempts. Please try again in ${blockedMinutes} minutes.`,
          blockedUntil: rateLimit.blockedUntil
        },
        { status: 429 }
      );
    }

    // Validate inputs
    if (!email || !resetCode || !newPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify reset code
    if (resetCode !== ADMIN_RESET_CODE) {
      // Log failed reset attempt
      await createAuditLog({
        action: 'password_reset_failed',
        userId: null,
        userEmail: email,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        resourceType: 'password_reset',
        resourceId: email,
        details: 'Invalid reset code provided',
        severity: 'warning',
      });

      return NextResponse.json(
        { error: 'Invalid reset code' },
        { status: 401 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        },
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

    // Reset rate limit on successful password reset
    rateLimiter.reset(rateLimitKey);

    // Log successful password reset
    await createAuditLog({
      action: 'password_reset_success',
      userId: user.id,
      userEmail: user.email,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      resourceType: 'user',
      resourceId: user.id.toString(),
      details: `Password reset successfully for ${user.email}`,
      severity: 'info',
    });

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
