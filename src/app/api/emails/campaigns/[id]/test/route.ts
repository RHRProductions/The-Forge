import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { getDatabase } from '../../../../../../../lib/database/connection';
import { sendEmail, addUnsubscribeLink } from '../../../../../../../lib/email/sendgrid';

// POST /api/emails/campaigns/[id]/test - Send test email to logged-in user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'No email address found for user' }, { status: 400 });
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

    try {
      // Add unsubscribe link to email (with test indicator)
      const unsubscribeUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(userEmail)}&test=true`;
      const emailHtml = addUnsubscribeLink(campaign.body_html, unsubscribeUrl);

      // Add test indicator banner at top of email
      const testBanner = `
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <h3 style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold;">
            🧪 TEST EMAIL
          </h3>
          <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
            This is a test email. Prospects will not see this banner.
          </p>
        </div>
      `;

      const emailWithTestBanner = testBanner + emailHtml;

      // Send test email
      const result = await sendEmail({
        to: userEmail,
        from: {
          email: campaign.from_email,
          name: campaign.from_name,
        },
        replyTo: campaign.reply_to_email || campaign.from_email,
        subject: `[TEST] ${campaign.subject_line}`,
        html: emailWithTestBanner,
        text: campaign.body_text,
        customArgs: {
          campaign_id: campaignId.toString(),
          test_email: 'true',
        },
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Test email sent to ${userEmail}`,
          messageId: result.messageId,
        });
      } else {
        return NextResponse.json(
          { error: `Failed to send test email: ${result.error}` },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      return NextResponse.json(
        { error: `Error sending test email: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
