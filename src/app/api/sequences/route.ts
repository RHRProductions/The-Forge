import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

/**
 * GET /api/sequences
 * Get all email sequences for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    let sequences;

    if (userRole === 'admin') {
      // Admins see all sequences
      sequences = db.prepare(`
        SELECT
          s.*,
          u.name as created_by_name,
          COUNT(DISTINCT sse.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN sse.status = 'active' THEN sse.id END) as active_enrollments,
          COUNT(DISTINCT CASE WHEN sse.status = 'completed' THEN sse.id END) as completed_enrollments,
          COUNT(DISTINCT steps.id) as total_steps
        FROM email_sequences s
        LEFT JOIN users u ON s.created_by_user_id = u.id
        LEFT JOIN email_sequence_enrollments sse ON s.id = sse.sequence_id
        LEFT JOIN email_sequence_steps steps ON s.id = steps.sequence_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `).all();
    } else {
      // Agents and setters see only their sequences
      sequences = db.prepare(`
        SELECT
          s.*,
          u.name as created_by_name,
          COUNT(DISTINCT sse.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN sse.status = 'active' THEN sse.id END) as active_enrollments,
          COUNT(DISTINCT CASE WHEN sse.status = 'completed' THEN sse.id END) as completed_enrollments,
          COUNT(DISTINCT steps.id) as total_steps
        FROM email_sequences s
        LEFT JOIN users u ON s.created_by_user_id = u.id
        LEFT JOIN email_sequence_enrollments sse ON s.id = sse.sequence_id
        LEFT JOIN email_sequence_steps steps ON s.id = steps.sequence_id
        WHERE s.created_by_user_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `).all(userId);
    }

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sequences
 * Create a new email sequence
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;

    // Only admins and agents can create sequences
    if (userRole !== 'admin' && userRole !== 'agent') {
      return NextResponse.json(
        { error: 'Only admins and agents can create sequences' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const body = await request.json();

    const { name, description, goal, steps } = body;

    if (!name || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one step are required' },
        { status: 400 }
      );
    }

    // Create the sequence
    const sequenceResult = db.prepare(`
      INSERT INTO email_sequences (
        name,
        description,
        is_active,
        goal,
        created_by_user_id
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      name,
      description || '',
      1,
      goal || '',
      userId
    );

    const sequenceId = sequenceResult.lastInsertRowid;

    // Create each step
    for (const step of steps) {
      db.prepare(`
        INSERT INTO email_sequence_steps (
          sequence_id,
          step_order,
          delay_days,
          delay_hours,
          subject_line,
          body_html,
          body_text,
          from_name,
          from_email,
          reply_to_email,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sequenceId,
        step.step_order,
        step.delay_days || 0,
        step.delay_hours || 0,
        step.subject_line,
        step.body_html,
        step.body_text || '',
        step.from_name,
        step.from_email,
        step.reply_to_email || step.from_email,
        step.is_active !== false ? 1 : 0
      );
    }

    // Get the created sequence with steps
    const sequence = db.prepare(`
      SELECT * FROM email_sequences WHERE id = ?
    `).get(sequenceId);

    const createdSteps = db.prepare(`
      SELECT * FROM email_sequence_steps
      WHERE sequence_id = ?
      ORDER BY step_order ASC
    `).all(sequenceId);

    return NextResponse.json({
      message: 'Sequence created successfully',
      sequence: {
        ...sequence,
        steps: createdSteps
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating sequence:', error);
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}
