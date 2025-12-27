'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lead, LeadActivity, ActivityType, ActivityOutcome, LeadTemperature, LeadStatus, LeadType, ContactMethod, TimestampedNote, LeadImage, LeadPolicy } from '../../../types/lead';
import { formatPhoneNumber, formatName, formatLocation, calculateAge } from '../../../lib/utils';
import NavigationMenu from '../../components/NavigationMenu';

export default function FollowUpsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [temperaturePerformance, setTemperaturePerformance] = useState<{ lead_temperature: string; totalLeads: number; appointments: number; sales: number }[]>([]);

  // Lead detail modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Lead> | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchFollowUpLeads();
      fetchTemperaturePerformance();
    }
  }, [session]);

  const fetchTemperaturePerformance = async () => {
    try {
      const response = await fetch('/api/analytics?period=all');
      if (response.ok) {
        const data = await response.json();
        if (data.aggregateInsights?.temperaturePerformance) {
          setTemperaturePerformance(data.aggregateInsights.temperaturePerformance);
        }
      }
    } catch (error) {
      console.error('Failed to fetch temperature performance:', error);
    }
  };

  const fetchFollowUpLeads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/leads?page=1&limit=1');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.followUpLeads || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  const handleCloseModal = async () => {
    await saveCurrentChanges();
    setShowLeadDetail(false);
    setSelectedLead(null);
  };

  const saveCurrentChanges = async () => {
    if (pendingChanges && selectedLead?.id) {
      try {
        const response = await fetch(`/api/leads/${selectedLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingChanges)
        });
        if (response.ok) {
          const updatedLead = await response.json();
          handleLeadUpdate(updatedLead);
        }
      } catch (error) {
        console.error('Failed to save changes:', error);
      }
      setPendingChanges(null);
    }
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setSelectedLead(updatedLead);
    setLeads(prev => {
      // Check if lead still qualifies for follow-up list
      const isWarmOrHot = updatedLead.lead_temperature === 'warm' || updatedLead.lead_temperature === 'hot';
      const hasFollowUp = updatedLead.next_follow_up && updatedLead.next_follow_up.trim() !== '';

      if (isWarmOrHot && hasFollowUp) {
        return prev.map(l => l.id === updatedLead.id ? updatedLead : l);
      } else {
        // Remove from list if no longer qualifies
        return prev.filter(l => l.id !== updatedLead.id);
      }
    });
  };

  const handleLeadDetailUpdate = async (lead: Lead) => {
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (response.ok) {
        const updatedLead = await response.json();
        handleLeadUpdate(updatedLead);
        setPendingChanges(null);
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleRemoveFollowUp = async (leadId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_follow_up: null }),
      });
      if (response.ok) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
      }
    } catch (error) {
      console.error('Failed to remove follow-up:', error);
    }
  };

  const handleUpdateFollowUpDate = async (leadId: number, newDate: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_follow_up: newDate }),
      });
      if (response.ok) {
        setLeads(prev => prev.map(l =>
          l.id === leadId ? { ...l, next_follow_up: newDate } : l
        ));
        setEditingLeadId(null);
        setEditDate('');
      }
    } catch (error) {
      console.error('Failed to update follow-up date:', error);
    }
  };

  // Helper to parse date strings correctly
  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filter out leads with empty/invalid follow-up dates
  const validLeads = leads.filter(lead =>
    lead.next_follow_up && lead.next_follow_up.trim() !== ''
  );

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Categorize leads
  const overdue = validLeads.filter(lead => {
    const followUpDate = parseDate(lead.next_follow_up!);
    return followUpDate < today;
  }).sort((a, b) => {
    const dateA = parseDate(a.next_follow_up!).getTime();
    const dateB = parseDate(b.next_follow_up!).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.lead_temperature === 'hot' ? -1 : 1;
  });

  const todayLeads = validLeads.filter(lead => {
    const followUpDate = parseDate(lead.next_follow_up!);
    return followUpDate.getTime() === today.getTime();
  }).sort((a, b) => a.lead_temperature === 'hot' ? -1 : 1);

  const upcoming = validLeads.filter(lead => {
    const followUpDate = parseDate(lead.next_follow_up!);
    return followUpDate > today && followUpDate <= sevenDaysFromNow;
  }).sort((a, b) => {
    const dateA = parseDate(a.next_follow_up!).getTime();
    const dateB = parseDate(b.next_follow_up!).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.lead_temperature === 'hot' ? -1 : 1;
  });

  const future = validLeads.filter(lead => {
    const followUpDate = parseDate(lead.next_follow_up!);
    return followUpDate > sevenDaysFromNow;
  }).sort((a, b) => {
    const dateA = parseDate(a.next_follow_up!).getTime();
    const dateB = parseDate(b.next_follow_up!).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.lead_temperature === 'hot' ? -1 : 1;
  });

  const formatDate = (dateString: string) => {
    const date = parseDate(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year !== currentYear) {
      return `${month}/${day}/${year}`;
    }
    return `${month}/${day}`;
  };

  const handleStartEdit = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLeadId(lead.id!);
    setEditDate(lead.next_follow_up || '');
  };

  const handleSaveDate = async (leadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editDate) {
      await handleUpdateFollowUpDate(leadId, editDate);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLeadId(null);
    setEditDate('');
  };

  // Get current lead index for navigation
  const currentLeadIndex = selectedLead ? validLeads.findIndex(l => l.id === selectedLead.id) : -1;

  const handleNextLead = async () => {
    await saveCurrentChanges();
    if (currentLeadIndex < validLeads.length - 1) {
      setSelectedLead(validLeads[currentLeadIndex + 1]);
    }
  };

  const handlePrevLead = async () => {
    await saveCurrentChanges();
    if (currentLeadIndex > 0) {
      setSelectedLead(validLeads[currentLeadIndex - 1]);
    }
  };

  const LeadCard = ({ lead, category }: { lead: Lead; category: 'overdue' | 'today' | 'upcoming' | 'future' }) => {
    const isEditing = editingLeadId === lead.id;

    return (
      <div
        onClick={() => handleLeadClick(lead)}
        className="p-4 bg-white border border-gray-200 rounded-lg hover:border-red-600 hover:shadow-md cursor-pointer transition-all relative group"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveFollowUp(lead.id!);
          }}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity text-sm font-bold"
          title="Remove follow-up"
        >
          ×
        </button>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="font-semibold text-base text-gray-900">
              {formatName(lead.first_name)} {formatName(lead.last_name)}
            </div>
            <div className="text-sm text-gray-500">{formatPhoneNumber(lead.phone)}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-sm px-3 py-1 rounded ${
              lead.lead_temperature === 'hot'
                ? 'bg-red-100 text-red-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {lead.lead_temperature === 'hot' ? '🔥 Hot' : '☀️ Warm'}
            </span>
            {lead.contact_attempt_count && lead.contact_attempt_count > 0 && (
              <span className="text-sm px-3 py-1 rounded bg-blue-100 text-blue-800">
                #{lead.contact_attempt_count}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => handleSaveDate(lead.id!, e)}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                ✓
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-sm bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                category === 'overdue' ? 'text-red-600' :
                category === 'today' ? 'text-green-600' :
                category === 'upcoming' ? 'text-blue-600' :
                'text-gray-500'
              }`}>
                {category === 'overdue' && '⚠️ '}
                {category === 'today' && '📅 '}
                {category === 'upcoming' && '📆 '}
                {category === 'future' && '🔮 '}
                {formatDate(lead.next_follow_up!)}
              </span>
              <button
                onClick={(e) => handleStartEdit(lead, e)}
                className="text-sm text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✏️
              </button>
            </div>
          )}
          <span className="text-sm text-gray-500">
            {formatLocation(lead.city)}, {formatLocation(lead.state)}
          </span>
        </div>
      </div>
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white p-3 sm:p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1
                onClick={() => router.push('/')}
                className="text-2xl sm:text-4xl font-black cursor-pointer hover:text-red-400 transition-colors"
              >🔥 The Warm Well</h1>
            </div>
            <NavigationMenu currentPage="follow-ups" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Lead Temperature Conversion Module - Only Hot and Warm */}
        {(() => {
          // Count leads currently in The Warm Well
          const hotLeadsInWell = validLeads.filter(l => l.lead_temperature === 'hot').length;
          const warmLeadsInWell = validLeads.filter(l => l.lead_temperature === 'warm').length;

          // Get all-time conversion rates from analytics
          const hotStats = temperaturePerformance.find(t => t.lead_temperature === 'hot');
          const warmStats = temperaturePerformance.find(t => t.lead_temperature === 'warm');

          const hotApptRate = hotStats && hotStats.totalLeads > 0 ? (hotStats.appointments / hotStats.totalLeads) * 100 : 0;
          const hotCloseRate = hotStats && hotStats.totalLeads > 0 ? (hotStats.sales / hotStats.totalLeads) * 100 : 0;
          const warmApptRate = warmStats && warmStats.totalLeads > 0 ? (warmStats.appointments / warmStats.totalLeads) * 100 : 0;
          const warmCloseRate = warmStats && warmStats.totalLeads > 0 ? (warmStats.sales / warmStats.totalLeads) * 100 : 0;

          return (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-500 text-white p-4 rounded-lg border-2 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase opacity-90">Hot Leads</div>
                      <div className="text-2xl font-black">{hotLeadsInWell}</div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="text-xs opacity-90">Appt Rate</div>
                        <div className="text-lg font-bold">{hotApptRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-90">Close Rate</div>
                        <div className="text-lg font-bold">{hotCloseRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-500 text-white p-4 rounded-lg border-2 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase opacity-90">Warm Leads</div>
                      <div className="text-2xl font-black">{warmLeadsInWell}</div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="text-xs opacity-90">Appt Rate</div>
                        <div className="text-lg font-bold">{warmApptRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-90">Close Rate</div>
                        <div className="text-lg font-bold">{warmCloseRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {validLeads.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No warm or hot leads with follow-ups scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Row - 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overdue Section */}
              <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
                <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                  <span>⚠️</span>
                  Overdue ({overdue.length})
                </h2>
                {overdue.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No overdue follow-ups</p>
                ) : (
                  <div className="space-y-3">
                    {overdue.map(lead => (
                      <LeadCard key={lead.id} lead={lead} category="overdue" />
                    ))}
                  </div>
                )}
              </div>

              {/* Today Section */}
              <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4">
                <h2 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                  <span>📅</span>
                  Today ({todayLeads.length})
                </h2>
                {todayLeads.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No follow-ups for today</p>
                ) : (
                  <div className="space-y-3">
                    {todayLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} category="today" />
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Section */}
              <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
                <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                  <span>📆</span>
                  Upcoming 7 Days ({upcoming.length})
                </h2>
                {upcoming.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No upcoming follow-ups</p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map(lead => (
                      <LeadCard key={lead.id} lead={lead} category="upcoming" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Future Section - Full Width */}
            <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-500 mb-4 flex items-center gap-2">
                <span>🔮</span>
                Future ({future.length})
              </h2>
              {future.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No future follow-ups</p>
              ) : (
                <div
                  className="overflow-y-auto pr-2"
                  style={{ maxHeight: '400px' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {future.map(lead => (
                      <LeadCard key={lead.id} lead={lead} category="future" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Modal - Same as Dashboard */}
      {showLeadDetail && selectedLead && (
        <ResizableMovableModal
          onClose={handleCloseModal}
          onNext={handleNextLead}
          onPrevious={handlePrevLead}
          hasNext={currentLeadIndex < validLeads.length - 1}
          hasPrevious={currentLeadIndex > 0}
          currentIndex={currentLeadIndex}
          totalCount={validLeads.length}
        >
          <LeadDetailForm
            lead={selectedLead}
            onUpdate={handleLeadDetailUpdate}
            onClose={handleCloseModal}
            setPendingChanges={setPendingChanges}
            session={session}
            onLeadChange={(updatedLead) => {
              setSelectedLead(updatedLead);
              setLeads(prevLeads => prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l));
            }}
          />
        </ResizableMovableModal>
      )}
    </div>
  );
}

// ResizableMovableModal Component - Same as Dashboard
function ResizableMovableModal({
  children,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  currentIndex,
  totalCount
}: {
  children: React.ReactNode;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  currentIndex?: number;
  totalCount?: number;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('modal-size');
      if (savedSize) {
        try {
          const parsed = JSON.parse(savedSize);
          if (parsed.width >= 400 && parsed.height >= 300 &&
              parsed.width <= window.innerWidth && parsed.height <= window.innerHeight) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return { width: 1000, height: 600 };
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [justFinishedResizing, setJustFinishedResizing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const saveSize = (newSize: { width: number; height: number }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('modal-size', JSON.stringify(newSize));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setHasInteracted(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setJustFinishedResizing(true);
    }
    setIsDragging(false);
    setIsResizing(false);
    setTimeout(() => setHasInteracted(false), 100);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setHasInteracted(true);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        const newWidth = Math.max(400, e.clientX - rect.left);
        const newHeight = Math.max(300, e.clientY - rect.top);
        setSize({ width: newWidth, height: newHeight });
      }
    }
  };

  useEffect(() => {
    if (!isInitialized) {
      const centerX = (window.innerWidth - size.width) / 2;
      const centerY = (window.innerHeight - size.height) / 2;
      setPosition({
        x: Math.max(0, centerX),
        y: Math.max(0, centerY)
      });
      setIsInitialized(true);
    }
  }, [isInitialized, size]);

  useEffect(() => {
    if (justFinishedResizing) {
      saveSize(size);
      setJustFinishedResizing(false);
    }
  }, [justFinishedResizing, size]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset]);

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDragging && !isResizing && !hasInteracted) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="absolute bg-white rounded-lg shadow-xl border"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Drag Handle Header */}
        <div
          className="drag-handle bg-gray-100 rounded-t-lg px-4 py-2 cursor-grab border-b flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2">
            {onPrevious && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                disabled={!hasPrevious}
                className={`p-1 rounded ${hasPrevious ? 'text-gray-700 hover:bg-gray-200' : 'text-gray-400 cursor-not-allowed'}`}
              >
                ←
              </button>
            )}
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-sm text-gray-600">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
            {onNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                disabled={!hasNext}
                className={`p-1 rounded ${hasNext ? 'text-gray-700 hover:bg-gray-200' : 'text-gray-400 cursor-not-allowed'}`}
              >
                →
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">Drag to move</div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
          {children}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'linear-gradient(-45deg, transparent 30%, #666 30%, #666 40%, transparent 40%, transparent 60%, #666 60%, #666 70%, transparent 70%)'
          }}
        />
      </div>
    </div>
  );
}

// Lead Detail Form Component - Same as Dashboard
function LeadDetailForm({
  lead,
  onUpdate,
  onClose,
  setPendingChanges,
  onLeadChange,
  session
}: {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
  onClose: () => void;
  setPendingChanges: (changes: Partial<Lead> | null) => void;
  onLeadChange?: (lead: Lead) => void;
  session: any;
}) {
  const [formData, setFormData] = useState({
    first_name: formatName(lead.first_name),
    last_name: formatName(lead.last_name),
    email: lead.email,
    phone: formatPhoneNumber(lead.phone),
    phone_2: formatPhoneNumber(lead.phone_2 || ''),
    company: lead.company || '',
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || '',
    zip_code: lead.zip_code || '',
    date_of_birth: lead.date_of_birth || '',
    age: lead.age || 0,
    gender: lead.gender || '',
    marital_status: lead.marital_status || '',
    occupation: lead.occupation || '',
    income: lead.income || '',
    household_size: lead.household_size || 0,
    status: lead.status,
    contact_method: lead.contact_method || 'phone' as ContactMethod,
    lead_type: lead.lead_type,
    cost_per_lead: lead.cost_per_lead,
    sales_amount: lead.sales_amount,
    notes: lead.notes || '',
    source: lead.source,
    lead_score: lead.lead_score || 0,
    last_contact_date: lead.last_contact_date || '',
    next_follow_up: lead.next_follow_up || ''
  });

  useEffect(() => {
    setFormData({
      first_name: formatName(lead.first_name),
      last_name: formatName(lead.last_name),
      email: lead.email,
      phone: formatPhoneNumber(lead.phone),
      phone_2: formatPhoneNumber(lead.phone_2 || ''),
      company: lead.company || '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      zip_code: lead.zip_code || '',
      date_of_birth: lead.date_of_birth || '',
      age: lead.age || 0,
      gender: lead.gender || '',
      marital_status: lead.marital_status || '',
      occupation: lead.occupation || '',
      income: lead.income || '',
      household_size: lead.household_size || 0,
      status: lead.status,
      contact_method: lead.contact_method || 'phone' as ContactMethod,
      lead_type: lead.lead_type,
      cost_per_lead: lead.cost_per_lead,
      sales_amount: lead.sales_amount,
      notes: lead.notes || '',
      source: lead.source,
      lead_score: lead.lead_score || 0,
      last_contact_date: lead.last_contact_date || '',
      next_follow_up: lead.next_follow_up || ''
    });
  }, [lead]);

  const handleFormChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    const changes: Partial<Lead> = {};
    Object.keys(newFormData).forEach(key => {
      if (newFormData[key as keyof typeof newFormData] !== lead[key as keyof Lead]) {
        (changes as any)[key] = newFormData[key as keyof typeof newFormData];
      }
    });
    setPendingChanges(Object.keys(changes).length > 0 ? changes : null);
  };

  const handleDateOfBirthChange = (dateValue: string) => {
    const calculatedAge = calculateAge(dateValue);
    const newFormData = { ...formData, date_of_birth: dateValue, age: calculatedAge };
    setFormData(newFormData);

    const changes: Partial<Lead> = {};
    Object.keys(newFormData).forEach(key => {
      if (newFormData[key as keyof typeof newFormData] !== lead[key as keyof Lead]) {
        (changes as any)[key] = newFormData[key as keyof typeof newFormData];
      }
    });
    setPendingChanges(Object.keys(changes).length > 0 ? changes : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...lead, ...formData });
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="text-md font-semibold mb-3">Basic Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleFormChange('first_name', formatName(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleFormChange('last_name', formatName(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', formatPhoneNumber(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="text-md font-semibold mb-3">Address</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', formatLocation(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleFormChange('state', formatLocation(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => handleFormChange('zip_code', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="text-md font-semibold mb-3">Personal Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="text"
                    placeholder="MM/DD/YYYY or YYYY-MM-DD"
                    value={formData.date_of_birth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (auto-calculated)</label>
                  <input
                    type="number"
                    value={formData.age}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFormChange('gender', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => handleFormChange('marital_status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lead Management */}
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="text-md font-semibold mb-3">Lead Management</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value as LeadStatus)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="no_answer">No Answer</option>
                    <option value="follow_up_needed">Follow Up</option>
                    <option value="not_set">Not Set</option>
                    <option value="appointment_set">Appointment Set</option>
                    <option value="pending">Pending</option>
                    <option value="issued">Issued</option>
                    <option value="refund_needed">Refund Needed</option>
                    <option value="closed">Closed</option>
                    <option value="tol">TOL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Method</label>
                  <select
                    value={formData.contact_method}
                    onChange={(e) => handleFormChange('contact_method', e.target.value as ContactMethod)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Select Method</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                  <select
                    value={formData.lead_type}
                    onChange={(e) => handleFormChange('lead_type', e.target.value as LeadType)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="other">Other</option>
                    <option value="t65">T65 (Medicare)</option>
                    <option value="t65_wl">T65 WL</option>
                    <option value="life">Life Insurance</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => handleFormChange('source', e.target.value)}
                    placeholder="e.g., Melissa Medicare, Integrity Life"
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
                {(session?.user as any)?.role !== 'setter' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Lead</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_per_lead.toFixed(2)}
                        onChange={(e) => handleFormChange('cost_per_lead', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sales Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sales_amount}
                        onChange={(e) => handleFormChange('sales_amount', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Update Lead
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Activities, Notes, Images, and Policies */}
        <div className="lg:col-span-1 space-y-6">
          <ActivitiesSection
            leadId={lead.id!}
            lead={lead}
            session={session}
            onLeadUpdate={(updatedLead) => {
              if (onLeadChange) {
                onLeadChange(updatedLead);
              }
            }}
          />
          <NotesSection leadId={lead.id!} />
          <ImagesSection leadId={lead.id!} />
          <PoliciesSection leadId={lead.id!} />
        </div>
      </div>
    </div>
  );
}

// ActivitiesSection Component
function ActivitiesSection({ leadId, lead, onLeadUpdate, session }: { leadId: number; lead: Lead; onLeadUpdate: (lead: Lead) => void; session: any }) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(true);
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [activityDetail, setActivityDetail] = useState('');
  const [activityOutcome, setActivityOutcome] = useState<ActivityOutcome | ''>('no_answer');
  const [dialCount, setDialCount] = useState(1);
  const [leadTemperature, setLeadTemperature] = useState<LeadTemperature | ''>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [appointmentEndDateTime, setAppointmentEndDateTime] = useState('');

  useEffect(() => {
    fetchActivities();
    setShowActivityForm(true);
    setActivityType('call');
    setActivityOutcome('no_answer');
    setDialCount(1);
    setActivityDetail('');
    setLeadTemperature('');
    setNextFollowUpDate('');
    setAppointmentDateTime('');
    setAppointmentEndDateTime('');
  }, [leadId]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const addActivity = async () => {
    if (isLoading) return;

    let detail = activityDetail.trim();
    if (!detail && activityOutcome) {
      const outcomeMessages: { [key: string]: string } = {
        'answered': 'Call answered',
        'no_answer': 'No answer',
        'scheduled': 'Appointment scheduled',
        'disconnected': 'Phone disconnected'
      };
      detail = outcomeMessages[activityOutcome] || `${activityType} - ${activityOutcome}`;
    }

    if (!detail && !activityOutcome) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          activity_type: activityType,
          activity_detail: detail,
          outcome: activityOutcome || null,
          lead_temperature_after: leadTemperature || null,
          next_follow_up_date: nextFollowUpDate || null,
          dial_count: activityType === 'call' ? dialCount : 0
        })
      });

      if (response.ok) {
        if (activityOutcome === 'scheduled' && appointmentDateTime) {
          const userRole = (session?.user as any)?.role;
          const userId = (session?.user as any)?.id;
          let agentId = userId;

          if (userRole === 'setter') {
            const agentIdValue = (session?.user as any)?.agent_id;
            if (agentIdValue) {
              agentId = agentIdValue;
            }
          }

          await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: agentId,
              lead_id: leadId,
              title: `Appointment: ${lead.first_name} ${lead.last_name}`,
              description: `${lead.address || ''}\n${lead.city || ''}, ${lead.state || ''} ${lead.zip_code || ''}\nPhone: ${lead.phone || ''}`,
              start_time: appointmentDateTime,
              end_time: appointmentEndDateTime || appointmentDateTime,
              event_type: 'appointment',
            }),
          });
        }

        setActivityDetail('');
        setActivityOutcome('no_answer');
        setLeadTemperature('');
        setNextFollowUpDate('');
        setDialCount(1);
        setAppointmentDateTime('');
        setAppointmentEndDateTime('');
        setShowActivityForm(false);
        await fetchActivities();

        const leadResponse = await fetch(`/api/leads/${leadId}`);
        if (leadResponse.ok) {
          const updatedLead = await leadResponse.json();
          onLeadUpdate({ ...lead, ...updatedLead });
        }
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteActivity = async (activityId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities/${activityId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchActivities();
      }
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Denver',
      hour12: true
    }).format(date);
  };

  const getActivityTypeIcon = (type: ActivityType) => {
    switch(type) {
      case 'call': return '📞';
      case 'text': return '💬';
      case 'email': return '📧';
      default: return '📋';
    }
  };

  const getOutcomeColor = (outcome: ActivityOutcome) => {
    switch(outcome) {
      case 'answered': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'no_answer': return 'bg-gray-100 text-gray-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h4 className="text-lg font-semibold mb-4 text-gray-900">Activity Timeline</h4>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => { setActivityType('call'); setShowActivityForm(true); }}
          className={`px-2 py-2 rounded text-xs transition-colors ${
            activityType === 'call' ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          📞 Call
        </button>
        <button
          onClick={() => { setActivityType('text'); setShowActivityForm(true); }}
          className={`px-2 py-2 rounded text-xs transition-colors ${
            activityType === 'text' ? 'bg-green-600 text-white font-bold' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          💬 Text
        </button>
      </div>

      {showActivityForm && (
        <div className="mb-4 bg-gray-50 p-3 rounded border">
          {activityType === 'call' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Number of Dials</label>
              <select
                value={dialCount}
                onChange={(e) => setDialCount(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
              >
                <option value={1}>1 dial</option>
                <option value={2}>2 dials</option>
              </select>
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
            <select
              value={activityOutcome}
              onChange={(e) => setActivityOutcome(e.target.value as ActivityOutcome | '')}
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
            >
              <option value="no_answer">No Answer</option>
              <option value="answered">Answered</option>
              <option value="scheduled">Scheduled</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>

          {activityOutcome === 'scheduled' && (
            <div className="space-y-2 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Appointment Date *</label>
                <input
                  type="date"
                  value={appointmentDateTime.split('T')[0] || ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = appointmentDateTime.split('T')[1] || '08:00';
                    setAppointmentDateTime(`${date}T${time}`);
                    if (appointmentEndDateTime) {
                      const endTime = appointmentEndDateTime.split('T')[1];
                      setAppointmentEndDateTime(`${date}T${endTime}`);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time *</label>
                  <select
                    value={appointmentDateTime.split('T')[1] || '08:00'}
                    onChange={(e) => {
                      const time = e.target.value;
                      const date = appointmentDateTime.split('T')[0] || (() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                      })();
                      setAppointmentDateTime(`${date}T${time}`);
                      const [hours, minutes] = time.split(':').map(Number);
                      let endHour = hours + 1;
                      if (endHour >= 24) endHour = 23;
                      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                      setAppointmentEndDateTime(`${date}T${endTime}`);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                  >
                    {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(t => {
                      const [h, m] = t.split(':').map(Number);
                      const label = `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                      return <option key={t} value={t}>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <select
                    value={appointmentEndDateTime.split('T')[1] || '09:00'}
                    onChange={(e) => {
                      const time = e.target.value;
                      const date = appointmentDateTime.split('T')[0] || (() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                      })();
                      setAppointmentEndDateTime(`${date}T${time}`);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                  >
                    {['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'].map(t => {
                      const [h, m] = t.split(':').map(Number);
                      const label = `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                      return <option key={t} value={t}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lead Temperature</label>
              <select
                value={leadTemperature}
                onChange={(e) => setLeadTemperature(e.target.value as LeadTemperature | '')}
                className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
              >
                <option value="">Not set</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">☀️ Warm</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Next Follow-Up</label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 border border-yellow-300 rounded p-2 hover:bg-yellow-100 transition-colors">
              <input
                type="checkbox"
                checked={lead?.wrong_info || false}
                onChange={async (e) => {
                  if (!lead?.id) return;
                  const newValue = e.target.checked;
                  try {
                    const response = await fetch(`/api/leads/${lead.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ wrong_info: newValue }),
                    });
                    if (response.ok) {
                      const updatedLead = await response.json();
                      onLeadUpdate(updatedLead);
                    }
                  } catch (error) {
                    console.error('Error updating wrong info:', error);
                  }
                }}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-xs font-medium text-gray-700">
                ⚠️ Mark as Wrong Info
              </span>
            </label>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Additional Details (Optional)</label>
            <textarea
              value={activityDetail}
              onChange={(e) => setActivityDetail(e.target.value)}
              placeholder="Add notes if needed..."
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none resize-none text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addActivity}
              disabled={(!activityDetail.trim() && !activityOutcome) || isLoading}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Activity'}
            </button>
            <button
              onClick={() => {
                setShowActivityForm(false);
                setActivityDetail('');
                setActivityOutcome('');
                setLeadTemperature('');
                setNextFollowUpDate('');
                setDialCount(1);
              }}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No activities yet</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="bg-gray-50 p-3 rounded border border-gray-200 relative">
              <div className="flex items-start gap-2">
                <span className="text-lg">{getActivityTypeIcon(activity.activity_type)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{activity.activity_type}</span>
                    {activity.outcome && (
                      <span className={`px-2 py-0.5 rounded text-xs ${getOutcomeColor(activity.outcome)}`}>
                        {activity.outcome.replace('_', ' ')}
                      </span>
                    )}
                    {activity.activity_type === 'call' && activity.total_dials_at_time && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        Dial #{activity.total_dials_at_time}
                      </span>
                    )}
                    {activity.lead_temperature_after && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                        {activity.lead_temperature_after === 'hot' && '🔥 Hot'}
                        {activity.lead_temperature_after === 'warm' && '☀️ Warm'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mb-1">{activity.activity_detail}</p>
                  {activity.next_follow_up_date && (
                    <p className="text-xs text-blue-600 mb-1">
                      📅 Follow up: {new Date(activity.next_follow_up_date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">{formatActivityDate(activity.created_at!)}</p>
                    <button
                      onClick={() => {
                        if (confirm('Delete this activity?')) {
                          deleteActivity(activity.id!);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// NotesSection Component
function NotesSection({ leadId }: { leadId: number }) {
  const [notes, setNotes] = useState<TimestampedNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() })
      });

      if (response.ok) {
        setNewNote('');
        await fetchNotes();
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Denver',
      hour12: true
    }).format(date);
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h4 className="text-lg font-semibold mb-4 text-gray-900">Notes</h4>

      <div className="mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a new note..."
          className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none resize-none"
          rows={3}
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim() || isLoading}
          className="mt-2 w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 text-sm">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-800 mb-2">{note.note}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{formatNoteDate(note.created_at)}</span>
                <button
                  onClick={() => deleteNote(note.id!)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ImagesSection Component
function ImagesSection({ leadId }: { leadId: number }) {
  const [images, setImages] = useState<LeadImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LeadImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages();
  }, [leadId]);

  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/leads/${leadId}/images`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        await fetchImages();
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteImage = async (imageId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/images/${imageId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchImages();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h4 className="text-lg font-semibold mb-4 text-gray-900">Images</h4>

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={uploadImage}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {images.length === 0 ? (
          <p className="text-gray-500 text-sm">No images uploaded</p>
        ) : (
          images.map((image) => (
            <div key={image.id} className="bg-gray-50 p-3 rounded border">
              <div className="flex items-start gap-3">
                <img
                  src={image.file_path}
                  alt={image.original_name}
                  className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onDoubleClick={() => setSelectedImage(image)}
                  title="Double-click to view full size"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{image.original_name}</p>
                  <p className="text-xs text-gray-500">{(image.file_size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-gray-500">{new Date(image.uploaded_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => deleteImage(image.id!)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img
              src={selectedImage.file_path}
              alt={selectedImage.original_name}
              className="max-w-full max-h-full object-contain rounded"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              ×
            </button>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
              {selectedImage.original_name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PoliciesSection Component
function PoliciesSection({ leadId }: { leadId: number }) {
  const [policies, setPolicies] = useState<LeadPolicy[]>([]);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    policy_type: '',
    policy_number: '',
    coverage_amount: '',
    premium_amount: '',
    commission_amount: '',
    start_date: '',
    end_date: '',
    status: 'pending' as const,
    notes: ''
  });

  useEffect(() => {
    fetchPolicies();
  }, [leadId]);

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/policies`);
      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    }
  };

  const addPolicy = async () => {
    if (!newPolicy.policy_type.trim()) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPolicy,
          coverage_amount: newPolicy.coverage_amount ? parseFloat(newPolicy.coverage_amount) : undefined,
          premium_amount: newPolicy.premium_amount ? parseFloat(newPolicy.premium_amount) : undefined,
          commission_amount: newPolicy.commission_amount ? parseFloat(newPolicy.commission_amount) : undefined
        })
      });

      if (response.ok) {
        setNewPolicy({
          policy_type: '',
          policy_number: '',
          coverage_amount: '',
          premium_amount: '',
          commission_amount: '',
          start_date: '',
          end_date: '',
          status: 'pending',
          notes: ''
        });
        setIsAddingPolicy(false);
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to add policy:', error);
    }
  };

  const deletePolicy = async (policyId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/policies/${policyId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Policies</h4>
        <button
          onClick={() => setIsAddingPolicy(!isAddingPolicy)}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
        >
          {isAddingPolicy ? 'Cancel' : 'Add Policy'}
        </button>
      </div>

      {isAddingPolicy && (
        <div className="mb-4 p-3 bg-gray-50 rounded border space-y-3">
          <input
            type="text"
            placeholder="Policy Type (e.g., Life, Health)"
            value={newPolicy.policy_type}
            onChange={(e) => setNewPolicy({...newPolicy, policy_type: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Policy Number"
            value={newPolicy.policy_number}
            onChange={(e) => setNewPolicy({...newPolicy, policy_number: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Coverage Amount"
              value={newPolicy.coverage_amount}
              onChange={(e) => setNewPolicy({...newPolicy, coverage_amount: e.target.value})}
              className="p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Premium Amount"
              value={newPolicy.premium_amount}
              onChange={(e) => setNewPolicy({...newPolicy, premium_amount: e.target.value})}
              className="p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
          </div>
          <input
            type="number"
            step="0.01"
            placeholder="Est. Commission Earned"
            value={newPolicy.commission_amount}
            onChange={(e) => setNewPolicy({...newPolicy, commission_amount: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
          />
          <select
            value={newPolicy.status}
            onChange={(e) => setNewPolicy({...newPolicy, status: e.target.value as any})}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={addPolicy}
            className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Add Policy
          </button>
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {policies.length === 0 ? (
          <p className="text-gray-500 text-sm">No policies added</p>
        ) : (
          policies.map((policy) => (
            <div key={policy.id} className="bg-gray-50 p-3 rounded border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-sm font-medium text-gray-900">{policy.policy_type}</h5>
                  {policy.policy_number && (
                    <p className="text-xs text-gray-600">#{policy.policy_number}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(policy.status)}`}>
                    {policy.status}
                  </span>
                  <button
                    onClick={() => deletePolicy(policy.id!)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {(policy.coverage_amount || policy.premium_amount || policy.commission_amount) && (
                <div className="text-xs text-gray-600">
                  {policy.coverage_amount && <span>Coverage: ${policy.coverage_amount.toLocaleString()} </span>}
                  {policy.premium_amount && <span>Premium: ${policy.premium_amount.toLocaleString()} </span>}
                  {policy.commission_amount && <span className="font-bold text-green-600">Commission: ${policy.commission_amount.toLocaleString()}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
