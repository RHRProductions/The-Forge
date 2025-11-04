import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';
import { sendEmail, addUnsubscribeLink } from '../../../../../../lib/email/sendgrid';

// Generate seminar invitation email HTML
function generateSeminarEmail(seminar: any, registrationLink: string): string {
  const eventDate = new Date(`${seminar.event_date}T${seminar.event_time}`);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const [hours, minutes] = seminar.event_time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const formattedTime = `${displayHour}:${minutes} ${ampm}`;

  const timezone = seminar.timezone.split('/')[1].replace('_', ' ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                You're Invited! 🎥
              </h1>
              <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 14px;">
                FREE Medicare Educational Seminar
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold; text-align: center;">
                ${seminar.title}
              </h2>

              ${seminar.description ? `
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${seminar.description}
              </p>
              ` : ''}

              <!-- Event Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #dc2626; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">
                      <strong>📅 Date:</strong> ${formattedDate}
                    </p>
                    <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">
                      <strong>🕐 Time:</strong> ${formattedTime} ${timezone}
                    </p>
                    <p style="margin: 0 0 0 0; color: #1f2937; font-size: 16px;">
                      <strong>⏱️ Duration:</strong> ${seminar.duration_minutes} minutes
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What You'll Learn -->
              <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                What You'll Learn:
              </h3>
              <ul style="margin: 0 0 30px 20px; padding: 0; color: #4b5563; font-size: 15px; line-height: 1.8;">
                <li>Understanding Medicare Parts A, B, C, and D</li>
                <li>When and how to enroll</li>
                <li>Avoiding costly penalties</li>
                <li>Choosing the right plan for your needs</li>
                <li>Q&A session with Medicare experts</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${registrationLink}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                      Reserve My Spot Now →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <p style="margin: 30px 0 0 0; padding: 15px; background-color: #fef3c7; border-radius: 6px; color: #92400e; font-size: 14px; text-align: center;">
                <strong>📌 Note:</strong> This seminar is completely FREE and there's no obligation to purchase anything.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Questions? Reply to this email or call us at your convenience.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: bold;">
                Right Hand Retirement
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// POST /api/seminars/[id]/send-invitations - Send seminar invitations to Medicare leads
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const seminarId = parseInt(id);
    const db = getDatabase();

    // Get seminar details
    const seminar = db.prepare(`
      SELECT * FROM seminars WHERE id = ?
    `).get(seminarId) as any;

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Get Medicare leads with valid emails who haven't been invited yet
    const leads = db.prepare(`
      SELECT l.id, l.email, l.first_name, l.last_name
      FROM leads l
      LEFT JOIN seminar_invitations si ON l.id = si.lead_id AND si.seminar_id = ?
      WHERE l.email IS NOT NULL
        AND l.email != ''
        AND (l.lead_type = 'medicare' OR l.lead_type = 't65')
        AND si.id IS NULL
      ORDER BY l.id
    `).all(seminarId) as any[];

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No uninvited Medicare leads found' }, { status: 400 });
    }

    // Check for unsubscribed emails
    const unsubscribedEmails = new Set(
      (db.prepare('SELECT email FROM email_unsubscribes').all() as any[]).map(u => u.email.toLowerCase())
    );

    // Check for bounced emails (emails that have bounced in the past)
    const bouncedEmails = new Set(
      (db.prepare(`
        SELECT DISTINCT email_address
        FROM email_sends
        WHERE bounced = 1
      `).all() as any[]).map(b => b.email_address.toLowerCase())
    );

    // Filter out unsubscribed and bounced leads
    const recipientLeads = leads.filter(
      lead => !unsubscribedEmails.has(lead.email.toLowerCase()) && !bouncedEmails.has(lead.email.toLowerCase())
    );

    if (recipientLeads.length === 0) {
      return NextResponse.json({ error: 'All Medicare leads have unsubscribed or have bounced emails' }, { status: 400 });
    }

    // Create email campaign for tracking
    const userId = (session.user as any).id;
    const campaignResult = db.prepare(`
      INSERT INTO email_campaigns (
        name, subject_line, body_html, from_name, from_email, reply_to_email,
        status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
    `).run(
      `${seminar.title} - Invitations`,
      `You're Invited: ${seminar.title}`,
      'Seminar invitation email',
      'Right Hand Retirement',
      'marcanthony@righthandretirement.com',
      'marcanthony@righthandretirement.com',
      userId
    );

    const campaignId = campaignResult.lastInsertRowid as number;

    // Send emails and track results
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const lead of recipientLeads) {
      try {
        // Generate registration link
        const registrationLink = seminar.meeting_link;

        // Generate email HTML
        const emailHtml = generateSeminarEmail(seminar, registrationLink);

        // Add unsubscribe link
        const unsubscribeUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(lead.email)}&lead=${lead.id}`;
        const finalEmailHtml = addUnsubscribeLink(emailHtml, unsubscribeUrl);

        // Send email
        const result = await sendEmail({
          to: lead.email,
          from: {
            email: 'marcanthony@righthandretirement.com',
            name: 'Right Hand Retirement',
          },
          replyTo: 'marcanthony@righthandretirement.com',
          subject: `You're Invited: ${seminar.title}`,
          html: finalEmailHtml,
          customArgs: {
            campaign_id: campaignId.toString(),
            lead_id: lead.id.toString(),
            seminar_id: seminarId.toString(),
          },
        });

        if (result.success) {
          // Record successful send in email_sends table
          db.prepare(`
            INSERT INTO email_sends (
              campaign_id, lead_id, email_address, sent_at, sendgrid_message_id
            ) VALUES (?, ?, ?, datetime('now'), ?)
          `).run(campaignId, lead.id, lead.email, result.messageId || null);

          // Record invitation in seminar_invitations table
          db.prepare(`
            INSERT INTO seminar_invitations (
              seminar_id, lead_id, email_campaign_id, invited_at
            ) VALUES (?, ?, ?, datetime('now'))
          `).run(seminarId, lead.id, campaignId);

          successCount++;
        } else {
          // Record failed send
          db.prepare(`
            INSERT INTO email_sends (
              campaign_id, lead_id, email_address, bounced, bounce_reason
            ) VALUES (?, ?, ?, 1, ?)
          `).run(campaignId, lead.id, lead.email, result.error || 'Unknown error');

          failureCount++;
          errors.push(`${lead.email}: ${result.error}`);
        }
      } catch (error: any) {
        failureCount++;
        errors.push(`${lead.email}: ${error.message}`);
        console.error(`Error sending to ${lead.email}:`, error);
      }
    }

    // Update campaign sent_at
    db.prepare(`
      UPDATE email_campaigns
      SET sent_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(campaignId);

    return NextResponse.json({
      success: true,
      totalRecipients: recipientLeads.length,
      successCount,
      failureCount,
      campaignId,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}
