import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';
import { medicareSequenceTemplates } from '../../../../../lib/email/cold-email-templates';

/**
 * POST /api/sequences/seed
 *
 * Creates the default Medicare cold email sequence with 5 proven templates
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

    // Get user's email and name for the from fields
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if sequence already exists
    const existingSequence = db.prepare(
      'SELECT id FROM email_sequences WHERE name = ? AND created_by_user_id = ?'
    ).get('Medicare Cold Email Sequence', userId);

    if (existingSequence) {
      return NextResponse.json(
        {
          error: 'Medicare sequence already exists for this user',
          sequenceId: (existingSequence as any).id
        },
        { status: 409 }
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
      'Medicare Cold Email Sequence',
      'Proven 5-email sequence to convert cold Medicare leads into appointments or livestream registrations',
      1,
      'Book appointment or register for livestream',
      userId
    );

    const sequenceId = sequenceResult.lastInsertRowid;

    // Create each step from templates
    for (const template of medicareSequenceTemplates) {
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
        template.stepOrder,
        template.delayDays,
        0, // delay_hours
        template.subjectLine,
        template.bodyHtml,
        template.bodyText,
        user.name,
        user.email,
        user.email,
        1 // is_active
      );
    }

    // Get the created sequence with steps
    const sequence = db.prepare(`
      SELECT * FROM email_sequences WHERE id = ?
    `).get(sequenceId);

    const steps = db.prepare(`
      SELECT * FROM email_sequence_steps
      WHERE sequence_id = ?
      ORDER BY step_order ASC
    `).all(sequenceId);

    return NextResponse.json({
      message: 'Medicare cold email sequence created successfully',
      sequence: {
        ...sequence,
        steps
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error seeding sequence:', error);
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}
