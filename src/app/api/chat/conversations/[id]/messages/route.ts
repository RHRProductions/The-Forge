import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { getDatabase } from '../../../../../../../lib/database/connection';
import { getPusherServer, getConversationChannel, getUserChannel, PUSHER_EVENTS } from '../../../../../../../lib/pusher/server';
import type { Message, NewMessageEvent, ConversationUpdatedEvent } from '../../../../../../../types/chat';

// GET: Fetch messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const userId = parseInt((session.user as any).id);
    const db = getDatabase();

    // Verify user is a participant
    const participant = db.prepare(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    ).get(conversationId, userId);

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // message id for pagination

    let query = `
      SELECT
        m.*,
        u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const queryParams: any[] = [conversationId];

    if (before) {
      query += ' AND m.id < ?';
      queryParams.push(parseInt(before));
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    queryParams.push(limit);

    const messages = db.prepare(query).all(...queryParams) as Message[];

    // Return in chronological order (oldest first)
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    const userId = parseInt((session.user as any).id);
    const userName = (session.user as any).name || 'Unknown';
    const db = getDatabase();

    // Verify user is a participant
    const participant = db.prepare(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
    ).get(conversationId, userId);

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = content
      .trim()
      .substring(0, 2000)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    // Insert message
    const result = db.prepare(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES (?, ?, ?)
    `).run(conversationId, userId, sanitizedContent);

    const messageId = result.lastInsertRowid as number;
    const createdAt = new Date().toISOString();

    // Update conversation updated_at
    db.prepare(`
      UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(conversationId);

    // Get all participants to notify
    const participants = db.prepare(`
      SELECT user_id FROM conversation_participants WHERE conversation_id = ?
    `).all(conversationId) as { user_id: number }[];

    // Trigger Pusher events
    const pusher = getPusherServer();

    // Send to conversation channel (for users viewing this conversation)
    const newMessageEvent: NewMessageEvent = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      sender_name: userName,
      content: sanitizedContent,
      created_at: createdAt,
    };
    pusher.trigger(getConversationChannel(conversationId), PUSHER_EVENTS.NEW_MESSAGE, newMessageEvent);

    // Notify all participants on their user channels (for conversation list updates)
    const conversationUpdatedEvent: ConversationUpdatedEvent = {
      conversation_id: conversationId,
      last_message: sanitizedContent.length > 50 ? sanitizedContent.substring(0, 50) + '...' : sanitizedContent,
      sender_name: userName,
      updated_at: createdAt,
    };

    for (const p of participants) {
      if (p.user_id !== userId) {
        pusher.trigger(getUserChannel(p.user_id), PUSHER_EVENTS.CONVERSATION_UPDATED, conversationUpdatedEvent);
      }
    }

    return NextResponse.json({
      message: {
        id: messageId,
        conversation_id: conversationId,
        sender_id: userId,
        sender_name: userName,
        content: sanitizedContent,
        created_at: createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
