import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { auth } from '../../../../../../auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policyId = parseInt(params.id);
    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    // Get the policy and associated lead data
    const policy = db.prepare(`
      SELECT p.*, l.first_name, l.last_name, l.email, l.phone, l.phone_2,
             l.address, l.city, l.state, l.zip_code, l.date_of_birth
      FROM lead_policies p
      LEFT JOIN leads l ON p.lead_id = l.id
      WHERE p.id = ?
    `).get(policyId) as any;

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Check if client already exists for this lead
    const existingClient = db.prepare('SELECT id FROM clients WHERE lead_id = ?').get(policy.lead_id) as any;

    if (!existingClient) {
      // Create client record from lead data
      db.prepare(`
        INSERT INTO clients (
          lead_id, first_name, last_name, email, phone, phone_2,
          date_of_birth, address, city, state, zip_code,
          client_since, products, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        policy.lead_id,
        policy.first_name,
        policy.last_name,
        policy.email || '',
        policy.phone || '',
        policy.phone_2 || '',
        policy.date_of_birth || '',
        policy.address || '',
        policy.city || '',
        policy.state || '',
        policy.zip_code || '',
        policy.start_date || new Date().toISOString().split('T')[0],
        policy.policy_type,
        userId
      );
    } else {
      // Update existing client's products to include this policy type
      const client = db.prepare('SELECT products FROM clients WHERE id = ?').get(existingClient.id) as any;
      const currentProducts = client?.products || '';
      const productsList = currentProducts ? currentProducts.split(',').map((p: string) => p.trim()) : [];

      if (!productsList.includes(policy.policy_type)) {
        productsList.push(policy.policy_type);
        db.prepare('UPDATE clients SET products = ? WHERE id = ?').run(
          productsList.join(', '),
          existingClient.id
        );
      }
    }

    // Update policy status to 'active'
    db.prepare('UPDATE lead_policies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('active', policyId);

    return NextResponse.json({
      success: true,
      message: 'Policy marked as issued and client created'
    });
  } catch (error) {
    console.error('Error issuing policy:', error);
    return NextResponse.json({ error: 'Failed to issue policy' }, { status: 500 });
  }
}
