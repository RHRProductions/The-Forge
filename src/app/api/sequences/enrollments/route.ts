import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

/**
 * GET /api/sequences/enrollments
 *
 * Gets enrollments by lead_id
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json(
        { error: 'lead_id parameter is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get enrollments for this lead
    const enrollments = db.prepare(`
      SELECT
        e.*,
        s.name as sequence_name,
        l.email as lead_email,
        l.first_name,
        l.last_name
      FROM email_sequence_enrollments e
      JOIN email_sequences s ON e.sequence_id = s.id
      JOIN leads l ON e.lead_id = l.id
      WHERE e.lead_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(parseInt(leadId));

    return NextResponse.json({
      enrollments
    });

  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
