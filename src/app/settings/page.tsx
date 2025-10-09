'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'setter';
  agent_id?: number;
  created_at: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'setter',
    agent_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session.user as any).role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch users
  useEffect(() => {
    if ((session?.user as any)?.role === 'admin') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      // Only send password if it's provided
      if (formData.password) {
        body.password = formData.password;
      }

      // Only send agent_id for setters
      if (formData.role === 'setter' && formData.agent_id) {
        body.agent_id = parseInt(formData.agent_id);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchUsers();
        setShowAddForm(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'setter', agent_id: '' });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save user');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      agent_id: user.agent_id?.toString() || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'setter', agent_id: '' });
    setError('');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if ((session?.user as any)?.role !== 'admin') {
    return null;
  }

  // Get agents and admins for the dropdown (admins can also function as agents)
  const agentsAndAdmins = users.filter(u => u.role === 'agent' || u.role === 'admin');

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">⚙️ User Management</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Action Buttons */}
        {!showAddForm && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
            >
              + Add New User
            </button>
            <button
              onClick={() => router.push('/admin/bulk-source-update')}
              className="bg-purple-600 text-white px-6 py-3 rounded font-bold hover:bg-purple-700 transition-colors"
            >
              📊 Bulk Source Update
            </button>
          </div>
        )}

        {/* Add/Edit User Form */}
        {showAddForm && (
          <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="setter">Setter</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'setter' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Assigned Agent (Optional)</label>
                    <select
                      value={formData.agent_id}
                      onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    >
                      <option value="">No Agent Assigned</option>
                      {agentsAndAdmins.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white border-2 border-red-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Assigned Agent</th>
                <th className="text-left p-4">Created</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === 'admin' ? 'bg-red-600 text-white' :
                      user.role === 'agent' ? 'bg-blue-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.agent_id ? agentsAndAdmins.find(a => a.id === user.agent_id)?.name || 'Unknown' : '-'}
                  </td>
                  <td className="p-4">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      {user.id !== (session.user as any).id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
