import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { auth } from '../../../../../../auth';

/**
 * POST /api/sequences/[id]/enroll
 * Enroll one or multiple leads into an email sequence
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const sequenceId = parseInt(params.id);
    const body = await request.json();

    const { lead_ids } = body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'lead_ids array is required' },
        { status: 400 }
      );
    }

    // Verify sequence exists and is active
    const sequence = db.prepare(`
      SELECT id, is_active FROM email_sequences WHERE id = ?
    `).get(sequenceId) as any;

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    if (!sequence.is_active) {
      return NextResponse.json(
        { error: 'Cannot enroll leads in inactive sequence' },
        { status: 400 }
      );
    }

    // Get all leads to enroll
    const leads = db.prepare(`
      SELECT id, email, first_name, last_name
      FROM leads
      WHERE id IN (${lead_ids.map(() => '?').join(',')})
    `).all(...lead_ids) as any[];

    const results = {
      enrolled: [] as number[],
      skipped: [] as { leadId: number; reason: string }[],
      failed: [] as { leadId: number; error: string }[]
    };

    for (const lead of leads) {
      try {
        // Check if lead has a valid email
        if (!lead.email || lead.email.trim() === '') {
          results.skipped.push({
            leadId: lead.id,
            reason: 'No email address'
          });
          continue;
        }

        // Check if lead is unsubscribed
        const isUnsubscribed = db.prepare(`
          SELECT id FROM email_unsubscribes WHERE email = ?
        `).get(lead.email);

        if (isUnsubscribed) {
          results.skipped.push({
            leadId: lead.id,
            reason: 'Email is unsubscribed'
          });
          continue;
        }

        // Check if lead is already enrolled
        const existingEnrollment = db.prepare(`
          SELECT id, status FROM email_sequence_enrollments
          WHERE sequence_id = ? AND lead_id = ?
        `).get(sequenceId, lead.id) as any;

        if (existingEnrollment) {
          if (existingEnrollment.status === 'active') {
            results.skipped.push({
              leadId: lead.id,
              reason: 'Already enrolled in this sequence'
            });
            continue;
          } else {
            // Re-activate if previously stopped/completed
            db.prepare(`
              UPDATE email_sequence_enrollments
              SET status = 'active',
                  current_step = 0,
                  enrolled_at = CURRENT_TIMESTAMP,
                  completed_at = NULL,
                  stopped_at = NULL,
                  stop_reason = NULL
              WHERE id = ?
            `).run(existingEnrollment.id);

            results.enrolled.push(lead.id);
            continue;
          }
        }

        // Enroll the lead
        db.prepare(`
          INSERT INTO email_sequence_enrollments (
            sequence_id,
            lead_id,
            current_step,
            status,
            enrolled_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          sequenceId,
          lead.id,
          0, // Start at step 0 (will send step 1 first)
          'active'
        );

        results.enrolled.push(lead.id);

      } catch (error) {
        console.error(`Error enrolling lead ${lead.id}:`, error);
        results.failed.push({
          leadId: lead.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Enrolled ${results.enrolled.length} lead(s) in sequence`,
      results
    });

  } catch (error) {
    console.error('Error enrolling leads:', error);
    return NextResponse.json(
      { error: 'Failed to enroll leads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sequences/[id]/enroll
 * Get all enrollments for a sequence
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const sequenceId = parseInt(params.id);

    const enrollments = db.prepare(`
      SELECT
        e.*,
        l.first_name,
        l.last_name,
        l.email,
        l.city,
        l.state,
        COUNT(DISTINCT sends.id) as emails_sent,
        COUNT(DISTINCT CASE WHEN sends.opened_at IS NOT NULL THEN sends.id END) as emails_opened,
        COUNT(DISTINCT CASE WHEN sends.clicked_at IS NOT NULL THEN sends.id END) as emails_clicked,
        MAX(CASE WHEN sends.converted = 1 THEN sends.conversion_type END) as conversion_type
      FROM email_sequence_enrollments e
      JOIN leads l ON e.lead_id = l.id
      LEFT JOIN email_sequence_sends sends ON e.id = sends.enrollment_id
      WHERE e.sequence_id = ?
      GROUP BY e.id
      ORDER BY e.enrolled_at DESC
    `).all(sequenceId);

    return NextResponse.json({ enrollments });

  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
