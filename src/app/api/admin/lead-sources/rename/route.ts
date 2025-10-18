import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';

// POST /api/admin/lead-sources/rename - Rename a lead source
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldName, newName } = await request.json();

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getDatabase();

    // Update all leads with this source
    const result = db.prepare(`
      UPDATE leads
      SET source = ?
      WHERE source = ?
    `).run(newName, oldName);

    return NextResponse.json({
      success: true,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error renaming lead source:', error);
    return NextResponse.json(
      { error: 'Failed to rename lead source' },
      { status: 500 }
    );
  }
}
