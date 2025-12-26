export interface Conversation {
  id: number;
  name: string | null;
  is_group: boolean;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
  other_participant_name?: string; // For 1-on-1 chats
}

export interface ConversationParticipant {
  id: number;
  conversation_id: number;
  user_id: number;
  joined_at: string;
  last_read_at: string | null;
  // Joined fields
  user_name?: string;
  user_role?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  // Joined fields
  sender_name?: string;
}

export interface ChatUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Pusher event payloads
export interface NewMessageEvent {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface ConversationUpdatedEvent {
  conversation_id: number;
  last_message: string;
  sender_name: string;
  updated_at: string;
}
