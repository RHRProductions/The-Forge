import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/admin/lead-sources - Get all lead sources with stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    const sources = db.prepare(`
      SELECT
        source,
        COUNT(*) as count,
        AVG(cost_per_lead) as avg_cost
      FROM leads
      WHERE source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY count DESC
    `).all();

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead sources' },
      { status: 500 }
    );
  }
}
