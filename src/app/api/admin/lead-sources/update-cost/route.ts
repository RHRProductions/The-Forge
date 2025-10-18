import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';

// POST /api/admin/lead-sources/update-cost - Update cost for all leads from a source
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { source, cost } = await request.json();

    if (!source || cost === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getDatabase();

    // Update all leads with this source
    const result = db.prepare(`
      UPDATE leads
      SET cost_per_lead = ?
      WHERE source = ?
    `).run(cost, source);

    return NextResponse.json({
      success: true,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error updating lead cost:', error);
    return NextResponse.json(
      { error: 'Failed to update lead cost' },
      { status: 500 }
    );
  }
}
