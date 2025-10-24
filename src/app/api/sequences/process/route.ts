import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { sendEmail } from '../../../../../lib/email/sendgrid';
import {
  buildPersonalizationData,
  personalizeContent,
  generateBookingLink,
  generateLivestreamLink,
  generateUnsubscribeLink
} from '../../../../../lib/email/personalization';

/**
 * POST /api/sequences/process
 *
 * Processes all active sequence enrollments and sends due emails
 * This should be called by a cron job every hour or on-demand
 *
 * Security: This should be protected by a cron secret or API key in production
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get all active enrollments
    const activeEnrollments = db.prepare(`
      SELECT
        e.id as enrollment_id,
        e.sequence_id,
        e.lead_id,
        e.current_step,
        e.enrolled_at,
        e.last_email_sent_at,
        s.name as sequence_name,
        l.id as lead_id,
        l.first_name,
        l.last_name,
        l.email,
        l.age,
        l.city,
        l.state,
        l.owner_id
      FROM email_sequence_enrollments e
      JOIN email_sequences s ON e.sequence_id = s.id
      JOIN leads l ON e.lead_id = l.id
      WHERE e.status = 'active'
        AND s.is_active = 1
        AND l.email IS NOT NULL
        AND l.email != ''
    `).all() as any[];

    console.log(`Found ${activeEnrollments.length} active enrollments to process`);

    const results = {
      processed: 0,
      sent: 0,
      stopped: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const enrollment of activeEnrollments) {
      try {
        results.processed++;

        // Check if email is unsubscribed
        const isUnsubscribed = db.prepare(`
          SELECT id FROM email_unsubscribes WHERE email = ?
        `).get(enrollment.email);

        if (isUnsubscribed) {
          // Stop the enrollment
          db.prepare(`
            UPDATE email_sequence_enrollments
            SET status = 'stopped',
                stopped_at = CURRENT_TIMESTAMP,
                stop_reason = 'unsubscribed'
            WHERE id = ?
          `).run(enrollment.enrollment_id);
          results.stopped++;
          continue;
        }

        // Check if lead has bounced
        const hasBounced = db.prepare(`
          SELECT id FROM email_sends
          WHERE email_address = ? AND bounced = 1
          LIMIT 1
        `).get(enrollment.email);

        if (hasBounced) {
          // Stop the enrollment
          db.prepare(`
            UPDATE email_sequence_enrollments
            SET status = 'stopped',
                stopped_at = CURRENT_TIMESTAMP,
                stop_reason = 'bounced'
            WHERE id = ?
          `).run(enrollment.enrollment_id);
          results.stopped++;
          continue;
        }

        // Check if lead has converted (booked or registered)
        const hasConverted = db.prepare(`
          SELECT id FROM email_sequence_sends
          WHERE enrollment_id = ? AND converted = 1
          LIMIT 1
        `).get(enrollment.enrollment_id);

        if (hasConverted) {
          // Mark as completed
          db.prepare(`
            UPDATE email_sequence_enrollments
            SET status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                stop_reason = 'converted'
            WHERE id = ?
          `).run(enrollment.enrollment_id);
          results.stopped++;
          continue;
        }

        // Get the next step to send
        const nextStepOrder = enrollment.current_step + 1;

        const nextStep = db.prepare(`
          SELECT * FROM email_sequence_steps
          WHERE sequence_id = ? AND step_order = ? AND is_active = 1
        `).get(enrollment.sequence_id, nextStepOrder) as any;

        if (!nextStep) {
          // No more steps - mark sequence as completed
          db.prepare(`
            UPDATE email_sequence_enrollments
            SET status = 'completed',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(enrollment.enrollment_id);
          results.stopped++;
          continue;
        }

        // Calculate if email is due to be sent
        const enrolledDate = new Date(enrollment.enrolled_at);
        const lastSentDate = enrollment.last_email_sent_at
          ? new Date(enrollment.last_email_sent_at)
          : enrolledDate;

        const delayMs = (nextStep.delay_days * 24 * 60 * 60 * 1000) +
                       (nextStep.delay_hours * 60 * 60 * 1000);

        const dueDate = new Date(lastSentDate.getTime() + delayMs);
        const now = new Date();

        console.log(`[DEBUG] Lead ${enrollment.lead_id} - Step ${nextStepOrder}`);
        console.log(`  Enrolled: ${enrolledDate.toISOString()}`);
        console.log(`  Last sent: ${lastSentDate.toISOString()}`);
        console.log(`  Delay: ${nextStep.delay_days} days, ${nextStep.delay_hours} hours`);
        console.log(`  Due date: ${dueDate.toISOString()}`);
        console.log(`  Now: ${now.toISOString()}`);
        console.log(`  Is due? ${now >= dueDate}`);

        if (now < dueDate) {
          // Not due yet
          console.log(`  SKIPPED: Not due yet`);
          results.skipped++;
          continue;
        }

        // Get agent info
        const agent = db.prepare(`
          SELECT name, email FROM users WHERE id = ?
        `).get(enrollment.owner_id || 1) as any;

        if (!agent) {
          console.error(`No agent found for lead ${enrollment.lead_id}`);
          results.skipped++;
          continue;
        }

        // Get next livestream for the link
        const nextSeminar = db.prepare(`
          SELECT id FROM seminars
          WHERE event_date >= date('now')
          ORDER BY event_date ASC
          LIMIT 1
        `).get() as any;

        const livestreamLink = nextSeminar
          ? generateLivestreamLink(enrollment.lead_id, nextSeminar.id, baseUrl)
          : `${baseUrl}/livestreams`;

        // Build personalization data
        const personalizationData = buildPersonalizationData(
          {
            id: enrollment.lead_id,
            first_name: enrollment.first_name,
            last_name: enrollment.last_name,
            email: enrollment.email,
            age: enrollment.age,
            city: enrollment.city,
            state: enrollment.state
          } as any,
          {
            name: agent.name,
            email: agent.email,
            phone: '' // TODO: Add phone to users table
          },
          {
            bookingLink: generateBookingLink(enrollment.lead_id, baseUrl),
            livestreamLink: livestreamLink,
            unsubscribeLink: generateUnsubscribeLink(enrollment.email, baseUrl)
          }
        );

        // Personalize subject and body
        const personalizedSubject = personalizeContent(
          nextStep.subject_line,
          personalizationData
        );

        const personalizedBodyHtml = personalizeContent(
          nextStep.body_html,
          personalizationData
        );

        const personalizedBodyText = personalizeContent(
          nextStep.body_text || '',
          personalizationData
        );

        // Send the email
        const sendResult = await sendEmail({
          to: enrollment.email,
          from: {
            email: nextStep.from_email,
            name: nextStep.from_name
          },
          replyTo: nextStep.reply_to_email,
          subject: personalizedSubject,
          html: personalizedBodyHtml,
          text: personalizedBodyText,
          customArgs: {
            sequence_id: enrollment.sequence_id.toString(),
            enrollment_id: enrollment.enrollment_id.toString(),
            step_id: nextStep.id.toString(),
            lead_id: enrollment.lead_id.toString()
          }
        });

        if (sendResult.success) {
          // Record the send
          db.prepare(`
            INSERT INTO email_sequence_sends (
              enrollment_id,
              step_id,
              lead_id,
              email_address,
              sent_at,
              sendgrid_message_id
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          `).run(
            enrollment.enrollment_id,
            nextStep.id,
            enrollment.lead_id,
            enrollment.email,
            sendResult.messageId || ''
          );

          // Update enrollment
          db.prepare(`
            UPDATE email_sequence_enrollments
            SET current_step = ?,
                last_email_sent_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(nextStepOrder, enrollment.enrollment_id);

          results.sent++;
          console.log(`Sent step ${nextStepOrder} to ${enrollment.email} (${enrollment.first_name} ${enrollment.last_name})`);
        } else {
          results.errors.push(`Failed to send to ${enrollment.email}: ${sendResult.error}`);
        }

      } catch (error) {
        console.error(`Error processing enrollment ${enrollment.enrollment_id}:`, error);
        results.errors.push(
          `Enrollment ${enrollment.enrollment_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      message: 'Sequence processing complete',
      results
    });

  } catch (error) {
    console.error('Error processing sequences:', error);
    return NextResponse.json(
      {
        error: 'Failed to process sequences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sequences/process
 * Trigger sequence processing manually (for testing)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
