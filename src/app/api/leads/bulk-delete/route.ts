import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';

export async function DELETE(request: NextRequest) {
  try {
    const db = getDatabase();

    // Check if request has a body with specific lead IDs
    let deletedCount = 0;

    try {
      const body = await request.json();

      if (body.leadIds && Array.isArray(body.leadIds) && body.leadIds.length > 0) {
        // Delete specific leads
        const placeholders = body.leadIds.map(() => '?').join(',');
        const stmt = db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`);
        const result = stmt.run(...body.leadIds);
        deletedCount = result.changes;
      } else {
        // Delete all leads if no specific IDs provided
        const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
        deletedCount = countResult.count;
        db.prepare('DELETE FROM leads').run();
      }
    } catch (jsonError) {
      // If no body or invalid JSON, delete all leads
      const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
      deletedCount = countResult.count;
      db.prepare('DELETE FROM leads').run();
    }

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