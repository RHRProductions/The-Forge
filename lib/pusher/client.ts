'use client';

import PusherClient from 'pusher-js';

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClient && typeof window !== 'undefined') {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherClient!;
}

// Cleanup function for when component unmounts
export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}

// Channel naming conventions (matching server)
export function getUserChannel(userId: number): string {
  return `private-user-${userId}`;
}

export function getConversationChannel(conversationId: number): string {
  return `private-conversation-${conversationId}`;
}

// Event types (matching server)
export const PUSHER_EVENTS = {
  NEW_MESSAGE: 'new-message',
  CONVERSATION_UPDATED: 'conversation-updated',
  TYPING: 'typing',
} as const;
