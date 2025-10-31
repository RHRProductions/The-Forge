import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';
import { sendEmail } from '../../../../../lib/email/sendgrid';

/**
 * POST /api/sequences/send-step
 *
 * Sends a specific step in a sequence to a specific enrollment (for testing)
 * Body: { enrollmentId: number, stepOrder: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, stepOrder } = body;

    if (!enrollmentId || !stepOrder) {
      return NextResponse.json(
        { error: 'enrollmentId and stepOrder are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get the enrollment with lead and sequence info
    const enrollment = db.prepare(`
      SELECT
        e.*,
        l.email as lead_email,
        l.first_name,
        l.last_name,
        s.name as sequence_name
      FROM email_sequence_enrollments e
      JOIN leads l ON e.lead_id = l.id
      JOIN email_sequences s ON e.sequence_id = s.id
      WHERE e.id = ?
    `).get(enrollmentId) as any;

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Get the specific step
    const step = db.prepare(`
      SELECT * FROM email_sequence_steps
      WHERE sequence_id = ? AND step_order = ?
    `).get(enrollment.sequence_id, stepOrder) as any;

    if (!step) {
      return NextResponse.json(
        { error: `Step ${stepOrder} not found in sequence` },
        { status: 404 }
      );
    }

    // Check if lead is unsubscribed
    const unsubscribeRecord = db.prepare(
      'SELECT id FROM email_unsubscribes WHERE email = ?'
    ).get(enrollment.lead_email);

    if (unsubscribeRecord) {
      return NextResponse.json(
        { error: 'Lead is unsubscribed' },
        { status: 400 }
      );
    }

    // Check if email has bounced (skip if table doesn't exist)
    try {
      const bounceRecord = db.prepare(
        'SELECT id FROM email_bounces WHERE email = ? AND is_permanent = 1'
      ).get(enrollment.lead_email);

      if (bounceRecord) {
        return NextResponse.json(
          { error: 'Lead email has bounced' },
          { status: 400 }
        );
      }
    } catch (err) {
      // email_bounces table doesn't exist yet, skip check
    }

    // Get lead details for personalization
    const lead = db.prepare(`
      SELECT * FROM leads WHERE id = ?
    `).get(enrollment.lead_id) as any;

    // Personalize the email content
    const personalizedSubject = step.subject_line
      .replace(/\{first_name\}/g, enrollment.first_name || 'there')
      .replace(/\{last_name\}/g, enrollment.last_name || '');

    const personalizedBodyHtml = step.body_html
      .replace(/\{first_name\}/g, enrollment.first_name || 'there')
      .replace(/\{last_name\}/g, enrollment.last_name || '')
      .replace(/\{city\}/g, lead?.city || 'your area')
      .replace(/\{state\}/g, lead?.state || '')
      .replace(/\{age\}/g, lead?.age?.toString() || '')
      .replace(/\{agent_name\}/g, step.from_name || 'Marc Anthony')
      .replace(/\{agent_phone\}/g, '720-447-4966')
      .replace(/\{booking_link\}/g, `https://righthandretirement.com/book?lead=${enrollment.lead_id}`)
      .replace(/\{livestream_link\}/g, 'https://righthandretirement.com/livestream')
      .replace(/\{unsubscribe_link\}/g, `https://righthandretirement.com/unsubscribe?email=${encodeURIComponent(enrollment.lead_email)}`);

    const personalizedBodyText = step.body_text
      .replace(/\{first_name\}/g, enrollment.first_name || 'there')
      .replace(/\{last_name\}/g, enrollment.last_name || '')
      .replace(/\{city\}/g, lead?.city || 'your area')
      .replace(/\{state\}/g, lead?.state || '')
      .replace(/\{age\}/g, lead?.age?.toString() || '')
      .replace(/\{agent_name\}/g, step.from_name || 'Marc Anthony')
      .replace(/\{agent_phone\}/g, '720-447-4966')
      .replace(/\{booking_link\}/g, `https://righthandretirement.com/book?lead=${enrollment.lead_id}`)
      .replace(/\{livestream_link\}/g, 'https://righthandretirement.com/livestream')
      .replace(/\{unsubscribe_link\}/g, `https://righthandretirement.com/unsubscribe?email=${encodeURIComponent(enrollment.lead_email)}`);

    // Send the email via SendGrid
    const emailSent = await sendEmail({
      to: enrollment.lead_email,
      from: {
        email: step.from_email,
        name: step.from_name
      },
      replyTo: step.reply_to_email,
      subject: personalizedSubject,
      html: personalizedBodyHtml,
      text: personalizedBodyText,
      categories: [
        'sequence',
        `sequence-${enrollment.sequence_id}`,
        `step-${step.step_order}`,
        'test-send' // Mark as test
      ],
      customArgs: {
        lead_id: enrollment.lead_id.toString(),
        enrollment_id: enrollmentId.toString(),
        sequence_id: enrollment.sequence_id.toString(),
        step_id: step.id.toString()
      }
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Record the send in email_sequence_sends table
    db.prepare(`
      INSERT INTO email_sequence_sends (
        enrollment_id,
        step_id,
        lead_id,
        email_address,
        sent_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      enrollmentId,
      step.id,
      enrollment.lead_id,
      enrollment.lead_email
    );

    // Update the enrollment
    db.prepare(`
      UPDATE email_sequence_enrollments
      SET
        current_step = ?,
        last_email_sent_at = datetime('now')
      WHERE id = ?
    `).run(stepOrder, enrollmentId);

    return NextResponse.json({
      message: `Step ${stepOrder} sent successfully`,
      enrollment: {
        id: enrollmentId,
        lead_email: enrollment.lead_email,
        current_step: stepOrder
      },
      step: {
        order: step.step_order,
        subject: personalizedSubject
      }
    });

  } catch (error) {
    console.error('Error sending step:', error);
    return NextResponse.json(
      { error: 'Failed to send step' },
      { status: 500 }
    );
  }
}
