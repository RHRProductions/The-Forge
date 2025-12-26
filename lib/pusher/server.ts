import Pusher from 'pusher';

let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY ||
        !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      throw new Error('Pusher environment variables are not configured');
    }

    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Channel naming conventions
export function getUserChannel(userId: number): string {
  return `private-user-${userId}`;
}

export function getConversationChannel(conversationId: number): string {
  return `private-conversation-${conversationId}`;
}

// Event types
export const PUSHER_EVENTS = {
  NEW_MESSAGE: 'new-message',
  CONVERSATION_UPDATED: 'conversation-updated',
  TYPING: 'typing',
} as const;
