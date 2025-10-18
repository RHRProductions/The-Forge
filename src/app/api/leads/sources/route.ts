import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/leads/sources - Get all unique lead sources
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get all unique sources that have leads
    const sources = db.prepare(`
      SELECT DISTINCT source
      FROM leads
      WHERE source IS NOT NULL AND source != ''
      ORDER BY source ASC
    `).all() as { source: string }[];

    return NextResponse.json(sources.map(s => s.source));
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead sources' },
      { status: 500 }
    );
  }
}
