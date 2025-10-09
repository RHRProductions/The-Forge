import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, source } = await request.json();

    if (!date || !source) {
      return NextResponse.json(
        { error: 'Date and source are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Update all leads from this date with the new source
    const result = db.prepare(`
      UPDATE leads
      SET source = ?, updated_at = CURRENT_TIMESTAMP
      WHERE source = 'csv_upload' AND DATE(created_at) = ?
    `).run(source, date);

    return NextResponse.json({
      success: true,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error updating lead sources:', error);
    return NextResponse.json(
      { error: 'Failed to update lead sources' },
      { status: 500 }
    );
  }
}
