import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { logAuditFromRequest, AuditPresets } from '../../../../../lib/security/audit-logger';

export async function DELETE(request: NextRequest) {
  try {
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