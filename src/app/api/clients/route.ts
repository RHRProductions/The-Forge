import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
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

    let clients;

    // For now, show all clients to everyone (can add role-based filtering later)
    if (userRole === 'admin') {
      clients = db.prepare('SELECT * FROM clients ORDER BY last_name, first_name').all();
    } else {
      // Agents and setters see clients they created
      clients = db.prepare('SELECT * FROM clients WHERE created_by_user_id = ? ORDER BY last_name, first_name').all(userId);
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await request.json();
    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    const result = db.prepare(
      `INSERT INTO clients (
        first_name, last_name, email, phone, phone_2,
        date_of_birth, address, city, state, zip_code,
        client_since, products, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      client.first_name,
      client.last_name,
      client.email || '',
      client.phone || '',
      client.phone_2 || '',
      client.date_of_birth || '',
      client.address || '',
      client.city || '',
      client.state || '',
      client.zip_code || '',
      client.client_since || new Date().toISOString().split('T')[0],
      client.products || '',
      client.notes || '',
      userId
    );

    const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
