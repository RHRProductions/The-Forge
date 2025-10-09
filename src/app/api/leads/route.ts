import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { Lead } from '../../../../types/lead';
import { auth } from '../../../../auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let leads;
    let totalCount;

    if (userRole === 'admin') {
      // Get total count
      const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as any;
      totalCount = countResult.count;

      // Get paginated leads
      leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    } else if (userRole === 'agent') {
      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as count FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = ? OR u.agent_id = ?
      `).get(userId, userId) as any;
      totalCount = countResult.count;

      // Get paginated leads
      leads = db.prepare(`
        SELECT l.* FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = ? OR u.agent_id = ?
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, userId, limit, offset);
    } else {
      // Setters see their agent's full lead list
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;

      if (user?.agent_id) {
        // Get total count
        const countResult = db.prepare(`
          SELECT COUNT(DISTINCT l.id) as count FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
        `).get(user.agent_id, user.agent_id) as any;
        totalCount = countResult.count;

        // Get paginated leads
        leads = db.prepare(`
          SELECT l.* FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
          ORDER BY l.created_at DESC
          LIMIT ? OFFSET ?
        `).all(user.agent_id, user.agent_id, limit, offset);
      } else {
        // Get total count
        const countResult = db.prepare('SELECT COUNT(*) as count FROM leads WHERE owner_id = ?').get(userId) as any;
        totalCount = countResult.count;

        // Get paginated leads
        leads = db.prepare('SELECT * FROM leads WHERE owner_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset);
      }
    }

    // Get total cost from ALL leads (not just current page)
    let totalCostResult;
    if (userRole === 'admin') {
      totalCostResult = db.prepare('SELECT SUM(cost_per_lead) as totalCost FROM leads').get() as any;
    } else if (userRole === 'agent') {
      totalCostResult = db.prepare(`
        SELECT SUM(l.cost_per_lead) as totalCost FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = ? OR u.agent_id = ?
      `).get(userId, userId) as any;
    } else {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        totalCostResult = db.prepare(`
          SELECT SUM(l.cost_per_lead) as totalCost FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
        `).get(user.agent_id, user.agent_id) as any;
      } else {
        totalCostResult = db.prepare('SELECT SUM(cost_per_lead) as totalCost FROM leads WHERE owner_id = ?').get(userId) as any;
      }
    }

    // Get all warm/hot leads for follow-up reminders (regardless of pagination)
    let followUpLeads;
    if (userRole === 'admin') {
      followUpLeads = db.prepare(`
        SELECT * FROM leads
        WHERE (lead_temperature = 'warm' OR lead_temperature = 'hot') AND next_follow_up IS NOT NULL
        ORDER BY next_follow_up ASC
      `).all();
    } else if (userRole === 'agent') {
      followUpLeads = db.prepare(`
        SELECT l.* FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE (l.owner_id = ? OR u.agent_id = ?)
          AND (l.lead_temperature = 'warm' OR l.lead_temperature = 'hot')
          AND l.next_follow_up IS NOT NULL
        ORDER BY l.next_follow_up ASC
      `).all(userId, userId);
    } else {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        followUpLeads = db.prepare(`
          SELECT l.* FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE (l.owner_id = ? OR u.agent_id = ?)
            AND (l.lead_temperature = 'warm' OR l.lead_temperature = 'hot')
            AND l.next_follow_up IS NOT NULL
          ORDER BY l.next_follow_up ASC
        `).all(user.agent_id, user.agent_id);
      } else {
        followUpLeads = db.prepare(`
          SELECT * FROM leads
          WHERE owner_id = ?
            AND (lead_temperature = 'warm' OR lead_temperature = 'hot')
            AND next_follow_up IS NOT NULL
          ORDER BY next_follow_up ASC
        `).all(userId);
      }
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      },
      stats: {
        totalCost: totalCostResult?.totalCost || 0
      },
      followUpLeads: followUpLeads || []
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lead: Omit<Lead, 'id'> = await request.json();
    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    const result = db.prepare(
      `INSERT INTO leads (
        first_name, last_name, email, phone, phone_2, company,
        address, city, state, zip_code, date_of_birth, age, gender,
        marital_status, occupation, income, household_size, status,
        contact_method, lead_type, cost_per_lead, sales_amount, notes, source,
        lead_score, last_contact_date, next_follow_up, owner_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.phone,
      lead.phone_2 || '',
      lead.company || '',
      lead.address || '',
      lead.city || '',
      lead.state || '',
      lead.zip_code || '',
      lead.date_of_birth || '',
      lead.age || null,
      lead.gender || '',
      lead.marital_status || '',
      lead.occupation || '',
      lead.income || '',
      lead.household_size || null,
      lead.status,
      lead.contact_method || '',
      lead.lead_type || 'other',
      lead.cost_per_lead,
      lead.sales_amount,
      lead.notes || '',
      lead.source,
      lead.lead_score || 0,
      lead.last_contact_date || '',
      lead.next_follow_up || '',
      userId
    );

    const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}