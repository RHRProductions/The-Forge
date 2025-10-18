import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';

// POST /api/webhooks/sendgrid - Handle SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    const events = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getDatabase();
    let processedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        await processWebhookEvent(db, event);
        processedCount++;
      } catch (error) {
        console.error('Error processing webhook event:', event, error);
        errorCount++;
      }
    }

    console.log(`Processed ${processedCount} webhook events, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount
    });
  } catch (error) {
    console.error('Error processing SendGrid webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Process individual webhook event
async function processWebhookEvent(db: any, event: any) {
  const {
    event: eventType,
    email,
    timestamp,
    sg_message_id,
    campaign_id,
    lead_id,
    seminar_id,
    url,
    reason,
    ip,
    useragent
  } = event;

  // Extract custom args from SendGrid event
  const customArgs = event.customArgs || {};
  const extractedCampaignId = customArgs.campaign_id || campaign_id;
  const extractedLeadId = customArgs.lead_id || lead_id;
  const extractedSeminarId = customArgs.seminar_id || seminar_id;

  console.log(`Processing ${eventType} event for ${email}`, {
    campaign_id: extractedCampaignId,
    lead_id: extractedLeadId,
    seminar_id: extractedSeminarId
  });

  // Find the email send record
  const emailSend = db.prepare(`
    SELECT id, campaign_id, lead_id
    FROM email_sends
    WHERE email_address = ?
      AND (sendgrid_message_id = ? OR campaign_id = ?)
    ORDER BY sent_at DESC
    LIMIT 1
  `).get(email, sg_message_id, extractedCampaignId);

  if (!emailSend && !extractedCampaignId) {
    console.log('Email send record not found, skipping event');
    return;
  }

  const emailSendId = emailSend?.id;
  const campaignId = emailSend?.campaign_id || extractedCampaignId;
  const leadId = emailSend?.lead_id || extractedLeadId;

  // Process different event types
  switch (eventType) {
    case 'delivered':
      if (emailSendId) {
        db.prepare(`
          UPDATE email_sends
          SET delivered_at = datetime(?, 'unixepoch')
          WHERE id = ?
        `).run(timestamp, emailSendId);
      }
      break;

    case 'open':
      if (emailSendId) {
        // Update email_sends table
        db.prepare(`
          UPDATE email_sends
          SET opened_at = COALESCE(opened_at, datetime(?, 'unixepoch'))
          WHERE id = ?
        `).run(timestamp, emailSendId);

        // Record event
        db.prepare(`
          INSERT INTO email_events (
            email_send_id, event_type, event_data, user_agent, ip_address, created_at
          ) VALUES (?, 'open', ?, ?, ?, datetime(?, 'unixepoch'))
        `).run(emailSendId, JSON.stringify(event), useragent, ip, timestamp);

        // Update seminar invitation if applicable
        if (extractedSeminarId && leadId) {
          db.prepare(`
            UPDATE seminar_invitations
            SET email_opened = 1
            WHERE seminar_id = ? AND lead_id = ?
          `).run(extractedSeminarId, leadId);
        }
      }
      break;

    case 'click':
      if (emailSendId) {
        // Update email_sends table
        db.prepare(`
          UPDATE email_sends
          SET clicked_at = COALESCE(clicked_at, datetime(?, 'unixepoch'))
          WHERE id = ?
        `).run(timestamp, emailSendId);

        // Record event with URL
        db.prepare(`
          INSERT INTO email_events (
            email_send_id, event_type, event_data, user_agent, ip_address, created_at
          ) VALUES (?, 'click', ?, ?, ?, datetime(?, 'unixepoch'))
        `).run(emailSendId, JSON.stringify({ ...event, url }), useragent, ip, timestamp);

        // Update seminar invitation if applicable
        if (extractedSeminarId && leadId) {
          db.prepare(`
            UPDATE seminar_invitations
            SET link_clicked = 1
            WHERE seminar_id = ? AND lead_id = ?
          `).run(extractedSeminarId, leadId);

          // Auto-register if they clicked the meeting link
          const seminar = db.prepare('SELECT meeting_link FROM seminars WHERE id = ?').get(extractedSeminarId);
          if (seminar && url && url.includes(seminar.meeting_link.split('?')[0])) {
            // Mark as registered and create registration record
            const invitation = db.prepare(`
              SELECT id FROM seminar_invitations
              WHERE seminar_id = ? AND lead_id = ?
            `).get(extractedSeminarId, leadId);

            if (invitation) {
              db.prepare(`
                UPDATE seminar_invitations
                SET registered = 1, registered_at = datetime(?, 'unixepoch')
                WHERE id = ?
              `).run(timestamp, invitation.id);

              // Create registration record if it doesn't exist
              const existingReg = db.prepare(`
                SELECT id FROM seminar_registrations
                WHERE seminar_id = ? AND lead_id = ?
              `).get(extractedSeminarId, leadId);

              if (!existingReg) {
                db.prepare(`
                  INSERT INTO seminar_registrations (
                    seminar_id, lead_id, invitation_id, registration_source, notes
                  ) VALUES (?, ?, ?, 'email_link_click', 'Auto-registered via email link click')
                `).run(extractedSeminarId, leadId, invitation.id);
              }
            }
          }
        }
      }
      break;

    case 'bounce':
    case 'dropped':
      if (emailSendId) {
        db.prepare(`
          UPDATE email_sends
          SET bounced = 1, bounce_reason = ?
          WHERE id = ?
        `).run(reason || eventType, emailSendId);

        // Record event
        db.prepare(`
          INSERT INTO email_events (
            email_send_id, event_type, event_data, created_at
          ) VALUES (?, ?, ?, datetime(?, 'unixepoch'))
        `).run(emailSendId, eventType, JSON.stringify(event), timestamp);
      }
      break;

    case 'unsubscribe':
    case 'spamreport':
      // Add to unsubscribe list
      const leadRecord = db.prepare('SELECT id FROM leads WHERE email = ?').get(email);

      const existingUnsub = db.prepare(`
        SELECT id FROM email_unsubscribes WHERE email = ?
      `).get(email);

      if (!existingUnsub) {
        db.prepare(`
          INSERT INTO email_unsubscribes (
            lead_id, email, reason, unsubscribed_at
          ) VALUES (?, ?, ?, datetime(?, 'unixepoch'))
        `).run(leadRecord?.id || null, email, eventType === 'spamreport' ? 'Marked as spam' : 'Unsubscribed', timestamp);
      }

      // Record event
      if (emailSendId) {
        db.prepare(`
          INSERT INTO email_events (
            email_send_id, event_type, event_data, created_at
          ) VALUES (?, ?, ?, datetime(?, 'unixepoch'))
        `).run(emailSendId, eventType, JSON.stringify(event), timestamp);
      }
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

// Allow SendGrid to verify the webhook endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'SendGrid webhook endpoint is active'
  });
}
