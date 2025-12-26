import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getPusherServer } from '../../../../../lib/pusher/server';
import { getDatabase } from '../../../../../lib/database/connection';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.text();
    const params = new URLSearchParams(data);
    const socketId = params.get('socket_id');
    const channel = params.get('channel_name');

    if (!socketId || !channel) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id);
    const pusher = getPusherServer();

    // Validate channel access
    if (channel.startsWith('private-user-')) {
      // User can only subscribe to their own user channel
      const channelUserId = parseInt(channel.replace('private-user-', ''));
      if (channelUserId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (channel.startsWith('private-conversation-')) {
      // User must be a participant in the conversation
      const conversationId = parseInt(channel.replace('private-conversation-', ''));
      const db = getDatabase();
      const participant = db.prepare(
        'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
      ).get(conversationId, userId);

      if (!participant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Unknown channel type
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
