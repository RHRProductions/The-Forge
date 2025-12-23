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

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Only admins and agents can bulk delete (not setters)
    if (userRole !== 'admin' && userRole !== 'agent') {
      return NextResponse.json({ error: 'Forbidden - Agent or Admin access required' }, { status: 403 });
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

        if (userRole === 'admin') {
          // Admins can delete any leads
          const stmt = db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`);
          const result = stmt.run(...body.leadIds);
          deletedCount = result.changes;
        } else {
          // Agents can only delete their own leads or their setters' leads
          const stmt = db.prepare(`
            DELETE FROM leads
            WHERE id IN (${placeholders})
            AND id IN (
              SELECT l.id FROM leads l
              LEFT JOIN users u ON l.owner_id = u.id
              WHERE l.owner_id = ? OR u.agent_id = ?
            )
          `);
          const result = stmt.run(...body.leadIds, userId, userId);
          deletedCount = result.changes;
        }
      } else {
        // Delete all leads (filtered by user role)
        if (userRole === 'admin') {
          // Admins can delete all leads in the system
          const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
          deletedCount = countResult.count;
          // Get all lead IDs before deleting
          const allLeadIds = db.prepare('SELECT id FROM leads').all() as { id: number }[];
          leadIds = allLeadIds.map(l => l.id);
          db.prepare('DELETE FROM leads').run();
        } else {
          // Agents can only delete their own leads
          const countResult = db.prepare(`
            SELECT COUNT(DISTINCT l.id) as count FROM leads l
            LEFT JOIN users u ON l.owner_id = u.id
            WHERE l.owner_id = ? OR u.agent_id = ?
          `).get(userId, userId) as { count: number };
          deletedCount = countResult.count;

          // Get lead IDs before deleting
          const allLeadIds = db.prepare(`
            SELECT DISTINCT l.id FROM leads l
            LEFT JOIN users u ON l.owner_id = u.id
            WHERE l.owner_id = ? OR u.agent_id = ?
          `).all(userId, userId) as { id: number }[];
          leadIds = allLeadIds.map(l => l.id);

          db.prepare(`
            DELETE FROM leads
            WHERE id IN (
              SELECT l.id FROM leads l
              LEFT JOIN users u ON l.owner_id = u.id
              WHERE l.owner_id = ? OR u.agent_id = ?
            )
          `).run(userId, userId);
        }
      }
    } catch (jsonError) {
      // If no body or invalid JSON, delete all leads (filtered by user role)
      if (userRole === 'admin') {
        const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
        deletedCount = countResult.count;
        // Get all lead IDs before deleting
        const allLeadIds = db.prepare('SELECT id FROM leads').all() as { id: number }[];
        leadIds = allLeadIds.map(l => l.id);
        db.prepare('DELETE FROM leads').run();
      } else {
        const countResult = db.prepare(`
          SELECT COUNT(DISTINCT l.id) as count FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
        `).get(userId, userId) as { count: number };
        deletedCount = countResult.count;

        // Get lead IDs before deleting
        const allLeadIds = db.prepare(`
          SELECT DISTINCT l.id FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
        `).all(userId, userId) as { id: number }[];
        leadIds = allLeadIds.map(l => l.id);

        db.prepare(`
          DELETE FROM leads
          WHERE id IN (
            SELECT l.id FROM leads l
            LEFT JOIN users u ON l.owner_id = u.id
            WHERE l.owner_id = ? OR u.agent_id = ?
          )
        `).run(userId, userId);
      }
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