import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

interface Insight {
  type: 'power_hour' | 'top_source' | 'stale_warning' | 'lead_velocity' | 'best_day' | 'negative_roi';
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
  icon: string;
  data?: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    // Get timeframe from query (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const insights: Insight[] = [];

    // Build WHERE clause based on role
    let whereClause = '';
    let params: any[] = [startDate.toISOString()];

    if (userRole === 'admin') {
      whereClause = 'WHERE la.created_at >= ?';
    } else if (userRole === 'agent') {
      whereClause = 'WHERE la.created_at >= ? AND (l.owner_id = ? OR u.agent_id = ?)';
      params.push(userId, userId);
    } else {
      // Setter - see their agent's data
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        whereClause = 'WHERE la.created_at >= ? AND (l.owner_id = ? OR u.agent_id = ?)';
        params.push(user.agent_id, user.agent_id);
      } else {
        whereClause = 'WHERE la.created_at >= ? AND l.owner_id = ?';
        params.push(userId);
      }
    }

    // 1. BEST TIME TO CALL ANALYSIS
    const hourlyStats = db.prepare(`
      SELECT
        CAST(strftime('%H', la.created_at) AS INTEGER) as hour,
        COUNT(*) as total_activities,
        SUM(CASE WHEN la.outcome = 'contact' OR la.outcome = 'appointment' THEN 1 ELSE 0 END) as contacts,
        SUM(CASE WHEN la.outcome = 'appointment' THEN 1 ELSE 0 END) as appointments
      FROM lead_activities la
      JOIN leads l ON la.lead_id = l.id
      LEFT JOIN users u ON l.owner_id = u.id
      ${whereClause}
      AND la.activity_type = 'call'
      GROUP BY hour
      HAVING total_activities >= 10
      ORDER BY (CAST(contacts AS REAL) / total_activities) DESC
      LIMIT 1
    `).get(...params) as any;

    if (hourlyStats) {
      const contactRate = ((hourlyStats.contacts / hourlyStats.total_activities) * 100).toFixed(1);
      const hour = hourlyStats.hour;
      const timeStr = `${hour}:00-${hour + 1}:00`;
      const isPowerHour = new Date().getHours() >= hour && new Date().getHours() < hour + 1;

      insights.push({
        type: 'power_hour',
        priority: isPowerHour ? 'high' : 'medium',
        title: isPowerHour ? '🔥 POWER HOUR ACTIVE NOW!' : `⏰ Best Time to Call: ${timeStr}`,
        detail: `${contactRate}% contact rate during this window (${hourlyStats.contacts} contacts from ${hourlyStats.total_activities} calls)`,
        action: isPowerHour ? 'Make calls now for maximum results!' : `Schedule your calling sessions for ${timeStr}`,
        icon: '⏰',
        data: { hour, contactRate, isPowerHour }
      });
    }

    // 2. BEST DAY OF WEEK ANALYSIS
    const dayStats = db.prepare(`
      SELECT
        CASE CAST(strftime('%w', la.created_at) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        CAST(strftime('%w', la.created_at) AS INTEGER) as day_num,
        COUNT(*) as total_activities,
        SUM(CASE WHEN la.outcome = 'contact' OR la.outcome = 'appointment' THEN 1 ELSE 0 END) as contacts
      FROM lead_activities la
      JOIN leads l ON la.lead_id = l.id
      LEFT JOIN users u ON l.owner_id = u.id
      ${whereClause}
      AND la.activity_type = 'call'
      GROUP BY day_num
      HAVING total_activities >= 20
      ORDER BY (CAST(contacts AS REAL) / total_activities) DESC
      LIMIT 1
    `).get(...params) as any;

    if (dayStats) {
      const contactRate = ((dayStats.contacts / dayStats.total_activities) * 100).toFixed(1);
      const today = new Date().getDay();
      const isBestDay = today === dayStats.day_num;

      insights.push({
        type: 'best_day',
        priority: isBestDay ? 'high' : 'low',
        title: isBestDay ? `🎯 Today is your best day!` : `📅 Best Day: ${dayStats.day_name}`,
        detail: `${contactRate}% contact rate on ${dayStats.day_name}s (${dayStats.contacts} contacts from ${dayStats.total_activities} calls)`,
        action: isBestDay ? 'Focus on high-volume calling today!' : `Plan your heaviest calling for ${dayStats.day_name}s`,
        icon: '📅',
        data: { dayName: dayStats.day_name, contactRate, isBestDay }
      });
    }

    // 3. SOURCE PERFORMANCE COMPARISON
    // Build params for source query
    let sourceParams = [startDate.toISOString()];
    if (userRole === 'agent') {
      sourceParams.push(startDate.toISOString(), userId, userId);
    } else if (userRole !== 'admin') {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        sourceParams.push(startDate.toISOString(), user.agent_id, user.agent_id);
      } else {
        sourceParams.push(startDate.toISOString(), userId);
      }
    } else {
      sourceParams.push(startDate.toISOString());
    }

    // Build source-specific WHERE clause
    let sourceWhereClause = '';
    if (userRole === 'agent') {
      sourceWhereClause = 'WHERE l.created_at >= ? AND (l.owner_id = ? OR u.agent_id = ?)';
    } else if (userRole !== 'admin') {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        sourceWhereClause = 'WHERE l.created_at >= ? AND (l.owner_id = ? OR u.agent_id = ?)';
      } else {
        sourceWhereClause = 'WHERE l.created_at >= ? AND l.owner_id = ?';
      }
    } else {
      sourceWhereClause = 'WHERE l.created_at >= ?';
    }

    const sourceStats = db.prepare(`
      SELECT
        l.source,
        COUNT(DISTINCT l.id) as lead_count,
        SUM(l.cost_per_lead) as total_cost,
        SUM(CASE WHEN lp.id IS NOT NULL THEN lp.commission_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN la.outcome = 'contact' OR la.outcome = 'appointment' THEN 1 ELSE 0 END) as contacts,
        COUNT(la.id) as total_calls,
        SUM(CASE WHEN la.outcome = 'appointment' THEN 1 ELSE 0 END) as appointments
      FROM leads l
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN lead_activities la ON l.id = la.lead_id AND la.activity_type = 'call' AND la.created_at >= ?
      LEFT JOIN lead_policies lp ON l.id = lp.lead_id
      ${sourceWhereClause}
      GROUP BY l.source
      HAVING lead_count >= 10
      ORDER BY (total_revenue - total_cost) DESC
    `).all(...sourceParams) as any[];

    if (sourceStats && sourceStats.length > 0) {
      // Top performing source
      const topSource = sourceStats[0];
      const roi = topSource.total_cost > 0
        ? (((topSource.total_revenue - topSource.total_cost) / topSource.total_cost) * 100).toFixed(0)
        : '0';
      const contactRate = topSource.total_calls > 0
        ? ((topSource.contacts / topSource.total_calls) * 100).toFixed(1)
        : '0';

      if (topSource.total_revenue > topSource.total_cost) {
        insights.push({
          type: 'top_source',
          priority: 'medium',
          title: `💎 Best Source: ${topSource.source}`,
          detail: `${roi}% ROI, ${contactRate}% contact rate (${topSource.appointments} appointments from ${topSource.lead_count} leads)`,
          action: 'Consider increasing investment in this source',
          icon: '💎',
          data: { source: topSource.source, roi, contactRate }
        });
      }

      // Negative ROI sources
      const negativeSource = sourceStats.find(s => s.total_revenue < s.total_cost && s.total_cost > 0);
      if (negativeSource) {
        const loss = negativeSource.total_cost - negativeSource.total_revenue;
        const roi = (((negativeSource.total_revenue - negativeSource.total_cost) / negativeSource.total_cost) * 100).toFixed(0);

        insights.push({
          type: 'negative_roi',
          priority: 'high',
          title: `⚠️ Losing Money: ${negativeSource.source}`,
          detail: `${roi}% ROI (lost $${loss.toFixed(2)} on ${negativeSource.lead_count} leads)`,
          action: 'Stop buying from this source or negotiate better pricing',
          icon: '⚠️',
          data: { source: negativeSource.source, roi, loss }
        });
      }
    }

    // 4. STALE LEAD WARNING
    const staleLeads = db.prepare(`
      SELECT COUNT(*) as count
      FROM leads l
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE (l.lead_temperature = 'warm' OR l.lead_temperature = 'hot')
      AND (l.last_contact_date IS NULL OR l.last_contact_date < date('now', '-7 days'))
      ${userRole === 'admin' ? '' : userRole === 'agent' ? 'AND (l.owner_id = ? OR u.agent_id = ?)' : 'AND l.owner_id = ?'}
    `).get(...(userRole === 'admin' ? [] : userRole === 'agent' ? [userId, userId] : [userId])) as any;

    if (staleLeads && staleLeads.count > 0) {
      insights.push({
        type: 'stale_warning',
        priority: staleLeads.count >= 10 ? 'high' : 'medium',
        title: `🚨 ${staleLeads.count} Warm/Hot Leads Going Stale`,
        detail: `These leads haven't been contacted in 7+ days and may be cooling off`,
        action: 'Follow up today to re-engage before they go cold',
        icon: '🚨',
        data: { count: staleLeads.count }
      });
    }

    // Note: Lead velocity insight removed - not relevant for CSV imported leads

    // Sort insights by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Check if we have enough data to generate insights
    const hasEnoughData = insights.length > 0;

    return NextResponse.json({
      insights,
      timeframe: `Last ${days} days`,
      generatedAt: new Date().toISOString(),
      hasEnoughData
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({
      error: 'Failed to generate insights',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
