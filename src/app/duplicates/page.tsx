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
                  <div>
                    {getMatchTypeBadge(group.matchType)}
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
    </div>
  );
}
