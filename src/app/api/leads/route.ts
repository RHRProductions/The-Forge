import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { Lead } from '../../../../types/lead';
import { auth } from '../../../../auth';
import { sanitizeLead } from '../../../../lib/security/input-sanitizer';

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

    // Get filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const leadType = searchParams.get('lead_type') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const zipCode = searchParams.get('zip_code') || '';
    const source = searchParams.get('source') || '';
    const temperature = searchParams.get('temperature') || '';
    const ageMin = searchParams.get('age_min') || '';
    const ageMax = searchParams.get('age_max') || '';

    // Build WHERE clause for filters
    const buildWhereClause = (baseWhere: string = '1=1') => {
      let where = baseWhere;
      const params: any[] = [];

      if (search) {
        const searchLower = search.toLowerCase();
        const searchDigits = search.replace(/\D/g, '');

        if (searchDigits.length > 0) {
          // Strip all non-numeric characters from database phone numbers for comparison
          where += ` AND (LOWER(first_name || ' ' || last_name) LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', ''), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone_2, '-', ''), '(', ''), ')', ''), ' ', '') LIKE ?)`;
          params.push(`%${searchLower}%`, `%${searchDigits}%`, `%${searchDigits}%`);
        } else {
          where += ` AND LOWER(first_name || ' ' || last_name) LIKE ?`;
          params.push(`%${searchLower}%`);
        }
      }

      if (status) {
        where += ` AND status = ?`;
        params.push(status);
      }

      if (leadType) {
        where += ` AND lead_type = ?`;
        params.push(leadType);
      }

      if (city) {
        where += ` AND LOWER(city) LIKE ?`;
        params.push(`%${city.toLowerCase()}%`);
      }

      if (state) {
        where += ` AND UPPER(state) = ?`;
        params.push(state.toUpperCase());
      }

      if (zipCode) {
        where += ` AND zip_code LIKE ?`;
        params.push(`%${zipCode}%`);
      }

      if (source) {
        where += ` AND LOWER(source) LIKE ?`;
        params.push(`%${source.toLowerCase()}%`);
      }

      if (temperature) {
        where += ` AND lead_temperature = ?`;
        params.push(temperature);
      }

      if (ageMin) {
        where += ` AND age >= ?`;
        params.push(parseInt(ageMin));
      }

      if (ageMax) {
        where += ` AND age <= ?`;
        params.push(parseInt(ageMax));
      }

      return { where, params };
    };

    let leads;
    let totalCount;
    let overallTotalCount;

    if (userRole === 'admin') {
      const { where, params } = buildWhereClause();

      // Get overall total count (without filters)
      const overallCountResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as any;
      overallTotalCount = overallCountResult.count;

      // Get total count with filters
      const countResult = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE ${where}`).get(...params) as any;
      totalCount = countResult.count;

      // Get paginated leads with filters
      leads = db.prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    } else if (userRole === 'agent') {
      const { where, params } = buildWhereClause('(l.owner_id = ? OR u.agent_id = ?)');

      // Get overall total count (without filters)
      const overallCountResult = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as count FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = ? OR u.agent_id = ?
      `).get(userId, userId) as any;
      overallTotalCount = overallCountResult.count;

      // Get total count with filters
      const countResult = db.prepare(`
        SELECT COUNT(DISTINCT l.id) as count FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE ${where}
      `).get(userId, userId, ...params) as any;
      totalCount = countResult.count;

      // Get paginated leads with filters
      leads = db.prepare(`
        SELECT l.* FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE ${where}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, userId, ...params, limit, offset);
    } else {
      // Setters see their agent's full lead list
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;

      if (user?.agent_id) {
        const { where, params } = buildWhereClause('(l.owner_id = ? OR u.agent_id = ?)');

        // Get overall total count (without filters)
        const overallCountResult = db.prepare(`
          SELECT COUNT(DISTINCT l.id) as count FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
        `).get(user.agent_id, user.agent_id) as any;
        overallTotalCount = overallCountResult.count;

        // Get total count with filters
        const countResult = db.prepare(`
          SELECT COUNT(DISTINCT l.id) as count FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE ${where}
        `).get(user.agent_id, user.agent_id, ...params) as any;
        totalCount = countResult.count;

        // Get paginated leads with filters
        leads = db.prepare(`
          SELECT l.* FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE ${where}
          ORDER BY l.created_at DESC
          LIMIT ? OFFSET ?
        `).all(user.agent_id, user.agent_id, ...params, limit, offset);
      } else {
        const { where, params } = buildWhereClause('owner_id = ?');

        // Get overall total count (without filters)
        const overallCountResult = db.prepare('SELECT COUNT(*) as count FROM leads WHERE owner_id = ?').get(userId) as any;
        overallTotalCount = overallCountResult.count;

        // Get total count with filters
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE ${where}`).get(userId, ...params) as any;
        totalCount = countResult.count;

        // Get paginated leads with filters
        leads = db.prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(userId, ...params, limit, offset);
      }
    }

    // Get total cost from ALL leads (not just current page) - only count leads with cost > 0
    let totalCostResult;
    let wrongInfoCount;
    if (userRole === 'admin') {
      totalCostResult = db.prepare('SELECT SUM(cost_per_lead) as totalCost FROM leads WHERE cost_per_lead > 0').get() as any;
      wrongInfoCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE wrong_info = 1').get() as any;
    } else if (userRole === 'agent') {
      totalCostResult = db.prepare(`
        SELECT SUM(l.cost_per_lead) as totalCost FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE (l.owner_id = ? OR u.agent_id = ?) AND l.cost_per_lead > 0
      `).get(userId, userId) as any;
      wrongInfoCount = db.prepare(`
        SELECT COUNT(*) as count FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE (l.owner_id = ? OR u.agent_id = ?) AND l.wrong_info = 1
      `).get(userId, userId) as any;
    } else {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        totalCostResult = db.prepare(`
          SELECT SUM(l.cost_per_lead) as totalCost FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE (l.owner_id = ? OR u.agent_id = ?) AND l.cost_per_lead > 0
        `).get(user.agent_id, user.agent_id) as any;
        wrongInfoCount = db.prepare(`
          SELECT COUNT(*) as count FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE (l.owner_id = ? OR u.agent_id = ?) AND l.wrong_info = 1
        `).get(user.agent_id, user.agent_id) as any;
      } else {
        totalCostResult = db.prepare('SELECT SUM(cost_per_lead) as totalCost FROM leads WHERE owner_id = ? AND cost_per_lead > 0').get(userId) as any;
        wrongInfoCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE owner_id = ? AND wrong_info = 1').get(userId) as any;
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
        overallTotalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      },
      stats: {
        totalCost: totalCostResult?.totalCost || 0,
        wrongInfoCount: wrongInfoCount?.count || 0
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

    const rawLead: Omit<Lead, 'id'> = await request.json();

    // Sanitize all user inputs to prevent XSS attacks
    const lead = sanitizeLead(rawLead);

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