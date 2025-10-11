'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  city: string;
  state: string;
  zip_code: string;
  source: string;
  created_at: string;
}

interface DuplicateGroup {
  leads: Lead[];
  count: number;
  matchType: string;
}

export default function DuplicatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryLeadId, setPrimaryLeadId] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      findDuplicates();
    }
  }, [status]);

  const findDuplicates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/duplicates');
      if (response.ok) {
        const data = await response.json();
        setDuplicateGroups(data.duplicateGroups);
        setTotalDuplicates(data.totalDuplicates);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (index: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGroups(newExpanded);
  };

  const openMergeModal = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setPrimaryLeadId(group.leads[0].id); // Default to oldest lead
    setShowMergeModal(true);
  };

  const handleMerge = async () => {
    if (!selectedGroup || !primaryLeadId) return;

    setMerging(true);
    try {
      const mergeLeadIds = selectedGroup.leads
        .filter(lead => lead.id !== primaryLeadId)
        .map(lead => lead.id);

      const response = await fetch('/api/leads/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepLeadId: primaryLeadId,
          mergeLeadIds
        })
      });

      if (response.ok) {
        setShowMergeModal(false);
        setSelectedGroup(null);
        setPrimaryLeadId(null);
        // Refresh duplicates list
        await findDuplicates();
      } else {
        alert('Failed to merge leads');
      }
    } catch (error) {
      console.error('Error merging leads:', error);
      alert('Error merging leads');
    } finally {
      setMerging(false);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh duplicates list
        await findDuplicates();
      } else {
        alert('Failed to delete lead');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error deleting lead');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'phone':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">📞 Phone Match</span>;
      case 'email':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">✉️ Email Match</span>;
      case 'name+location':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">📍 Name+Location Match</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">Match</span>;
    }
  };

  const formatSource = (source: string) => {
    if (!source || source === 'manual') return 'Manual Entry';
    return source.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl">Finding duplicates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">🔍 Duplicate Leads</h1>
            <div className="flex gap-3">
              <button
                onClick={findDuplicates}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded font-bold transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="mb-6 bg-gray-100 p-4 rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Duplicate Groups Found</div>
              <div className="text-3xl font-bold">{duplicateGroups.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Duplicate Leads</div>
              <div className="text-3xl font-bold">{totalDuplicates}</div>
            </div>
          </div>
        </div>

        {/* Duplicate Groups */}
        {duplicateGroups.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed">
            <div className="text-6xl mb-4">✨</div>
            <div className="text-2xl font-bold mb-2">No Duplicates Found!</div>
            <div className="text-gray-600">Your lead database is clean.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(groupIndex)}
                  className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{expandedGroups.has(groupIndex) ? '▼' : '▶'}</span>
                    <div>
                      <div className="font-bold text-lg">
                        Group {groupIndex + 1}: {group.count} Duplicates
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatName(group.leads[0].first_name)} {formatName(group.leads[0].last_name)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getMatchTypeBadge(group.matchType)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMergeModal(group);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors"
                    >
                      🔗 Merge
                    </button>
                  </div>
                </div>

                {/* Expanded Group Details */}
                {expandedGroups.has(groupIndex) && (
                  <div className="p-4">
                    <div className="space-y-4">
                      {group.leads.map((lead, leadIndex) => (
                        <div
                          key={lead.id}
                          className="border-2 border-gray-200 rounded-lg p-4 hover:border-red-600 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-lg mb-2">
                                {formatName(lead.first_name)} {formatName(lead.last_name)}
                                {leadIndex === 0 && (
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                    Oldest
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600">Phone</div>
                                  <div className="font-semibold">{formatPhoneNumber(lead.phone)}</div>
                                  {lead.phone_2 && (
                                    <div className="font-semibold text-gray-600">{formatPhoneNumber(lead.phone_2)}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-gray-600">Email</div>
                                  <div className="font-semibold">{lead.email || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Location</div>
                                  <div className="font-semibold">
                                    {lead.city && lead.state
                                      ? `${lead.city}, ${lead.state} ${lead.zip_code || ''}`
                                      : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Lead Vendor</div>
                                  <div className="font-semibold text-purple-700">
                                    {formatSource(lead.source)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Created</div>
                                  <div className="font-semibold">
                                    {new Date(lead.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => router.push(`/?leadId=${lead.id}`)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded">
                      <div className="text-sm text-yellow-800">
                        <strong>💡 Tip:</strong> Review these leads carefully. The oldest lead (marked above) is usually the one to keep.
                        You can manually delete duplicates from the main dashboard by viewing each lead.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merge Modal */}
      {showMergeModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">🔗 Merge Duplicate Leads</h2>

              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ How merging works:</strong> Select which lead to keep as the primary record.
                  All notes, activities, policies, and images from the other leads will be moved to the primary lead,
                  then the duplicate leads will be deleted.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {selectedGroup.leads.map((lead, index) => (
                  <div
                    key={lead.id}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      primaryLeadId === lead.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        id={`lead-${lead.id}`}
                        name="primaryLead"
                        checked={primaryLeadId === lead.id}
                        onChange={() => setPrimaryLeadId(lead.id)}
                        className="mt-1 h-5 w-5 text-green-600"
                      />
                      <label htmlFor={`lead-${lead.id}`} className="flex-1 cursor-pointer">
                        <div className="font-bold text-lg mb-2">
                          {formatName(lead.first_name)} {formatName(lead.last_name)}
                          {index === 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              Oldest
                            </span>
                          )}
                          {primaryLeadId === lead.id && (
                            <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Phone</div>
                            <div className="font-semibold">{formatPhoneNumber(lead.phone)}</div>
                            {lead.phone_2 && (
                              <div className="font-semibold text-gray-600">{formatPhoneNumber(lead.phone_2)}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-gray-600">Email</div>
                            <div className="font-semibold">{lead.email || '-'}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Location</div>
                            <div className="font-semibold">
                              {lead.city && lead.state
                                ? `${lead.city}, ${lead.state} ${lead.zip_code || ''}`
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Lead Vendor</div>
                            <div className="font-semibold text-purple-700">
                              {formatSource(lead.source)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Created</div>
                            <div className="font-semibold">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </label>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setSelectedGroup(null);
                    setPrimaryLeadId(null);
                  }}
                  disabled={merging}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black rounded font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging || !primaryLeadId || selectedGroup.leads.length < 2}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors disabled:opacity-50"
                >
                  {merging ? '⏳ Merging...' : '🔗 Merge Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
