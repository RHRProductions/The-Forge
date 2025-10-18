import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/analytics/email - Get email campaign analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Overall email stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT s.id) as total_sent,
        COUNT(DISTINCT CASE WHEN s.delivered_at IS NOT NULL THEN s.id END) as total_delivered,
        COUNT(DISTINCT CASE WHEN s.opened_at IS NOT NULL THEN s.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN s.clicked_at IS NOT NULL THEN s.id END) as total_clicked,
        COUNT(DISTINCT CASE WHEN s.bounced = 1 THEN s.id END) as total_bounced,
        COUNT(DISTINCT u.id) as total_unsubscribed
      FROM email_campaigns c
      LEFT JOIN email_sends s ON c.id = s.campaign_id
      LEFT JOIN email_unsubscribes u ON s.email_address = u.email
      WHERE c.status = 'sent'
    `).get() as any;

    // Calculate rates
    const deliveryRate = overallStats.total_sent > 0
      ? (overallStats.total_delivered / overallStats.total_sent * 100).toFixed(2)
      : '0.00';

    const openRate = overallStats.total_delivered > 0
      ? (overallStats.total_opened / overallStats.total_delivered * 100).toFixed(2)
      : '0.00';

    const clickRate = overallStats.total_delivered > 0
      ? (overallStats.total_clicked / overallStats.total_delivered * 100).toFixed(2)
      : '0.00';

    const bounceRate = overallStats.total_sent > 0
      ? (overallStats.total_bounced / overallStats.total_sent * 100).toFixed(2)
      : '0.00';

    const unsubscribeRate = overallStats.total_delivered > 0
      ? (overallStats.total_unsubscribed / overallStats.total_delivered * 100).toFixed(2)
      : '0.00';

    // Campaign breakdown
    const campaignStats = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.subject_line,
        c.sent_at,
        COUNT(DISTINCT s.id) as sent,
        COUNT(DISTINCT CASE WHEN s.delivered_at IS NOT NULL THEN s.id END) as delivered,
        COUNT(DISTINCT CASE WHEN s.opened_at IS NOT NULL THEN s.id END) as opened,
        COUNT(DISTINCT CASE WHEN s.clicked_at IS NOT NULL THEN s.id END) as clicked,
        COUNT(DISTINCT CASE WHEN s.bounced = 1 THEN s.id END) as bounced
      FROM email_campaigns c
      LEFT JOIN email_sends s ON c.id = s.campaign_id
      WHERE c.status = 'sent'
      GROUP BY c.id
      ORDER BY c.sent_at DESC
    `).all() as any[];

    // Add calculated rates to each campaign
    const campaignsWithRates = campaignStats.map(campaign => ({
      ...campaign,
      delivery_rate: campaign.sent > 0
        ? ((campaign.delivered / campaign.sent) * 100).toFixed(2)
        : '0.00',
      open_rate: campaign.delivered > 0
        ? ((campaign.opened / campaign.delivered) * 100).toFixed(2)
        : '0.00',
      click_rate: campaign.delivered > 0
        ? ((campaign.clicked / campaign.delivered) * 100).toFixed(2)
        : '0.00',
      bounce_rate: campaign.sent > 0
        ? ((campaign.bounced / campaign.sent) * 100).toFixed(2)
        : '0.00',
    }));

    // Recent email events
    const recentEvents = db.prepare(`
      SELECT
        e.event_type,
        e.created_at,
        s.email_address,
        c.name as campaign_name
      FROM email_events e
      JOIN email_sends s ON e.email_send_id = s.id
      JOIN email_campaigns c ON s.campaign_id = c.id
      ORDER BY e.created_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json({
      overall: {
        ...overallStats,
        delivery_rate: deliveryRate,
        open_rate: openRate,
        click_rate: clickRate,
        bounce_rate: bounceRate,
        unsubscribe_rate: unsubscribeRate,
      },
      campaigns: campaignsWithRates,
      recentEvents,
    });
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
