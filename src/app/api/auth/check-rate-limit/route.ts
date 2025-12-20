import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, getClientIp, RateLimitPresets } from '../../../../../lib/security/rate-limiter';

/**
 * Check rate limit before login attempt
 * This is called from the login page before submitting credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Get client IP
    const ip = getClientIp(request);

    // Check rate limit for both IP and email
    const ipKey = `login:ip:${ip}`;
    const emailKey = `login:email:${email.toLowerCase()}`;

    const ipLimit = rateLimiter.check(
      ipKey,
      RateLimitPresets.LOGIN.maxAttempts,
      RateLimitPresets.LOGIN.windowMs,
      RateLimitPresets.LOGIN.blockDurationMs
    );

    const emailLimit = rateLimiter.check(
      emailKey,
      RateLimitPresets.LOGIN.maxAttempts,
      RateLimitPresets.LOGIN.windowMs,
      RateLimitPresets.LOGIN.blockDurationMs
    );

    // If either is blocked, deny
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const blockedUntil = ipLimit.blockedUntil || emailLimit.blockedUntil;
      const minutesRemaining = blockedUntil
        ? Math.ceil((blockedUntil - Date.now()) / 60000)
        : 15;

      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: `Too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          blockedUntil,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Return remaining attempts
    const remaining = Math.min(ipLimit.remaining, emailLimit.remaining);

    return NextResponse.json({
      allowed: true,
      remaining,
      resetAt: Math.max(ipLimit.resetAt, emailLimit.resetAt),
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Reset rate limit after successful login
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const ip = getClientIp(request);

    // Reset both IP and email rate limits on successful login
    rateLimiter.reset(`login:ip:${ip}`);
    rateLimiter.reset(`login:email:${email.toLowerCase()}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rate limit reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
