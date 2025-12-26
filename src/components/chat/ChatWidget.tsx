'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import type { Conversation, Message, NewMessageEvent, ConversationUpdatedEvent } from '../../../types/chat';

export default function ChatWidget() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = (session?.user as any)?.id ? parseInt((session.user as any).id) : null;

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        setTotalUnread(data.conversations.reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0));
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        // Mark as read
        fetch(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Pusher and fetch conversations
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

    fetchConversations();

    // Dynamically import and use Pusher only when configured
    import('../../../lib/pusher/client').then(({ getPusherClient, getUserChannel, PUSHER_EVENTS }) => {
      const pusher = getPusherClient();
      const userChannel = pusher.subscribe(getUserChannel(userId));

      userChannel.bind(PUSHER_EVENTS.CONVERSATION_UPDATED, (data: ConversationUpdatedEvent) => {
        fetchConversations();
      });
    });
  }, [status, userId, fetchConversations]);

  // Subscribe to selected conversation for new messages
  useEffect(() => {
    if (!selectedConversation) return;
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

    // Dynamically import and use Pusher only when configured
    import('../../../lib/pusher/client').then(({ getPusherClient, getConversationChannel, PUSHER_EVENTS }) => {
      const pusher = getPusherClient();
      const conversationChannel = pusher.subscribe(getConversationChannel(selectedConversation.id));

      conversationChannel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: NewMessageEvent) => {
        if (data.sender_id !== userId) {
          setMessages(prev => [...prev, {
            id: data.id,
            conversation_id: data.conversation_id,
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            content: data.content,
            created_at: data.created_at,
          }]);
          // Mark as read since we're viewing this conversation
          fetch(`/api/chat/conversations/${selectedConversation.id}/read`, { method: 'POST' });
        }
      });
    });
  }, [selectedConversation, userId]);

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Handle going back to conversation list
  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    fetchConversations();
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle creating a new conversation
  const handleCreateConversation = async (participantIds: number[], name?: string, isGroup?: boolean) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_ids: participantIds,
          name,
          is_group: isGroup,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowNewChat(false);
        await fetchConversations();
        // Select the new or existing conversation
        const conv = conversations.find(c => c.id === data.conversation_id);
        if (conv) {
          handleSelectConversation(conv);
        } else {
          // Refetch and then select
          const newConvsResponse = await fetch('/api/chat/conversations');
          if (newConvsResponse.ok) {
            const newConvsData = await newConvsResponse.json();
            setConversations(newConvsData.conversations);
            const newConv = newConvsData.conversations.find((c: Conversation) => c.id === data.conversation_id);
            if (newConv) {
              handleSelectConversation(newConv);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Don't render if not authenticated or Pusher not configured
  const isPusherConfigured = process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (status !== 'authenticated' || !isPusherConfigured) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
      >
        {isOpen ? (
          <span className="text-2xl">×</span>
        ) : (
          <>
            <span className="text-2xl">💬</span>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border-2 border-black flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-black text-white p-4 flex items-center justify-between">
            {selectedConversation ? (
              <>
                <button
                  onClick={handleBack}
                  className="text-white hover:text-red-400 mr-2"
                >
                  ←
                </button>
                <span className="font-bold truncate flex-1">
                  {selectedConversation.name || 'Chat'}
                </span>
              </>
            ) : (
              <>
                <span className="font-bold">💬 Team Chat</span>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold"
                >
                  + New
                </button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {selectedConversation ? (
              <MessageThread
                messages={messages}
                currentUserId={userId!}
                onSendMessage={handleSendMessage}
                loading={loading}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                onSelectConversation={handleSelectConversation}
              />
            )}
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewChat && (
        <NewConversationModal
          onClose={() => setShowNewChat(false)}
          onCreateConversation={handleCreateConversation}
        />
      )}
    </>
  );
}
