/**
 * Rate Limiter - Prevents brute force attacks
 * Tracks attempts by IP address and/or identifier (email, user ID, etc.)
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired records every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier (IP, email, etc.)
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @param blockDurationMs - How long to block after exceeding limit
   * @returns {allowed: boolean, remaining: number, resetAt: number}
   */
  check(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    blockDurationMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remaining: number; resetAt: number; blockedUntil?: number } {
    const now = Date.now();
    const record = this.records.get(key);

    // Check if currently blocked
    if (record?.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
        blockedUntil: record.blockedUntil,
      };
    }

    // No record or window expired - start fresh
    if (!record || record.resetAt <= now) {
      this.records.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + windowMs,
      };
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > maxAttempts) {
      record.blockedUntil = now + blockDurationMs;
      this.records.set(key, record);
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
        blockedUntil: record.blockedUntil,
      };
    }

    // Still within limit
    this.records.set(key, record);
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific key (e.g., after successful login)
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.resetAt <= now && (!record.blockedUntil || record.blockedUntil <= now)) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Get current status for a key without incrementing
   */
  getStatus(key: string): { blocked: boolean; remaining: number; resetAt?: number } {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      return { blocked: false, remaining: 5 };
    }

    if (record.blockedUntil && record.blockedUntil > now) {
      return { blocked: true, remaining: 0, resetAt: record.blockedUntil };
    }

    if (record.resetAt <= now) {
      return { blocked: false, remaining: 5 };
    }

    return { blocked: false, remaining: Math.max(0, 5 - record.count) };
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to get client IP from request
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // Fallback - in local dev this will be undefined
  return 'unknown';
}

// Preset configurations
export const RateLimitPresets = {
  // Login attempts: 5 attempts per 15 minutes, block for 15 minutes
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  },
  // API calls: 100 requests per minute
  API: {
    maxAttempts: 100,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  },
  // Data exports: 10 per hour
  EXPORT: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
  },
  // Password reset: 3 attempts per hour
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
  },
};
