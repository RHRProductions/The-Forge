import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
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

    // Get all leads based on role
    let leads;
    if (userRole === 'admin') {
      leads = db.prepare(`
        SELECT id, first_name, last_name, email, phone, phone_2, city, state, zip_code, source, created_at
        FROM leads
        ORDER BY created_at DESC
      `).all();
    } else if (userRole === 'agent') {
      leads = db.prepare(`
        SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.phone_2, l.city, l.state, l.zip_code, l.source, l.created_at
        FROM leads l
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE l.owner_id = ? OR u.agent_id = ?
        ORDER BY l.created_at DESC
      `).all(userId, userId);
    } else {
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
      if (user?.agent_id) {
        leads = db.prepare(`
          SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.phone_2, l.city, l.state, l.zip_code, l.source, l.created_at
          FROM leads l
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE l.owner_id = ? OR u.agent_id = ?
          ORDER BY l.created_at DESC
        `).all(user.agent_id, user.agent_id);
      } else {
        leads = db.prepare(`
          SELECT id, first_name, last_name, email, phone, phone_2, city, state, zip_code, source, created_at
          FROM leads
          WHERE owner_id = ?
          ORDER BY created_at DESC
        `).all(userId);
      }
    }

    // Find duplicates
    const duplicateGroups: any[] = [];
    const processedIds = new Set<number>();

    for (let i = 0; i < leads.length; i++) {
      const lead1 = leads[i] as any;

      if (processedIds.has(lead1.id)) continue;

      const duplicates = [lead1];
      const phone1 = cleanPhone(lead1.phone);
      const phone1_2 = cleanPhone(lead1.phone_2);
      const email1 = lead1.email?.toLowerCase().trim();

      // Build name safely - only if first and last name exist
      const firstName1 = lead1.first_name?.toLowerCase().trim();
      const lastName1 = lead1.last_name?.toLowerCase().trim();
      const name1 = (firstName1 && lastName1) ? `${firstName1} ${lastName1}` : null;

      for (let j = i + 1; j < leads.length; j++) {
        const lead2 = leads[j] as any;

        if (processedIds.has(lead2.id)) continue;

        const phone2 = cleanPhone(lead2.phone);
        const phone2_2 = cleanPhone(lead2.phone_2);
        const email2 = lead2.email?.toLowerCase().trim();

        // Build name safely - only if first and last name exist
        const firstName2 = lead2.first_name?.toLowerCase().trim();
        const lastName2 = lead2.last_name?.toLowerCase().trim();
        const name2 = (firstName2 && lastName2) ? `${firstName2} ${lastName2}` : null;

        let isDuplicate = false;

        // Check phone match (primary or secondary) - must be at least 10 digits
        if (phone1 && phone2 && phone1.length >= 10 && phone2.length >= 10) {
          if (phone1 === phone2 || phone1 === phone2_2 || phone1_2 === phone2 ||
              (phone1_2 && phone2_2 && phone1_2 === phone2_2)) {
            isDuplicate = true;
          }
        }

        // Check email match - must have valid email format
        if (!isDuplicate && email1 && email2 && email1.includes('@') && email2.includes('@') && email1 === email2) {
          isDuplicate = true;
        }

        // Check name + location match - both must have valid names
        if (!isDuplicate && name1 && name2 && name1 === name2) {
          if (lead1.zip_code && lead2.zip_code && lead1.zip_code === lead2.zip_code) {
            isDuplicate = true;
          } else if (lead1.city && lead2.city && lead1.state && lead2.state) {
            const city1 = lead1.city.toLowerCase().trim();
            const city2 = lead2.city.toLowerCase().trim();
            const state1 = lead1.state.toLowerCase().trim();
            const state2 = lead2.state.toLowerCase().trim();
            if (city1 === city2 && state1 === state2) {
              isDuplicate = true;
            }
          }
        }

        if (isDuplicate) {
          duplicates.push(lead2);
          processedIds.add(lead2.id);
        }
      }

      if (duplicates.length > 1) {
        processedIds.add(lead1.id);
        duplicateGroups.push({
          leads: duplicates,
          count: duplicates.length,
          matchType: determineMatchType(duplicates)
        });
      }
    }

    return NextResponse.json({
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
      totalGroups: duplicateGroups.length
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}

function determineMatchType(leads: any[]): string {
  if (leads.length < 2) return 'unknown';

  const lead1 = leads[0];
  const lead2 = leads[1];

  const phone1 = cleanPhone(lead1.phone);
  const phone2 = cleanPhone(lead2.phone);
  const email1 = lead1.email?.toLowerCase().trim();
  const email2 = lead2.email?.toLowerCase().trim();

  if (phone1 && phone2 && phone1 === phone2) return 'phone';
  if (email1 && email2 && email1 === email2) return 'email';
  return 'name+location';
}
