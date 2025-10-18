import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/analytics/seminars - Get seminar conversion funnel analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get all seminars with funnel metrics
    const seminars = db.prepare(`
      SELECT
        s.id,
        s.title,
        s.event_date,
        s.event_time,
        s.status,
        COUNT(DISTINCT si.id) as total_invited,
        COUNT(DISTINCT CASE WHEN si.email_opened = 1 THEN si.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN si.link_clicked = 1 THEN si.id END) as total_clicked,
        COUNT(DISTINCT CASE WHEN si.registered = 1 THEN si.id END) as total_registered,
        COUNT(DISTINCT CASE WHEN si.attended = 1 THEN si.id END) as total_attended,
        COUNT(DISTINCT ce.id) as total_appointments,
        COUNT(DISTINCT lp.id) as total_conversions,
        COALESCE(SUM(lp.premium_amount), 0) as total_revenue,
        COALESCE(SUM(lp.commission_amount), 0) as total_commission
      FROM seminars s
      LEFT JOIN seminar_invitations si ON s.id = si.seminar_id
      LEFT JOIN calendar_events ce ON s.id = ce.seminar_id
      LEFT JOIN lead_policies lp ON s.id = lp.seminar_id
      GROUP BY s.id
      ORDER BY s.event_date DESC
    `).all() as any[];

    // Calculate conversion rates for each seminar
    const seminarsWithRates = seminars.map(seminar => {
      const inviteToOpen = seminar.total_invited > 0
        ? ((seminar.total_opened / seminar.total_invited) * 100).toFixed(1)
        : '0.0';

      const openToClick = seminar.total_opened > 0
        ? ((seminar.total_clicked / seminar.total_opened) * 100).toFixed(1)
        : '0.0';

      const clickToRegister = seminar.total_clicked > 0
        ? ((seminar.total_registered / seminar.total_clicked) * 100).toFixed(1)
        : '0.0';

      const registerToAttend = seminar.total_registered > 0
        ? ((seminar.total_attended / seminar.total_registered) * 100).toFixed(1)
        : '0.0';

      const attendToAppt = seminar.total_attended > 0
        ? ((seminar.total_appointments / seminar.total_attended) * 100).toFixed(1)
        : '0.0';

      const apptToConversion = seminar.total_appointments > 0
        ? ((seminar.total_conversions / seminar.total_appointments) * 100).toFixed(1)
        : '0.0';

      const inviteToConversion = seminar.total_invited > 0
        ? ((seminar.total_conversions / seminar.total_invited) * 100).toFixed(1)
        : '0.0';

      return {
        ...seminar,
        rates: {
          invite_to_open: inviteToOpen,
          open_to_click: openToClick,
          click_to_register: clickToRegister,
          register_to_attend: registerToAttend,
          attend_to_appt: attendToAppt,
          appt_to_conversion: apptToConversion,
          invite_to_conversion: inviteToConversion,
        }
      };
    });

    // Overall aggregate stats
    const overallStats = {
      total_seminars: seminars.length,
      total_invited: seminars.reduce((sum, s) => sum + s.total_invited, 0),
      total_opened: seminars.reduce((sum, s) => sum + s.total_opened, 0),
      total_clicked: seminars.reduce((sum, s) => sum + s.total_clicked, 0),
      total_registered: seminars.reduce((sum, s) => sum + s.total_registered, 0),
      total_attended: seminars.reduce((sum, s) => sum + s.total_attended, 0),
      total_appointments: seminars.reduce((sum, s) => sum + s.total_appointments, 0),
      total_conversions: seminars.reduce((sum, s) => sum + s.total_conversions, 0),
      total_revenue: seminars.reduce((sum, s) => sum + s.total_revenue, 0),
      total_commission: seminars.reduce((sum, s) => sum + s.total_commission, 0),
    };

    // Calculate overall rates
    const overallRates = {
      invite_to_open: overallStats.total_invited > 0
        ? ((overallStats.total_opened / overallStats.total_invited) * 100).toFixed(1)
        : '0.0',
      open_to_click: overallStats.total_opened > 0
        ? ((overallStats.total_clicked / overallStats.total_opened) * 100).toFixed(1)
        : '0.0',
      click_to_register: overallStats.total_clicked > 0
        ? ((overallStats.total_registered / overallStats.total_clicked) * 100).toFixed(1)
        : '0.0',
      register_to_attend: overallStats.total_registered > 0
        ? ((overallStats.total_attended / overallStats.total_registered) * 100).toFixed(1)
        : '0.0',
      attend_to_appt: overallStats.total_attended > 0
        ? ((overallStats.total_appointments / overallStats.total_attended) * 100).toFixed(1)
        : '0.0',
      appt_to_conversion: overallStats.total_appointments > 0
        ? ((overallStats.total_conversions / overallStats.total_appointments) * 100).toFixed(1)
        : '0.0',
      invite_to_conversion: overallStats.total_invited > 0
        ? ((overallStats.total_conversions / overallStats.total_invited) * 100).toFixed(1)
        : '0.0',
    };

    return NextResponse.json({
      overall: {
        ...overallStats,
        rates: overallRates,
      },
      seminars: seminarsWithRates,
    });
  } catch (error) {
    console.error('Error fetching seminar analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seminar analytics' },
      { status: 500 }
    );
  }
}
