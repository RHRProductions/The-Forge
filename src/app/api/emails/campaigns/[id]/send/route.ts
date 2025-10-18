import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../../auth';
import { getDatabase } from '../../../../../../../../lib/database/connection';
import { sendEmail, addUnsubscribeLink } from '../../../../../../../../lib/email/sendgrid';

// POST /api/emails/campaigns/[id]/send - Send campaign to leads
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
    const campaignId = parseInt(id);
    const db = getDatabase();

    // Get campaign details
    const campaign = db.prepare(`
      SELECT * FROM email_campaigns WHERE id = ?
    `).get(campaignId) as any;

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 });
    }

    // Get leads to send to
    // For now, get all leads with valid emails
    // TODO: Add segment filtering based on campaign.segment_filter
    const leads = db.prepare(`
      SELECT id, email, first_name, last_name
      FROM leads
      WHERE email IS NOT NULL AND email != ''
      ORDER BY id
    `).all() as any[];

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads found to send to' }, { status: 400 });
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
      return NextResponse.json({ error: 'All leads have unsubscribed or have bounced emails' }, { status: 400 });
    }

    // Send emails and track results
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const lead of recipientLeads) {
      try {
        // Add unsubscribe link to email
        const unsubscribeUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(lead.email)}&lead=${lead.id}`;
        const emailHtml = addUnsubscribeLink(campaign.body_html, unsubscribeUrl);

        // Send email
        const result = await sendEmail({
          to: lead.email,
          from: {
            email: campaign.from_email,
            name: campaign.from_name,
          },
          replyTo: campaign.reply_to_email || campaign.from_email,
          subject: campaign.subject_line,
          html: emailHtml,
          text: campaign.body_text,
          customArgs: {
            campaign_id: campaignId.toString(),
            lead_id: lead.id.toString(),
          },
        });

        if (result.success) {
          // Record successful send
          db.prepare(`
            INSERT INTO email_sends (
              campaign_id, lead_id, email_address, sent_at, sendgrid_message_id
            ) VALUES (?, ?, ?, datetime('now'), ?)
          `).run(campaignId, lead.id, lead.email, result.messageId || null);

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

    // Update campaign status to sent
    db.prepare(`
      UPDATE email_campaigns
      SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(campaignId);

    return NextResponse.json({
      success: true,
      totalRecipients: recipientLeads.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
