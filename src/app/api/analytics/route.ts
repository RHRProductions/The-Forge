import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

// GET /api/analytics - Get analytics data for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    // Get time period filter from query params
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';

    let dateFilter = '';
    let daysBack = 30;

    if (period === 'week') {
      daysBack = 7;
      dateFilter = `AND datetime(la.created_at) >= datetime('now', '-7 days')`;
    } else if (period === 'month') {
      daysBack = 30;
      dateFilter = `AND datetime(la.created_at) >= datetime('now', '-30 days')`;
    }

    // Get personal metrics
    const personalMetrics = db.prepare(`
      SELECT
        COUNT(CASE WHEN la.activity_type = 'call' THEN 1 END) as totalCalls,
        COUNT(CASE WHEN la.activity_type = 'call' AND la.outcome = 'contact' THEN 1 END) as totalContacts,
        COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome = 'scheduled' THEN 1 END) as totalAppointments,
        COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome IN ('completed', 'showed', 'seen') THEN 1 END) as appointmentsSeen,
        COUNT(DISTINCT lp.id) as totalSales,
        COALESCE(SUM(lp.premium_amount), 0) as totalRevenue
      FROM lead_activities la
      LEFT JOIN lead_policies lp ON la.lead_id = lp.lead_id AND lp.status = 'active'
      WHERE la.created_by_user_id = ? ${dateFilter}
    `).get(userId) as any;

    const totalCalls = personalMetrics?.totalCalls || 0;
    const totalContacts = personalMetrics?.totalContacts || 0;
    const totalAppointments = personalMetrics?.totalAppointments || 0;
    const appointmentsSeen = personalMetrics?.appointmentsSeen || 0;
    const totalSales = personalMetrics?.totalSales || 0;
    const totalRevenue = personalMetrics?.totalRevenue || 0;

    // Get sales from seen appointments (first visit conversions)
    const firstVisitSales = db.prepare(`
      SELECT COUNT(DISTINCT lp.lead_id) as count
      FROM lead_policies lp
      WHERE lp.status = 'active'
        AND lp.lead_id IN (
          SELECT DISTINCT la.lead_id
          FROM lead_activities la
          WHERE la.created_by_user_id = ?
            AND la.activity_type = 'appointment'
            AND la.outcome IN ('completed', 'showed', 'seen')
            ${dateFilter}
        )
    `).get(userId) as any;

    const salesFromSeenAppointments = firstVisitSales?.count || 0;

    const contactRate = totalCalls > 0 ? (totalContacts / totalCalls) * 100 : 0;
    const appointmentRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;
    const saleRate = totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0;
    const avgDialsPerContact = totalContacts > 0 ? totalCalls / totalContacts : 0;
    const avgContactsPerAppointment = totalAppointments > 0 ? totalContacts / totalAppointments : 0;
    const avgDialsPerSale = totalSales > 0 ? totalCalls / totalSales : 0;
    const showRate = totalAppointments > 0 ? (appointmentsSeen / totalAppointments) * 100 : 0;
    const firstVisitCloseRate = appointmentsSeen > 0 ? (salesFromSeenAppointments / appointmentsSeen) * 100 : 0;

    const personal = {
      totalCalls,
      totalContacts,
      totalAppointments,
      appointmentsSeen,
      totalSales,
      salesFromSeenAppointments,
      totalRevenue,
      contactRate,
      appointmentRate,
      saleRate,
      avgDialsPerContact,
      avgContactsPerAppointment,
      avgDialsPerSale,
      showRate,
      firstVisitCloseRate,
    };

    // Get team metrics (for agents and admins - to see their setters)
    let team = null;
    if (userRole === 'agent' || userRole === 'admin') {
      const teamMembers = db.prepare(`
        SELECT id, name
        FROM users
        WHERE agent_id = ?
      `).all(userId) as any[];

      team = teamMembers.map(member => {
        const memberMetrics = db.prepare(`
          SELECT
            COUNT(CASE WHEN la.activity_type = 'call' THEN 1 END) as totalCalls,
            COUNT(CASE WHEN la.activity_type = 'call' AND la.outcome = 'contact' THEN 1 END) as totalContacts,
            COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome = 'scheduled' THEN 1 END) as totalAppointments,
            COUNT(DISTINCT lp.id) as totalSales,
            COALESCE(SUM(lp.premium_amount), 0) as totalRevenue
          FROM lead_activities la
          LEFT JOIN lead_policies lp ON la.lead_id = lp.lead_id AND lp.status = 'active'
          WHERE la.created_by_user_id = ? ${dateFilter}
        `).get(member.id) as any;

        return {
          userId: member.id,
          userName: member.name,
          totalCalls: memberMetrics?.totalCalls || 0,
          totalContacts: memberMetrics?.totalContacts || 0,
          totalAppointments: memberMetrics?.totalAppointments || 0,
          totalSales: memberMetrics?.totalSales || 0,
          totalRevenue: memberMetrics?.totalRevenue || 0,
        };
      });
    }

    // Get aggregate platform insights (admin only)
    let aggregateInsights = null;
    if (userRole === 'admin') {
      // Best performing times of day (hour of day analysis)
      const timeOfDayData = db.prepare(`
        SELECT
          CAST(strftime('%H', la.created_at) AS INTEGER) as hour,
          COUNT(CASE WHEN la.activity_type = 'call' THEN 1 END) as calls,
          COUNT(CASE WHEN la.activity_type = 'call' AND la.outcome = 'contact' THEN 1 END) as contacts,
          COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome = 'scheduled' THEN 1 END) as appointments
        FROM lead_activities la
        WHERE 1=1 ${dateFilter.replace('la.created_at', 'la.created_at')}
        GROUP BY hour
        ORDER BY hour
      `).all() as any[];

      // Lead source performance
      const sourcePerformance = db.prepare(`
        SELECT
          l.source,
          COUNT(DISTINCT l.id) as totalLeads,
          COUNT(DISTINCT CASE WHEN la.outcome = 'contact' THEN l.id END) as contacted,
          COUNT(DISTINCT CASE WHEN la.outcome = 'scheduled' THEN l.id END) as appointments,
          COUNT(DISTINCT lp.lead_id) as sales,
          AVG(l.cost_per_lead) as avgCost,
          COALESCE(SUM(lp.premium_amount), 0) as totalRevenue
        FROM leads l
        LEFT JOIN lead_activities la ON l.id = la.lead_id
        LEFT JOIN lead_policies lp ON l.id = lp.lead_id AND lp.status = 'active'
        WHERE l.source IS NOT NULL AND l.source != '' ${dateFilter.replace('la.created_at', 'l.created_at')}
        GROUP BY l.source
        ORDER BY totalLeads DESC
      `).all() as any[];

      // Geographic performance (by state)
      const geoPerformance = db.prepare(`
        SELECT
          l.state,
          COUNT(DISTINCT l.id) as totalLeads,
          COUNT(DISTINCT CASE WHEN la.outcome = 'contact' THEN l.id END) as contacted,
          COUNT(DISTINCT CASE WHEN la.outcome = 'scheduled' THEN l.id END) as appointments,
          COUNT(DISTINCT lp.lead_id) as sales
        FROM leads l
        LEFT JOIN lead_activities la ON l.id = la.lead_id
        LEFT JOIN lead_policies lp ON l.id = lp.lead_id AND lp.status = 'active'
        WHERE l.state IS NOT NULL AND l.state != '' ${dateFilter.replace('la.created_at', 'l.created_at')}
        GROUP BY l.state
        HAVING totalLeads >= 5
        ORDER BY sales DESC, contacted DESC
        LIMIT 10
      `).all() as any[];

      // Dialing patterns - attempts to contact analysis
      const dialingPatterns = db.prepare(`
        SELECT
          l.contact_attempt_count as attempts,
          COUNT(DISTINCT l.id) as leads,
          COUNT(DISTINCT CASE WHEN la.outcome = 'contact' THEN l.id END) as contacted,
          COUNT(DISTINCT CASE WHEN la.outcome = 'scheduled' THEN l.id END) as appointments
        FROM leads l
        LEFT JOIN lead_activities la ON l.id = la.lead_id
        WHERE l.contact_attempt_count > 0 ${dateFilter.replace('la.created_at', 'l.created_at')}
        GROUP BY attempts
        ORDER BY attempts
        LIMIT 15
      `).all() as any[];

      // Day of week performance
      const dayOfWeekData = db.prepare(`
        SELECT
          CAST(strftime('%w', la.created_at) AS INTEGER) as dayOfWeek,
          COUNT(CASE WHEN la.activity_type = 'call' THEN 1 END) as calls,
          COUNT(CASE WHEN la.activity_type = 'call' AND la.outcome = 'contact' THEN 1 END) as contacts,
          COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome = 'scheduled' THEN 1 END) as appointments
        FROM lead_activities la
        WHERE 1=1 ${dateFilter.replace('la.created_at', 'la.created_at')}
        GROUP BY dayOfWeek
        ORDER BY dayOfWeek
      `).all() as any[];

      // Lead temperature conversion rates
      const temperaturePerformance = db.prepare(`
        SELECT
          l.lead_temperature,
          COUNT(DISTINCT l.id) as totalLeads,
          COUNT(DISTINCT CASE WHEN la.outcome = 'scheduled' THEN l.id END) as appointments,
          COUNT(DISTINCT lp.lead_id) as sales
        FROM leads l
        LEFT JOIN lead_activities la ON l.id = la.lead_id
        LEFT JOIN lead_policies lp ON l.id = lp.lead_id AND lp.status = 'active'
        WHERE l.lead_temperature IS NOT NULL ${dateFilter.replace('la.created_at', 'l.created_at')}
        GROUP BY l.lead_temperature
      `).all() as any[];

      aggregateInsights = {
        timeOfDay: timeOfDayData,
        sourcePerformance,
        geoPerformance,
        dialingPatterns,
        dayOfWeek: dayOfWeekData,
        temperaturePerformance,
      };
    }

    // Get time series data for daily activity chart
    const timeSeriesData = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const dayMetrics = db.prepare(`
        SELECT
          COUNT(CASE WHEN la.activity_type = 'call' THEN 1 END) as calls,
          COUNT(CASE WHEN la.activity_type = 'call' AND la.outcome = 'contact' THEN 1 END) as contacts,
          COUNT(CASE WHEN la.activity_type = 'appointment' AND la.outcome = 'scheduled' THEN 1 END) as appointments,
          COUNT(DISTINCT lp.id) as sales
        FROM lead_activities la
        LEFT JOIN lead_policies lp ON la.lead_id = lp.lead_id AND lp.status = 'active' AND date(lp.created_at) = date('now', '-' || ? || ' days')
        WHERE la.created_by_user_id = ?
          AND date(la.created_at) = date('now', '-' || ? || ' days')
      `).get(i, userId, i) as any;

      const date = new Date();
      date.setDate(date.getDate() - i);

      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        calls: dayMetrics?.calls || 0,
        contacts: dayMetrics?.contacts || 0,
        appointments: dayMetrics?.appointments || 0,
        sales: dayMetrics?.sales || 0,
      });
    }

    return NextResponse.json({
      personal,
      team,
      timeSeriesData,
      aggregateInsights,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
