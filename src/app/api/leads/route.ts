import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { Lead } from '../../../../types/lead';
import { auth } from '../../../../auth';
import { sanitizeLead } from '../../../../lib/security/input-sanitizer';
import { createErrorResponse } from '../../../../lib/security/error-sanitizer';

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
    const t65Window = searchParams.get('t65_window') || '';

    // Build WHERE clause for filters
    const buildWhereClause = (baseWhere: string = '1=1') => {
      let where = baseWhere;
      const params: any[] = [];

      if (search) {
        const searchLower = search.toLowerCase();
        const searchDigits = search.replace(/\D/g, '');

        if (searchDigits.length > 0) {
          // Strip all non-numeric characters from database phone numbers for comparison
          where += ` AND (LOWER(l.first_name || ' ' || l.last_name) LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone, '-', ''), '(', ''), ')', ''), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(l.phone_2, '-', ''), '(', ''), ')', ''), ' ', '') LIKE ?)`;
          params.push(`%${searchLower}%`, `%${searchDigits}%`, `%${searchDigits}%`);
        } else {
          where += ` AND LOWER(l.first_name || ' ' || l.last_name) LIKE ?`;
          params.push(`%${searchLower}%`);
        }
      }

      if (status) {
        where += ` AND l.status = ?`;
        params.push(status);
      }

      if (leadType) {
        where += ` AND l.lead_type = ?`;
        params.push(leadType);
      }

      if (city) {
        where += ` AND LOWER(l.city) LIKE ?`;
        params.push(`%${city.toLowerCase()}%`);
      }

      if (state) {
        where += ` AND UPPER(l.state) = ?`;
        params.push(state.toUpperCase());
      }

      if (zipCode) {
        where += ` AND l.zip_code LIKE ?`;
        params.push(`%${zipCode}%`);
      }

      if (source) {
        where += ` AND LOWER(l.source) LIKE ?`;
        params.push(`%${source.toLowerCase()}%`);
      }

      if (temperature) {
        where += ` AND l.lead_temperature = ?`;
        params.push(temperature);
      }

      // Age filtering: if only min provided, treat as exact match
      if (ageMin && !ageMax) {
        where += ` AND l.age = ?`;
        params.push(parseInt(ageMin));
      } else if (ageMin && ageMax) {
        where += ` AND l.age >= ? AND l.age <= ?`;
        params.push(parseInt(ageMin), parseInt(ageMax));
      } else if (ageMax) {
        where += ` AND l.age <= ?`;
        params.push(parseInt(ageMax));
      }

      // T65 Window: filter for 64-year-olds turning 65 within X months
      if (t65Window) {
        const months = parseInt(t65Window);
        // Calculate the DOB range for people turning 65 within X months
        // Their 65th birthday must be between today and today + X months
        // So their DOB must be between (today - 65 years) and (today + X months - 65 years)
        const today = new Date();
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + months);

        // DOB for turning 65 today
        const dobForToday = new Date(today);
        dobForToday.setFullYear(dobForToday.getFullYear() - 65);

        // DOB for turning 65 in X months
        const dobForEnd = new Date(endDate);
        dobForEnd.setFullYear(dobForEnd.getFullYear() - 65);

        // Format as MM/DD for comparison (ignore year since we check age = 64)
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        const endMonth = endDate.getMonth() + 1;
        const endDay = endDate.getDate();

        // Filter: age = 64 AND birthday is within the window
        // We compare month and day only since age already filters to the right year
        where += ` AND l.age = 64 AND l.date_of_birth IS NOT NULL`;

        // Parse month and day from M/D/YYYY or MM/DD/YYYY format
        // Check if birthday falls between today and end date (within same calendar year context)
        if (endMonth > todayMonth || (endMonth === todayMonth && endDay >= todayDay)) {
          // Window doesn't cross year boundary
          where += ` AND (
            (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) > ${todayMonth})
            OR (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) = ${todayMonth}
                AND CAST(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1, instr(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1), '/') - 1) AS INTEGER) > ${todayDay})
          ) AND (
            (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) < ${endMonth})
            OR (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) = ${endMonth}
                AND CAST(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1, instr(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1), '/') - 1) AS INTEGER) <= ${endDay})
          )`;
        } else {
          // Window crosses year boundary (e.g., Nov to Feb)
          where += ` AND (
            (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) > ${todayMonth})
            OR (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) = ${todayMonth}
                AND CAST(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1, instr(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1), '/') - 1) AS INTEGER) > ${todayDay})
            OR (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) < ${endMonth})
            OR (CAST(substr(l.date_of_birth, 1, instr(l.date_of_birth, '/') - 1) AS INTEGER) = ${endMonth}
                AND CAST(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1, instr(substr(l.date_of_birth, instr(l.date_of_birth, '/') + 1), '/') - 1) AS INTEGER) <= ${endDay})
          )`;
        }
      }

      return { where, params };
    };

    let leads;
    let totalCount;
    let overallTotalCount;

    // ADMINS and AGENTS both see only their own leads + their setters' leads
    // Aggregate data is ONLY shown in Platform Insights
    if (userRole === 'admin' || userRole === 'agent') {
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
    if (userRole === 'admin' || userRole === 'agent') {
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
    // Exclude empty strings in addition to NULL
    let followUpLeads;
    if (userRole === 'admin' || userRole === 'agent') {
      followUpLeads = db.prepare(`
        SELECT l.* FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE (l.owner_id = ? OR u.agent_id = ?)
          AND (l.lead_temperature = 'warm' OR l.lead_temperature = 'hot')
          AND l.next_follow_up IS NOT NULL
          AND l.next_follow_up != ''
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
            AND l.next_follow_up != ''
          ORDER BY l.next_follow_up ASC
        `).all(user.agent_id, user.agent_id);
      } else {
        followUpLeads = db.prepare(`
          SELECT * FROM leads
          WHERE owner_id = ?
            AND (lead_temperature = 'warm' OR lead_temperature = 'hot')
            AND next_follow_up IS NOT NULL
            AND next_follow_up != ''
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
    const errorResponse = createErrorResponse(error, 'GET /api/leads');
    return NextResponse.json(errorResponse, { status: 500 });
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
    const errorResponse = createErrorResponse(error, 'POST /api/leads');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}