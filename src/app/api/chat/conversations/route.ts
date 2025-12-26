import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';
import { getPusherServer, getUserChannel, PUSHER_EVENTS } from '../../../../../lib/pusher/server';
import type { Conversation } from '../../../../../types/chat';

// GET: List all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const db = getDatabase();

    // Get all conversations where user is a participant
    const conversations = db.prepare(`
      SELECT
        c.*,
        (
          SELECT content FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_content,
        (
          SELECT created_at FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_at,
        (
          SELECT u.name FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC LIMIT 1
        ) as last_message_sender,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id
          AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
          AND m.sender_id != ?
        ) as unread_count,
        (
          SELECT GROUP_CONCAT(u.name, ', ')
          FROM conversation_participants cp2
          JOIN users u ON cp2.user_id = u.id
          WHERE cp2.conversation_id = c.id AND cp2.user_id != ?
        ) as other_participant_names
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ?
      ORDER BY
        COALESCE(last_message_at, c.created_at) DESC
    `).all(userId, userId, userId) as any[];

    // Format the response
    const formattedConversations: Conversation[] = conversations.map(c => ({
      id: c.id,
      name: c.is_group ? c.name : c.other_participant_names,
      is_group: Boolean(c.is_group),
      created_by_user_id: c.created_by_user_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      unread_count: c.unread_count || 0,
      last_message: c.last_message_content ? {
        id: 0,
        conversation_id: c.id,
        sender_id: 0,
        content: c.last_message_content,
        created_at: c.last_message_at,
        sender_name: c.last_message_sender,
      } : undefined,
      other_participant_name: c.other_participant_names,
    }));

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST: Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { participant_ids, name, is_group } = await request.json();
    const userId = parseInt((session.user as any).id);
    const userName = (session.user as any).name || 'Unknown';
    const db = getDatabase();

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: 'participant_ids is required' }, { status: 400 });
    }

    // For 1-on-1 chats, check if conversation already exists
    if (!is_group && participant_ids.length === 1) {
      const otherUserId = participant_ids[0];
      const existingConversation = db.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
        WHERE c.is_group = 0
        AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
      `).get(userId, otherUserId) as { id: number } | undefined;

      if (existingConversation) {
        return NextResponse.json({
          conversation_id: existingConversation.id,
          existing: true
        });
      }
    }

    // Create conversation
    const result = db.prepare(`
      INSERT INTO conversations (name, is_group, created_by_user_id)
      VALUES (?, ?, ?)
    `).run(is_group ? name : null, is_group ? 1 : 0, userId);

    const conversationId = result.lastInsertRowid as number;

    // Add all participants including the creator
    const allParticipants = [...new Set([userId, ...participant_ids])];
    const insertParticipant = db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (?, ?)
    `);

    for (const participantId of allParticipants) {
      insertParticipant.run(conversationId, participantId);
    }

    // Notify other participants via Pusher
    const pusher = getPusherServer();
    for (const participantId of participant_ids) {
      if (participantId !== userId) {
        pusher.trigger(getUserChannel(participantId), PUSHER_EVENTS.CONVERSATION_UPDATED, {
          conversation_id: conversationId,
          last_message: is_group ? `${userName} created a group chat` : `${userName} started a conversation`,
          sender_name: userName,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      conversation_id: conversationId,
      existing: false
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
