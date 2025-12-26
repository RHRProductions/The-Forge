'use client';

import { useState, useEffect } from 'react';
import type { ChatUser } from '../../../types/chat';

interface NewConversationModalProps {
  onClose: () => void;
  onCreateConversation: (participantIds: number[], name?: string, isGroup?: boolean) => void;
}

export default function NewConversationModal({
  onClose,
  onCreateConversation,
}: NewConversationModalProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch available users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/chat/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const shouldBeGroup = isGroup || selectedUsers.length > 1;
      await onCreateConversation(
        selectedUsers,
        shouldBeGroup ? groupName || 'Group Chat' : undefined,
        shouldBeGroup
      );
    } finally {
      setCreating(false);
    }
  };

  // Auto-switch to group mode if more than 1 user selected
  useEffect(() => {
    if (selectedUsers.length > 1 && !isGroup) {
      setIsGroup(true);
    }
  }, [selectedUsers, isGroup]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <span className="font-bold">New Conversation</span>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Group toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className="font-semibold">Create group chat</span>
            </label>
          </div>

          {/* Group name input */}
          {isGroup && (
            <div className="mb-4">
              <label className="block font-semibold mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-red-600 focus:outline-none"
              />
            </div>
          )}

          {/* User list */}
          <div className="mb-4">
            <label className="block font-semibold mb-2">
              Select {isGroup ? 'participants' : 'user'}
            </label>
            {loading ? (
              <div className="text-gray-500 text-center py-4">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No other users available</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full p-3 rounded border-2 text-left transition-colors flex items-center gap-3 ${
                      selectedUsers.includes(user.id)
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <span className="text-red-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-gray-300 rounded py-2 font-bold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || creating}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded py-2 font-bold transition-colors"
          >
            {creating ? 'Creating...' : 'Start Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
