import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/admin/bulk-assign-leads - Get leads with filters and count
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk assign leads
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const db = getDatabase();

    // Build filter conditions
    const conditions: string[] = [];
    const values: any[] = [];

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      const searchTerm = `%${search}%`;
      const digitsOnly = search.replace(/\D/g, '');
      conditions.push(`(l.first_name LIKE ? OR l.last_name LIKE ? OR REPLACE(REPLACE(REPLACE(l.phone, '-', ''), '(', ''), ')', '') LIKE ?)`);
      values.push(searchTerm, searchTerm, `%${digitsOnly}%`);
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push('l.status = ?');
      values.push(status);
    }

    // Lead type filter
    const leadType = searchParams.get('lead_type');
    if (leadType) {
      conditions.push('l.lead_type = ?');
      values.push(leadType);
    }

    // City filter
    const city = searchParams.get('city');
    if (city) {
      conditions.push('l.city LIKE ?');
      values.push(`%${city}%`);
    }

    // State filter
    const state = searchParams.get('state');
    if (state) {
      conditions.push('l.state LIKE ?');
      values.push(`%${state}%`);
    }

    // Zip code filter
    const zipCode = searchParams.get('zip_code');
    if (zipCode) {
      conditions.push('l.zip_code LIKE ?');
      values.push(`%${zipCode}%`);
    }

    // Source filter
    const source = searchParams.get('source');
    if (source) {
      conditions.push('l.source = ?');
      values.push(source);
    }

    // Temperature filter
    const temperature = searchParams.get('temperature');
    if (temperature) {
      conditions.push('l.lead_temperature = ?');
      values.push(temperature);
    }

    // Age filters
    const ageMin = searchParams.get('age_min');
    if (ageMin) {
      conditions.push('l.age >= ?');
      values.push(parseInt(ageMin));
    }

    const ageMax = searchParams.get('age_max');
    if (ageMax) {
      conditions.push('l.age <= ?');
      values.push(parseInt(ageMax));
    }

    // Owner filter (unassigned, or specific owner)
    const ownerId = searchParams.get('owner_id');
    if (ownerId === 'unassigned') {
      conditions.push('l.owner_id IS NULL');
    } else if (ownerId) {
      conditions.push('l.owner_id = ?');
      values.push(parseInt(ownerId));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get count of matching leads
    const countResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM leads l
      ${whereClause}
    `).get(...values) as { count: number };

    // Get sample of leads (first 50 for preview)
    const leads = db.prepare(`
      SELECT l.id, l.first_name, l.last_name, l.phone, l.city, l.state, l.source, l.status, l.owner_id,
             u.name as owner_name
      FROM leads l
      LEFT JOIN users u ON l.owner_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT 50
    `).all(...values);

    // Get list of agents/admins for assignment dropdown
    const agents = db.prepare(`
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('agent', 'admin')
      ORDER BY name
    `).all();

    // Get unique sources for filter dropdown
    const sources = db.prepare(`
      SELECT DISTINCT source
      FROM leads
      WHERE source IS NOT NULL AND source != ''
      ORDER BY source
    `).all() as { source: string }[];

    return NextResponse.json({
      count: countResult.count,
      leads,
      agents,
      sources: sources.map(s => s.source)
    });
  } catch (error) {
    console.error('Error fetching leads for bulk assign:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST /api/admin/bulk-assign-leads - Assign filtered leads to an agent
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk assign leads
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetAgentId, filters } = body;

    if (!targetAgentId) {
      return NextResponse.json({ error: 'Target agent is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Verify target agent exists and is agent/admin
    const targetAgent = db.prepare(`
      SELECT id, name, role FROM users WHERE id = ? AND role IN ('agent', 'admin')
    `).get(targetAgentId) as { id: number; name: string; role: string } | undefined;

    if (!targetAgent) {
      return NextResponse.json({ error: 'Invalid target agent' }, { status: 400 });
    }

    // Build filter conditions (same as GET)
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      const digitsOnly = filters.search.replace(/\D/g, '');
      conditions.push(`(first_name LIKE ? OR last_name LIKE ? OR REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', '') LIKE ?)`);
      values.push(searchTerm, searchTerm, `%${digitsOnly}%`);
    }

    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (filters.lead_type) {
      conditions.push('lead_type = ?');
      values.push(filters.lead_type);
    }

    if (filters.city) {
      conditions.push('city LIKE ?');
      values.push(`%${filters.city}%`);
    }

    if (filters.state) {
      conditions.push('state LIKE ?');
      values.push(`%${filters.state}%`);
    }

    if (filters.zip_code) {
      conditions.push('zip_code LIKE ?');
      values.push(`%${filters.zip_code}%`);
    }

    if (filters.source) {
      conditions.push('source = ?');
      values.push(filters.source);
    }

    if (filters.temperature) {
      conditions.push('lead_temperature = ?');
      values.push(filters.temperature);
    }

    if (filters.age_min) {
      conditions.push('age >= ?');
      values.push(parseInt(filters.age_min));
    }

    if (filters.age_max) {
      conditions.push('age <= ?');
      values.push(parseInt(filters.age_max));
    }

    if (filters.owner_id === 'unassigned') {
      conditions.push('owner_id IS NULL');
    } else if (filters.owner_id) {
      conditions.push('owner_id = ?');
      values.push(parseInt(filters.owner_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count leads that will be updated
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM leads ${whereClause}
    `).get(...values) as { count: number };

    // Update leads
    const updateValues = [targetAgentId, ...values];
    const result = db.prepare(`
      UPDATE leads SET owner_id = ?, updated_at = CURRENT_TIMESTAMP ${whereClause ? whereClause.replace('WHERE', 'WHERE 1=1 AND') : ''}
    `.replace('WHERE 1=1 AND', 'WHERE')).run(...updateValues);

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${countResult.count} leads to ${targetAgent.name}`,
      count: countResult.count
    });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    return NextResponse.json({ error: 'Failed to assign leads' }, { status: 500 });
  }
}
