import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { logAuditFromRequest, AuditPresets } from '../../../../../lib/security/audit-logger';
import { auth } from '../../../../../auth';
import { rateLimiter, getClientIp } from '../../../../../lib/security/rate-limiter';

export async function DELETE(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk delete
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Apply rate limiting: 5 bulk delete operations per hour
    const rateLimitKey = `bulk-delete:${clientIp}:${(session.user as any).id}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 5, 60 * 60 * 1000, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      const blockedMinutes = rateLimit.blockedUntil
        ? Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000)
        : 0;

      return NextResponse.json(
        {
          error: `Too many bulk delete operations. Please try again in ${blockedMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    const db = getDatabase();

    // Check if request has a body with specific lead IDs
    let deletedCount = 0;
    let leadIds: number[] = [];

    try {
      const body = await request.json();

      if (body.leadIds && Array.isArray(body.leadIds) && body.leadIds.length > 0) {
        // Delete specific leads
        leadIds = body.leadIds;
        const placeholders = body.leadIds.map(() => '?').join(',');
        const stmt = db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`);
        const result = stmt.run(...body.leadIds);
        deletedCount = result.changes;
      } else {
        // Delete all leads if no specific IDs provided
        const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
        deletedCount = countResult.count;
        // Get all lead IDs before deleting
        const allLeadIds = db.prepare('SELECT id FROM leads').all() as { id: number }[];
        leadIds = allLeadIds.map(l => l.id);
        db.prepare('DELETE FROM leads').run();
      }
    } catch (jsonError) {
      // If no body or invalid JSON, delete all leads
      const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
      deletedCount = countResult.count;
      // Get all lead IDs before deleting
      const allLeadIds = db.prepare('SELECT id FROM leads').all() as { id: number }[];
      leadIds = allLeadIds.map(l => l.id);
      db.prepare('DELETE FROM leads').run();
    }

    // AUDIT LOG: Critical operation - bulk delete
    await logAuditFromRequest(request, AuditPresets.bulkDeleteLeads(deletedCount, leadIds));

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} leads`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting leads:', error);
    return NextResponse.json(
      { error: 'Failed to delete leads' },
      { status: 500 }
    );
  }
}