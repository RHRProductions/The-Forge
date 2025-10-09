import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get all leads with source = 'csv_upload', grouped by date
    const batches = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM leads
      WHERE source = 'csv_upload'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
    `).all() as Array<{ date: string; count: number }>;

    // For each batch, get 5 sample leads
    const batchesWithSamples = batches.map(batch => {
      const sampleLeads = db.prepare(`
        SELECT id, first_name, last_name, city, state, lead_type
        FROM leads
        WHERE source = 'csv_upload' AND DATE(created_at) = ?
        LIMIT 5
      `).all(batch.date);

      return {
        ...batch,
        sampleLeads
      };
    });

    return NextResponse.json(batchesWithSamples);
  } catch (error) {
    console.error('Error fetching lead batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead batches' },
      { status: 500 }
    );
  }
}
