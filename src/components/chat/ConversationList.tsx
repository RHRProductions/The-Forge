'use client';

import type { Conversation } from '../../../types/chat';

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
}

export default function ConversationList({
  conversations,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-4xl mb-3">💬</div>
        <div className="text-gray-600 font-semibold">No conversations yet</div>
        <div className="text-sm text-gray-500 mt-1">
          Click "+ New" to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className="w-full p-4 border-b border-gray-200 hover:bg-gray-50 text-left transition-colors flex items-start gap-3"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0">
            {conversation.is_group ? (
              '👥'
            ) : (
              conversation.name?.charAt(0).toUpperCase() || '?'
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold truncate">
                {conversation.name || 'Unknown'}
              </span>
              {conversation.unread_count && conversation.unread_count > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                  {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </span>
              )}
            </div>
            {conversation.last_message && (
              <div className="text-sm text-gray-600 truncate mt-1">
                {conversation.last_message.sender_name && (
                  <span className="font-medium">{conversation.last_message.sender_name}: </span>
                )}
                {conversation.last_message.content}
              </div>
            )}
            {conversation.last_message?.created_at && (
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(conversation.last_message.created_at)}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
