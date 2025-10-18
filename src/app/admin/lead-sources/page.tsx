'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface LeadSource {
  source: string;
  count: number;
  avg_cost: number;
}

export default function LeadSourcesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user && (session.user as any).role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch lead sources
  useEffect(() => {
    if (session?.user && (session.user as any).role === 'admin') {
      fetchSources();
    }
  }, [session]);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/admin/lead-sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      alert('Please enter a new name');
      return;
    }

    if (!confirm(`Rename "${oldName}" to "${newName}"? This will update ${sources.find(s => s.source === oldName)?.count} leads.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/lead-sources/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully renamed ${data.updated} leads!`);
        setEditingSource(null);
        setNewName('');
        fetchSources();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to rename source');
      }
    } catch (error) {
      console.error('Error renaming source:', error);
      alert('Failed to rename source');
    }
  };

  const handleUpdateCost = async (sourceName: string) => {
    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) {
      alert('Please enter a valid cost');
      return;
    }

    if (!confirm(`Update cost for "${sourceName}" to $${cost.toFixed(2)}? This will update ${sources.find(s => s.source === sourceName)?.count} leads.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/lead-sources/update-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceName, cost }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully updated ${data.updated} leads!`);
        setNewCost('');
        fetchSources();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update cost');
      }
    } catch (error) {
      console.error('Error updating cost:', error);
      alert('Failed to update cost');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black">🏷️ Lead Source Management</h1>
              <p className="text-gray-400 mt-2 text-sm">
                Manage lead sources, rename vendors, and update costs
              </p>
            </div>
            <NavigationMenu currentPage="lead-sources" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-black shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-black">
              <tr>
                <th className="text-left p-4 font-bold">Lead Source</th>
                <th className="text-right p-4 font-bold">Lead Count</th>
                <th className="text-right p-4 font-bold">Avg Cost</th>
                <th className="text-center p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.source} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4">
                    {editingSource === source.source ? (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={source.source}
                        className="px-3 py-2 border-2 border-black rounded font-semibold"
                      />
                    ) : (
                      <span className="font-semibold">{source.source}</span>
                    )}
                  </td>
                  <td className="text-right p-4 text-gray-600">{source.count.toLocaleString()}</td>
                  <td className="text-right p-4 text-gray-600">${source.avg_cost.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {editingSource === source.source ? (
                        <>
                          <button
                            onClick={() => handleRename(source.source)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-bold"
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingSource(null);
                              setNewName('');
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold"
                          >
                            ✗ Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSource(source.source);
                            setNewName(source.source);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-bold"
                        >
                          Rename
                        </button>
                      )}
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="$0.00"
                          value={newCost}
                          onChange={(e) => setNewCost(e.target.value)}
                          className="w-24 px-2 py-1 border-2 border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleUpdateCost(source.source)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-bold"
                        >
                          Update Cost
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <h3 className="font-bold text-lg mb-2">💡 Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><strong>Rename</strong> - Updates all leads from that source to the new name</li>
            <li><strong>Update Cost</strong> - Changes the cost_per_lead for all leads from that source</li>
            <li>Changes are permanent and cannot be undone</li>
            <li>The dropdown filter on the dashboard will automatically update after changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
