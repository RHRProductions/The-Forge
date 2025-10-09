'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LeadBatch {
  date: string;
  count: number;
  sampleLeads: Array<{
    id: number;
    first_name: string;
    last_name: string;
    city: string;
    state: string;
    lead_type: string;
  }>;
}

export default function BulkSourceUpdatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<LeadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sourceAssignments, setSourceAssignments] = useState<{ [date: string]: string }>({});
  const [customSources, setCustomSources] = useState<{ [date: string]: string }>({});

  // Redirect if not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch lead batches grouped by upload date
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchBatches();
    }
  }, [session]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lead-batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (date: string, source: string) => {
    setSourceAssignments(prev => ({ ...prev, [date]: source }));
    if (source !== 'custom') {
      setCustomSources(prev => {
        const newSources = { ...prev };
        delete newSources[date];
        return newSources;
      });
    }
  };

  const handleCustomSourceChange = (date: string, customSource: string) => {
    setCustomSources(prev => ({ ...prev, [date]: customSource }));
  };

  const handleBulkUpdate = async (date: string) => {
    const source = sourceAssignments[date];
    if (!source) {
      alert('Please select a source');
      return;
    }

    const finalSource = source === 'custom' ? customSources[date] : source;
    if (!finalSource || finalSource.trim() === '') {
      alert('Please enter a custom source name');
      return;
    }

    if (!confirm(`Update all leads from ${date} to source "${finalSource}"?`)) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch('/api/admin/bulk-update-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, source: finalSource }),
      });

      if (response.ok) {
        alert('Leads updated successfully!');
        fetchBatches(); // Refresh the data
      } else {
        alert('Failed to update leads');
      }
    } catch (error) {
      console.error('Error updating leads:', error);
      alert('Error updating leads');
    } finally {
      setUpdating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-red-500 hover:text-red-400 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Bulk Source Update</h1>
          <p className="text-gray-400 mt-2">
            Update lead sources in bulk based on upload date
          </p>
        </div>

        <div className="space-y-6">
          {batches.map((batch) => {
            const selectedSource = sourceAssignments[batch.date];
            const isCustom = selectedSource === 'custom';
            const customSource = customSources[batch.date] || '';

            return (
              <div
                key={batch.date}
                className="border-2 border-red-600 rounded-lg p-6 bg-gray-900"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Uploaded: {new Date(batch.date).toLocaleDateString()}
                    </h2>
                    <p className="text-gray-400">{batch.count} leads</p>
                  </div>
                </div>

                {/* Sample Leads */}
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Sample Leads:</h3>
                  <div className="bg-black border border-gray-700 rounded p-3 space-y-2">
                    {batch.sampleLeads.map((lead) => (
                      <div key={lead.id} className="text-sm">
                        • {lead.first_name} {lead.last_name} - {lead.city}, {lead.state} - {lead.lead_type}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Assign Source:
                    </label>
                    <select
                      value={selectedSource || ''}
                      onChange={(e) => handleSourceChange(batch.date, e.target.value)}
                      className="w-full px-4 py-2 bg-black border-2 border-gray-700 rounded text-white"
                    >
                      <option value="">Select source...</option>
                      <option value="Integrity Life Leads">Integrity Life Leads</option>
                      <option value="Marc's Life Lead List">Marc's Life Lead List</option>
                      <option value="Melissa Medicare">Melissa Medicare</option>
                      <option value="Lead Hero Life">Lead Hero Life</option>
                      <option value="T65 AZ/CO">T65 AZ/CO</option>
                      <option value="custom">Custom Source...</option>
                    </select>
                  </div>

                  {isCustom && (
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Custom Source Name:
                      </label>
                      <input
                        type="text"
                        value={customSource}
                        onChange={(e) => handleCustomSourceChange(batch.date, e.target.value)}
                        placeholder="Enter custom source name"
                        className="w-full px-4 py-2 bg-black border-2 border-gray-700 rounded text-white"
                      />
                    </div>
                  )}

                  <div>
                    <button
                      onClick={() => handleBulkUpdate(batch.date)}
                      disabled={updating || !selectedSource || (isCustom && !customSource)}
                      className="w-full bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {updating ? 'Updating...' : `Update ${batch.count} Leads`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {batches.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-12">
              No leads found with "csv_upload" source
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
