'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lead, LeadStatus, ContactMethod, LeadType } from '../../types/lead';
import { formatPhoneNumber, formatName, formatLocation, formatDateForInput, calculateAge } from '../../lib/utils';
import { TimestampedNote, LeadImage, LeadPolicy, LeadActivity, ActivityType, ActivityOutcome, LeadTemperature } from '../../types/lead';

// Follow-Up Reminders Component
function FollowUpReminders({
  leads,
  onLeadClick,
  onRemoveFollowUp,
  onUpdateFollowUpDate
}: {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onRemoveFollowUp: (leadId: number) => void;
  onUpdateFollowUpDate: (leadId: number, newDate: string) => Promise<void>;
}) {
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter for warm/hot leads with follow-up dates
  const followUpLeads = leads.filter(lead =>
    (lead.lead_temperature === 'warm' || lead.lead_temperature === 'hot') &&
    lead.next_follow_up
  );

  // Categorize leads
  const overdue = followUpLeads.filter(lead => {
    const followUpDate = new Date(lead.next_follow_up!);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate < today;
  }).sort((a, b) => {
    // Sort by date first (soonest first), then by temperature (hot before warm)
    const dateA = new Date(a.next_follow_up!).getTime();
    const dateB = new Date(b.next_follow_up!).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return a.lead_temperature === 'hot' ? -1 : 1;
  });

  const todayLeads = followUpLeads.filter(lead => {
    const followUpDate = new Date(lead.next_follow_up!);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate.getTime() === today.getTime();
  }).sort((a, b) => a.lead_temperature === 'hot' ? -1 : 1);

  const upcoming = followUpLeads.filter(lead => {
    const followUpDate = new Date(lead.next_follow_up!);
    followUpDate.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return followUpDate > today && followUpDate <= sevenDaysFromNow;
  }).sort((a, b) => {
    // Sort by date first (soonest first), then by temperature (hot before warm)
    const dateA = new Date(a.next_follow_up!).getTime();
    const dateB = new Date(b.next_follow_up!).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    return a.lead_temperature === 'hot' ? -1 : 1;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
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
      await onUpdateFollowUpDate(leadId, editDate);
      setEditingLeadId(null);
      setEditDate('');
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLeadId(null);
    setEditDate('');
  };

  const LeadCard = ({ lead, category }: { lead: Lead; category: 'overdue' | 'today' | 'upcoming' }) => {
    const isEditing = editingLeadId === lead.id;

    return (
    <div
      onClick={() => onLeadClick(lead)}
      className="p-3 bg-white border border-gray-200 rounded hover:border-red-600 hover:shadow-md cursor-pointer transition-all relative group"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemoveFollowUp(lead.id!);
        }}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity text-xs font-bold"
        title="Remove follow-up"
      >
        ×
      </button>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">
            {formatName(lead.first_name)} {formatName(lead.last_name)}
          </div>
          <div className="text-xs text-gray-500">{formatPhoneNumber(lead.phone)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded ${
            lead.lead_temperature === 'hot'
              ? 'bg-red-100 text-red-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            {lead.lead_temperature === 'hot' ? '🔥 Hot' : '☀️ Warm'}
          </span>
          {lead.contact_attempt_count && lead.contact_attempt_count > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              #{lead.contact_attempt_count}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        {isEditing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => handleSaveDate(lead.id!, e)}
              className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
              title="Save"
            >
              ✓
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded hover:bg-gray-500"
              title="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${
              category === 'overdue' ? 'text-red-600' :
              category === 'today' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {category === 'overdue' && '⚠️ '}
              {category === 'today' && '📅 '}
              {formatDate(lead.next_follow_up!)}
            </span>
            <button
              onClick={(e) => handleStartEdit(lead, e)}
              className="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit date"
            >
              ✏️
            </button>
          </div>
        )}
        <span className="text-xs text-gray-500">
          {formatLocation(lead.city)}, {formatLocation(lead.state)}
        </span>
      </div>
    </div>
    );
  };

  return (
    <div className="bg-gray-50 border-2 border-red-600 rounded overflow-hidden">
      <div className="p-3 sm:p-4 pb-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🎯</span>
          Follow-Up Reminders
        </h3>
      </div>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">

      {followUpLeads.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No warm or hot leads</p>
          <p>with follow-ups scheduled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1">
                <span>⚠️</span>
                Overdue ({overdue.length})
              </h4>
              <div className="space-y-2">
                {overdue.map(lead => (
                  <LeadCard key={lead.id} lead={lead} category="overdue" />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          {todayLeads.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                <span>📅</span>
                Today ({todayLeads.length})
              </h4>
              <div className="space-y-2">
                {todayLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} category="today" />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Upcoming 7 Days ({upcoming.length})
              </h4>
              <div className="space-y-2">
                {upcoming.map(lead => (
                  <LeadCard key={lead.id} lead={lead} category="upcoming" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// Resizable and Movable Modal Component
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
    // Load saved size from localStorage or use defaults
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('modal-size');
      if (savedSize) {
        try {
          const parsed = JSON.parse(savedSize);
          // Validate the saved values
          if (parsed.width >= 400 && parsed.height >= 300 && 
              parsed.width <= window.innerWidth && parsed.height <= window.innerHeight) {
            console.log('Loading saved modal size:', parsed);
            return parsed;
          }
        } catch (e) {
          // If parsing fails, use defaults
        }
      }
    }
    console.log('Using default modal size: { width: 1000, height: 600 }');
    return { width: 1000, height: 600 };
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [justFinishedResizing, setJustFinishedResizing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Save size to localStorage
  const saveSize = (newSize: { width: number; height: number }) => {
    if (typeof window !== 'undefined') {
      console.log('Saving modal size:', newSize);
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
    // Mark that we just finished resizing
    if (isResizing) {
      setJustFinishedResizing(true);
    }
    
    setIsDragging(false);
    setIsResizing(false);
    // Reset interaction flag after a small delay to prevent accidental close
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

  // Center the modal on first load
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

  // Save size when resizing is complete
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
            {/* Navigation arrows */}
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

function HomeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Lead[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [wrongInfoCount, setWrongInfoCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [overallTotalCount, setOverallTotalCount] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [vendorName, setVendorName] = useState<string>('');
  const [leadTemperature, setLeadTemperature] = useState<'cold' | 'warm' | 'hot'>('cold');
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [currentLeadIndex, setCurrentLeadIndex] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<Partial<Lead> | null>(null);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string>('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showBulkDeleteButton, setShowBulkDeleteButton] = useState(false);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    lead_type: '',
    city: '',
    state: '',
    zip_code: '',
    age_min: '',
    age_max: '',
    source: '',
    temperature: '',
    search: ''
  });
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [actualSalesRevenue, setActualSalesRevenue] = useState<number>(0);
  const [paidLeadRevenue, setPaidLeadRevenue] = useState<number>(0);
  const [emailStats, setEmailStats] = useState<{ leadsWithEmails: number; percentage: number }>({ leadsWithEmails: 0, percentage: 0 });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    phone_2: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    date_of_birth: '',
    age: 0,
    gender: '',
    marital_status: '',
    occupation: '',
    income: '',
    household_size: 0,
    status: 'appointment_set' as LeadStatus,
    contact_method: 'phone' as ContactMethod,
    lead_type: 'other' as LeadType,
    cost_per_lead: 0,
    sales_amount: 0,
    notes: '',
    source: 'manual',
    lead_score: 0,
    last_contact_date: '',
    next_follow_up: ''
  });

  useEffect(() => {
    fetchLeads();
    fetchSalesRevenue();
    fetchEmailStats();
  }, [currentPage, filters]); // Re-fetch when page OR filters change

  // Fetch vendors when upload form is shown
  useEffect(() => {
    if (showUploadForm) {
      fetchVendors();
    }
  }, [showUploadForm]);

  // Reset to page 1 when filters change (but not on initial load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [filters]);

  // Close navigation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNavMenu && !target.closest('.nav-dropdown')) {
        setShowNavMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNavMenu]);

  // Auto-open lead modal if leadId is in URL (from calendar navigation)
  useEffect(() => {
    const leadIdParam = searchParams.get('leadId');
    if (leadIdParam) {
      const leadId = parseInt(leadIdParam);

      // First check if lead is already in loaded leads
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setShowLeadDetail(true);
        router.replace('/');
      } else {
        // If not in current page, fetch the specific lead from API
        fetch(`/api/leads/${leadId}`)
          .then(res => {
            if (!res.ok) throw new Error('Lead not found');
            return res.json();
          })
          .then(data => {
            // API returns lead directly, not wrapped
            if (data && data.id) {
              setSelectedLead(data);
              setShowLeadDetail(true);
              router.replace('/');
            }
          })
          .catch(err => {
            console.error('Error fetching lead:', err);
            alert('Could not find that lead');
            router.replace('/');
          });
      }
    }
  }, [searchParams, leads, router]);

  // Developer menu keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevMenu(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-popup disabled - modal only opens when user clicks the Follow-Ups button
  // useEffect(() => {
  //   if (session && followUpLeads.length > 0) {
  //     setShowFollowUpModal(true);
  //   }
  // }, [session, followUpLeads]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/lead-vendors');
      if (response.ok) {
        const data = await response.json();
        setAvailableVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      // Build query params with filters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '100'
      });

      // Add active filters
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.lead_type) params.append('lead_type', filters.lead_type);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.zip_code) params.append('zip_code', filters.zip_code);
      if (filters.source) params.append('source', filters.source);
      if (filters.temperature) params.append('temperature', filters.temperature);
      if (filters.age_min) params.append('age_min', filters.age_min);
      if (filters.age_max) params.append('age_max', filters.age_max);

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads);
        setFilteredLeads(data.leads); // Set filteredLeads to the server-filtered results
        setFollowUpLeads(data.followUpLeads);
        setTotalCost(data.stats.totalCost);
        setWrongInfoCount(data.stats.wrongInfoCount);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        setOverallTotalCount(data.pagination.overallTotalCount);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchSalesRevenue = async () => {
    try {
      const response = await fetch('/api/sales-summary');
      if (response.ok) {
        const data = await response.json();
        setActualSalesRevenue(data.totalRevenue || 0);
        setPaidLeadRevenue(data.paidLeadRevenue || 0);
      }
    } catch (error) {
      console.error('Error fetching sales revenue:', error);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const response = await fetch('/api/leads/email-stats');
      if (response.ok) {
        const data = await response.json();
        setEmailStats({ leadsWithEmails: data.leadsWithEmails, percentage: data.percentage });
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const response = await fetch('/api/leads/sources');
      if (response.ok) {
        const sources = await response.json();
        setLeadSources(sources);
      }
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  // Fetch lead sources on initial load
  useEffect(() => {
    fetchLeadSources();
  }, []);

  // Filtering is now done server-side in the API
  // filteredLeads is set directly from the API response in fetchLeads()

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      lead_type: '',
      city: '',
      state: '',
      zip_code: '',
      age_min: '',
      age_max: '',
      source: '',
      temperature: '',
      search: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setCurrentPage(1); // Reset to first page
        fetchLeads();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/leads/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchLeads();
        }
      } catch (error) {
        console.error('Error deleting lead:', error);
      }
    }
  };

  const handleRemoveFollowUp = async (leadId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ next_follow_up: null }),
      });

      if (response.ok) {
        const updatedLead = await response.json();

        // Update leads array
        setLeads(prevLeads =>
          prevLeads.map(l => l.id === leadId ? updatedLead : l)
        );

        // Remove from follow-up leads
        setFollowUpLeads(prevLeads =>
          prevLeads.filter(l => l.id !== leadId)
        );

        // Update selectedLead if it's the same lead
        if (selectedLead?.id === leadId) {
          setSelectedLead(updatedLead);
        }
      }
    } catch (error) {
      console.error('Error removing follow-up:', error);
    }
  };

  const handleUpdateFollowUpDate = async (leadId: number, newDate: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ next_follow_up: newDate }),
      });

      if (response.ok) {
        const updatedLead = await response.json();

        // Update leads array
        setLeads(prevLeads =>
          prevLeads.map(l => l.id === leadId ? updatedLead : l)
        );

        // Update follow-up leads
        setFollowUpLeads(prevLeads =>
          prevLeads.map(l => l.id === leadId ? updatedLead : l)
        );

        // Update selectedLead if it's the same lead
        if (selectedLead?.id === leadId) {
          setSelectedLead(updatedLead);
        }
      }
    } catch (error) {
      console.error('Error updating follow-up date:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      phone_2: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      date_of_birth: '',
      age: 0,
      gender: '',
      marital_status: '',
      occupation: '',
      income: '',
      household_size: 0,
      status: 'appointment_set',
      contact_method: 'phone' as ContactMethod,
      cost_per_lead: 0,
      sales_amount: 0,
      notes: '',
      source: 'manual',
      lead_score: 0,
      last_contact_date: '',
      next_follow_up: ''
    });
    setShowAddForm(false);
    setEditingLead(null);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDateOfBirthChange = (dateValue: string) => {
    const calculatedAge = calculateAge(dateValue);
    setFormData({ ...formData, date_of_birth: dateValue, age: calculatedAge });
  };

  const startEdit = (lead: Lead) => {
    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      phone_2: lead.phone_2 || '',
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
      contact_method: lead.contact_method || '' as ContactMethod,
      lead_type: lead.lead_type || 'other' as LeadType,
      cost_per_lead: lead.cost_per_lead,
      sales_amount: lead.sales_amount,
      notes: lead.notes || '',
      source: lead.source,
      lead_score: lead.lead_score || 0,
      last_contact_date: lead.last_contact_date || '',
      next_follow_up: lead.next_follow_up || ''
    });
    setEditingLead(lead);
    setShowAddForm(true);
  };

  const handleCSVUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add total spent, vendor name, and lead temperature to the form data
    formData.append('totalSpent', totalSpent.toString());
    formData.append('vendorName', vendorName);
    formData.append('leadTemperature', leadTemperature);

    try {
      setUploadStatus('Uploading...');
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus(`Successfully imported ${result.successCount} leads from ${vendorName}! Cost per lead: $${result.costPerLead?.toFixed(2) || '0.00'}`);
        setCurrentPage(1); // Reset to first page
        fetchLeads();
        setTimeout(() => {
          setUploadStatus('');
          setShowUploadForm(false);
          setTotalSpent(0);
          setVendorName('');
          setLeadTemperature('cold');
        }, 4000);
      } else {
        setUploadStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try again.');
    }
  };

  const handleBulkDelete = async (leadIds?: number[]) => {
    // If leadIds provided, delete specific leads; otherwise delete all leads
    if (leadIds && leadIds.length > 0) {
      try {
        setDeleteStatus(`Deleting ${leadIds.length} leads...`);
        const response = await fetch('/api/leads/bulk-delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leadIds }),
        });

        const result = await response.json();

        if (response.ok) {
          setDeleteStatus(`Successfully deleted ${result.deletedCount} leads!`);
          fetchLeads();
          setTimeout(() => {
            setDeleteStatus('');
          }, 3000);
        } else {
          setDeleteStatus(`Error: ${result.error}`);
        }
      } catch (error) {
        setDeleteStatus('Delete failed. Please try again.');
      }
    } else {
      // Original delete all functionality
      const warningMessage = `⚠️ DANGER: DELETE ALL LEADS ⚠️

This will permanently delete ALL ${leads.length} leads from your database!

This action CANNOT be undone!

Type "DELETE ALL" to confirm:`;

      const userInput = prompt(warningMessage);

      if (userInput === 'DELETE ALL') {
        try {
          setDeleteStatus('Deleting all leads...');
          const response = await fetch('/api/leads/bulk-delete', {
            method: 'DELETE',
          });

          const result = await response.json();

          if (response.ok) {
            setDeleteStatus(`Successfully deleted ${result.deletedCount} leads!`);
            fetchLeads();
            setShowDevMenu(false);
            setTimeout(() => {
              setDeleteStatus('');
            }, 3000);
          } else {
            setDeleteStatus(`Error: ${result.error}`);
          }
        } catch (error) {
          setDeleteStatus('Delete failed. Please try again.');
        }
      } else if (userInput !== null) {
        alert('Deletion cancelled - incorrect confirmation text');
      }
    }
  };

  const handleLeadDoubleClick = async (lead: Lead) => {
    const index = filteredLeads.findIndex(l => l.id === lead.id);
    setCurrentLeadIndex(index);

    // Fetch fresh lead data from server to ensure we have the latest status
    try {
      const response = await fetch(`/api/leads/${lead.id}`);
      if (response.ok) {
        const freshLead = await response.json();
        setSelectedLead(freshLead);
      } else {
        // Fallback to cached data if fetch fails
        setSelectedLead(lead);
      }
    } catch (error) {
      console.error('Error fetching fresh lead data:', error);
      // Fallback to cached data if fetch fails
      setSelectedLead(lead);
    }

    setShowLeadDetail(true);
    setPendingChanges(null);
  };

  const saveCurrentChanges = async () => {
    if (pendingChanges && selectedLead) {
      await updateLeadData({ ...selectedLead, ...pendingChanges });
      setPendingChanges(null);
    }
  };

  const handleNext = async () => {
    await saveCurrentChanges();
    const nextIndex = currentLeadIndex + 1;
    if (nextIndex < filteredLeads.length) {
      setCurrentLeadIndex(nextIndex);
      setSelectedLead(filteredLeads[nextIndex]);
    }
  };

  const handlePrevious = async () => {
    await saveCurrentChanges();
    const prevIndex = currentLeadIndex - 1;
    if (prevIndex >= 0) {
      setCurrentLeadIndex(prevIndex);
      setSelectedLead(filteredLeads[prevIndex]);
    }
  };

  const updateLeadData = async (updatedLead: Lead) => {
    try {
      const response = await fetch(`/api/leads/${updatedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead),
      });

      if (response.ok) {
        await fetchLeads(); // Wait for the list to refresh before continuing
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleLeadDetailUpdate = async (updatedLead: Lead) => {
    await updateLeadData(updatedLead);
    setShowLeadDetail(false);
    setSelectedLead(null);
  };

  const totalLeads = overallTotalCount; // Use overallTotalCount from API (unfiltered total)
  // totalCost is now set from API response (all leads)
  const totalSales = actualSalesRevenue; // Use actual commission totals from policies (all leads)
  // ROI calculation uses only revenue from paid leads (cost_per_lead > 0)
  const roi = totalCost > 0 ? ((paidLeadRevenue - totalCost) / totalCost * 100).toFixed(1) : '0';

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex flex-col items-center">
              <h1 className="text-5xl md:text-6xl font-black whitespace-nowrap">
                🔥 The Forge 🔥
              </h1>
              <p className="text-gray-300 text-lg mt-2">Where Cold Leads Turn to Gold Leads</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end items-center gap-3">
              <div className="text-center md:text-right">
                <div className="text-sm text-gray-300">{session.user?.name}</div>
                <div className="text-xs text-gray-400">{session.user?.email}</div>
              </div>

              {/* Follow-Up Reminders Button */}
              {followUpLeads.length > 0 && (
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-4 py-2 rounded font-black text-sm transition-colors whitespace-nowrap flex items-center gap-2 animate-pulse border-2 border-yellow-400"
                >
                  📋 FOLLOW-UPS ({followUpLeads.length})
                </button>
              )}

              {/* Navigation Dropdown */}
              <div className="relative nav-dropdown">
                <button
                  onClick={() => setShowNavMenu(!showNavMenu)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  📱 Menu
                  <span className="text-xs">{showNavMenu ? '▲' : '▼'}</span>
                </button>

                {showNavMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-black z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/calendar');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        📅 Calendar
                      </button>
                      <button
                        onClick={() => {
                          router.push('/pending-policies');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        ⏳ Pending Policies
                      </button>
                      <button
                        onClick={() => {
                          router.push('/clients');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        👥 Clients
                      </button>
                      {/* TEMPORARILY HIDDEN - Email/Seminar Features - Can be restored later */}
                      {/* <button
                        onClick={() => {
                          router.push('/emails');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        📧 Emails
                      </button>
                      <button
                        onClick={() => {
                          router.push('/seminars');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        🎥 Seminars
                      </button> */}

                      {/* Analytics Section */}
                      <div className="border-t border-gray-200 my-2"></div>
                      <div className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Analytics</div>
                      <button
                        onClick={() => {
                          router.push('/analytics');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        📊 Overview
                      </button>
                      {(session.user as any).role === 'admin' && (
                        <button
                          onClick={() => {
                            router.push('/admin/platform-insights');
                            setShowNavMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                        >
                          📈 Platform Insights
                        </button>
                      )}
                      {/* TEMPORARILY HIDDEN - Email/Seminar Analytics - Can be restored later */}
                      {/* <button
                        onClick={() => {
                          router.push('/email-analytics');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        📈 Email Analytics
                      </button>
                      <button
                        onClick={() => {
                          router.push('/seminar-analytics');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        🎯 Seminar Analytics
                      </button> */}

                      {/* Utilities Section */}
                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={() => {
                          router.push('/duplicates');
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                      >
                        🔍 Find Duplicates
                      </button>
                      {(session.user as any).role === 'admin' && (
                        <>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={() => {
                              router.push('/settings');
                              setShowNavMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
                          >
                            ⚙️ Settings
                          </button>
                        </>
                      )}
                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={() => {
                          signOut({ callbackUrl: '/login' });
                          setShowNavMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold transition-colors flex items-center gap-2"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="bg-gray-100 p-6 border-b-2 border-red-600">
        <div className={`max-w-7xl mx-auto grid grid-cols-1 ${(session.user as any).role === 'setter' ? 'md:grid-cols-1' : 'md:grid-cols-4'} gap-6`}>
          <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          {/* TEMPORARILY HIDDEN - Email Stats Card - Can be restored later */}
          {/* <div className="bg-white p-4 rounded border-l-4 border-blue-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">Leads with Emails</h3>
            <p className="text-2xl font-bold">{emailStats.leadsWithEmails}</p>
            <p className="text-xs text-gray-500 mt-1">{emailStats.percentage}% of total</p>
          </div> */}
          {(session.user as any).role !== 'setter' && (
            <>
              <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
                <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
                <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
                <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
                <h3 className="text-sm font-medium text-gray-600">ROI</h3>
                <p className={`text-2xl font-bold ${parseFloat(roi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roi}%
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Lead Management</h2>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {(session.user as any).role !== 'setter' && (
              <button
                onClick={() => {
                  setShowUploadForm(!showUploadForm);
                  setShowAddForm(false);
                }}
                className="bg-black text-white px-3 sm:px-6 py-2 rounded hover:bg-gray-800 transition-colors text-sm sm:text-base"
              >
                {showUploadForm ? 'Cancel Upload' : 'Upload CSV'}
              </button>
            )}
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowUploadForm(false);
              }}
              className="bg-red-600 text-white px-3 sm:px-6 py-2 rounded hover:bg-red-700 transition-colors text-sm sm:text-base"
            >
              {showAddForm ? 'Cancel' : 'Add Lead'}
            </button>
          </div>
        </div>

        {/* Delete Status */}
        {deleteStatus && (
          <div className={`p-4 mb-6 rounded border-2 ${
            deleteStatus.includes('Error') || deleteStatus.includes('failed') 
              ? 'bg-red-100 text-red-800 border-red-300' 
              : deleteStatus.includes('Successfully') 
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-blue-100 text-blue-800 border-blue-300'
          }`}>
            <p className="font-medium">{deleteStatus}</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-6 rounded border-2 border-red-600 mb-6">
            <h3 className="text-xl font-bold mb-4">
              {editingLead ? 'Edit Lead' : 'Add New Lead'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white p-4 rounded border">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={(e) => handleFormChange('first_name', formatName(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={(e) => handleFormChange('last_name', formatName(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', formatPhoneNumber(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone 2 (Optional)"
                    value={formData.phone_2}
                    onChange={(e) => handleFormChange('phone_2', formatPhoneNumber(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={formData.company}
                    onChange={(e) => handleFormChange('company', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white p-4 rounded border">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none md:col-span-2"
                    required
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', formatLocation(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => handleFormChange('state', formatLocation(e.target.value))}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={formData.zip_code}
                    onChange={(e) => handleFormChange('zip_code', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white p-4 rounded border">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Date of Birth (MM/DD/YYYY or YYYY-MM-DD)"
                    value={formData.date_of_birth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Age (auto-calculated)"
                    value={formData.age}
                    readOnly
                    className="p-3 border border-gray-300 rounded bg-gray-100 text-gray-700"
                  />
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFormChange('gender', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => handleFormChange('marital_status', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Marital Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>

              {/* Lead Management */}
              <div className="bg-white p-4 rounded border">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Lead Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value as LeadStatus)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="appointment_set">Appointment Set</option>
                    <option value="closed">Client</option>
                    <option value="new">Referral</option>
                  </select>
                  <select
                    value={formData.contact_method}
                    onChange={(e) => handleFormChange('contact_method', e.target.value as ContactMethod)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">Select Contact Method</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="livestream">Livestream</option>
                    <option value="video_comment">Video Comment</option>
                    <option value="seminar_event">Seminar Event</option>
                    <option value="in_person">In Person</option>
                    <option value="social_media">Social Media</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 transition-colors"
                >
                  {editingLead ? 'Update Lead' : 'Add Lead'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CSV Upload Form */}
        {showUploadForm && (
          <div className="bg-gray-50 p-6 rounded border-2 border-black mb-6">
            <h3 className="text-xl font-bold mb-4">Upload CSV File</h3>
            <form onSubmit={handleCSVUpload} className="space-y-4">
              <div>
                <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV file with lead data
                </label>
                <input
                  type="file"
                  id="csv-file"
                  name="file"
                  accept=".csv"
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
              </div>
              <div>
                <label htmlFor="vendor-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Vendor
                </label>
                <select
                  id="vendor-name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="block w-full p-3 border border-gray-300 rounded focus:border-black focus:outline-none"
                  required
                >
                  <option value="">Select a vendor...</option>
                  {availableVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.vendor_name}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the vendor source for these leads - ensures consistent tracking across all users
                </p>
              </div>
              <div>
                <label htmlFor="lead-temperature" className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Temperature
                </label>
                <select
                  id="lead-temperature"
                  value={leadTemperature}
                  onChange={(e) => setLeadTemperature(e.target.value as 'cold' | 'warm' | 'hot')}
                  className="block w-full p-3 border border-gray-300 rounded focus:border-black focus:outline-none"
                >
                  <option value="cold">❄️ Cold - New/Uncontacted Leads</option>
                  <option value="warm">☀️ Warm - Interested/Follow-up Needed</option>
                  <option value="hot">🔥 Hot - Ready to Set Appointment</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the default temperature for all leads in this upload
                </p>
              </div>
              <div>
                <label htmlFor="total-spent" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount Spent on These Leads
                </label>
                <input
                  type="number"
                  id="total-spent"
                  step="0.01"
                  min="0"
                  value={totalSpent}
                  onChange={(e) => setTotalSpent(parseFloat(e.target.value) || 0)}
                  className="block w-full p-3 border border-gray-300 rounded focus:border-black focus:outline-none"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be divided equally among all leads to calculate cost per lead
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">CSV can include these columns:</p>
                <div className="text-xs space-y-1">
                  <p><strong>Required:</strong> first_name, last_name, email, address, city, state, zip_code</p>
                  <p><strong>Phone fields:</strong> phone, phone_number, other_phone_1, "other phone 1"</p>
                  <p><strong>Optional:</strong> phone_2, company, date_of_birth, age, gender, marital_status, occupation, income, household_size, status, contact_method, cost_per_lead, sales_amount, notes, lead_score</p>
                </div>
              </div>
              {uploadStatus && (
                <div className={`p-3 rounded ${
                  uploadStatus.includes('Error') || uploadStatus.includes('failed') 
                    ? 'bg-red-100 text-red-800' 
                    : uploadStatus.includes('Successfully') 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                }`}>
                  {uploadStatus}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
                  disabled={uploadStatus === 'Uploading...'}
                >
                  {uploadStatus === 'Uploading...' ? 'Uploading...' : 'Upload CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-gray-50 border-2 border-red-600 rounded p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Leads:</h3>

          {/* Row 1: Search, Status, Lead Type, City */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name or phone..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="no_answer">No Answer</option>
                <option value="follow_up_needed">Follow Up</option>
                <option value="not_set">Not Set</option>
                <option value="appointment_set">Appointment Set</option>
                <option value="refund_needed">Refund Needed</option>
                <option value="closed">Closed</option>
                <option value="tol">TOL</option>
              </select>
            </div>

            {/* Lead Type Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Lead Type</label>
              <select
                value={filters.lead_type}
                onChange={(e) => handleFilterChange('lead_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="t65">T65 (Medicare)</option>
                <option value="t65_wl">T65 WL</option>
                <option value="life">Life Insurance</option>
                <option value="client">Client</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">City</label>
              <input
                type="text"
                placeholder="Filter by city"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: State, Zip, Age Range, Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* State Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. CO"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value.toUpperCase())}
                maxLength={2}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none uppercase"
              />
            </div>

            {/* Zip Code Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Zip Code</label>
              <input
                type="text"
                placeholder="Filter by zip"
                value={filters.zip_code}
                onChange={(e) => handleFilterChange('zip_code', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            {/* Age Range Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Age Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.age_min}
                  onChange={(e) => handleFilterChange('age_min', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-full"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.age_max}
                  onChange={(e) => handleFilterChange('age_max', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Lead Vendor Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">Lead Vendor</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none bg-white"
              >
                <option value="">All Vendors</option>
                {leadSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Action Buttons */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Clear Filters Button */}
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Clear Filters
            </button>

            {/* Bulk Delete Filtered Leads Button - Hidden by default, Agents/Admins only */}
            {(session.user as any).role !== 'setter' && (filters.status || filters.lead_type || filters.city || filters.state || filters.zip_code || filters.age_min || filters.age_max || filters.source) && filteredLeads.length > 0 && (
              <div className="flex flex-col justify-end">
                {!showBulkDeleteButton ? (
                  <button
                    onClick={() => setShowBulkDeleteButton(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                  >
                    Show delete option
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const userInput = prompt(`⚠️ WARNING: You are about to delete ${filteredLeads.length} filtered lead(s).\n\nThis action CANNOT be undone.\n\nType "DELETE" to confirm:`);
                        if (userInput === 'DELETE') {
                          handleBulkDelete(filteredLeads.map(lead => lead.id!));
                          setShowBulkDeleteButton(false);
                        } else if (userInput !== null) {
                          alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors font-bold"
                    >
                      Delete {filteredLeads.length} Leads
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteButton(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Count and Pagination */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded p-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 100) + 1}-{Math.min(currentPage * 100, totalCount)} of {totalCount} leads
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
          </div>
        </div>

        {/* Leads Table - Full Width */}
        <div className="bg-white rounded border-2 border-red-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Name</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Phone</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Address</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">DOB</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Status</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-black">
                      No leads found. Add your first lead to get started!
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onDoubleClick={() => handleLeadDoubleClick(lead)}
                    >
                      <td className="p-2 sm:p-4">
                        <div>
                          <div className="font-medium text-xs sm:text-base flex items-center gap-2">
                            {formatName(lead.first_name)} {formatName(lead.last_name)}
                            {!!lead.wrong_info && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-300" title="Lead has wrong/bad information">
                                ⚠️ Wrong Info
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-black">{lead.company}</div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium">{formatPhoneNumber(lead.phone)}</div>
                          {lead.phone_2 && <div className="text-black">{formatPhoneNumber(lead.phone_2)}</div>}
                          <div className="text-xs text-black">{lead.email}</div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          <div>{lead.address}</div>
                          <div className="text-black">{formatLocation(lead.city)}, {formatLocation(lead.state)} {lead.zip_code}</div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          {lead.date_of_birth && (
                            <div>{new Date(lead.date_of_birth).toLocaleDateString()}</div>
                          )}
                          {lead.age && <div className="text-xs text-black">Age: {lead.age}</div>}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'contacted' ? 'bg-cyan-100 text-cyan-800' :
                            lead.status === 'no_answer' ? 'bg-gray-100 text-gray-800' :
                            lead.status === 'not_set' ? 'bg-gray-100 text-gray-800' :
                            lead.status === 'follow_up_needed' ? 'bg-orange-100 text-orange-800' :
                            lead.status === 'appointment_set' ? 'bg-purple-100 text-purple-800' :
                            lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'issued' ? 'bg-green-100 text-green-800' :
                            lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                            lead.status === 'not_qualified' ? 'bg-red-100 text-red-800' :
                            lead.status === 'refund_needed' ? 'bg-red-100 text-red-800' :
                            lead.status === 'closed_won' ? 'bg-green-100 text-green-800' :
                            lead.status === 'closed_lost' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <br />
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            lead.lead_type === 't65' ? 'bg-purple-100 text-purple-800' :
                            lead.lead_type === 't65_wl' ? 'bg-indigo-100 text-indigo-800' :
                            lead.lead_type === 'life' ? 'bg-orange-100 text-orange-800' :
                            lead.lead_type === 'client' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.lead_type === 't65' ? 'T65' :
                             lead.lead_type === 't65_wl' ? 'T65 WL' :
                             lead.lead_type === 'life' ? 'Life' :
                             lead.lead_type === 'client' ? 'Client' : 'Other'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4 text-xs sm:text-sm">{lead.contact_method?.replace('_', ' ') || '-'}</td>
                      <td className="p-2 sm:p-4">
                        {(session.user as any).role !== 'setter' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(lead.id!)}
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Developer Menu - Press Ctrl+Shift+D to toggle */}
      {showDevMenu && (
        <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg shadow-2xl border-4 border-red-600 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">⚠️ Developer Menu</h3>
            <button
              onClick={() => setShowDevMenu(false)}
              className="text-white hover:text-gray-300 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-xs mb-3 text-red-200">Dangerous operations - use with caution</p>
          {leads.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="w-full bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition-colors border-2 border-red-500 font-bold"
              disabled={deleteStatus.includes('Deleting')}
            >
              {deleteStatus.includes('Deleting') ? 'Deleting...' : '🗑️ Delete All Leads'}
            </button>
          )}
          <p className="text-xs mt-2 text-red-300">Press Ctrl+Shift+D to hide</p>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadDetail && selectedLead && (
        <ResizableMovableModal
          onClose={async () => {
            await saveCurrentChanges();
            setShowLeadDetail(false);
            setSelectedLead(null);
          }}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={currentLeadIndex < filteredLeads.length - 1}
          hasPrevious={currentLeadIndex > 0}
          currentIndex={currentLeadIndex}
          totalCount={filteredLeads.length}
        >          
          <LeadDetailForm
            lead={selectedLead}
            onUpdate={handleLeadDetailUpdate}
            onClose={async () => {
              await saveCurrentChanges();
              setShowLeadDetail(false);
              setSelectedLead(null);
            }}
            setPendingChanges={setPendingChanges}
            session={session}
            onLeadChange={(updatedLead) => {
              console.log('onLeadChange called in main component with:', updatedLead);
              console.log('Setting selectedLead to:', updatedLead);
              setSelectedLead(updatedLead);
              // Also update the leads array so the dashboard reflects the change
              console.log('Updating leads array');
              setLeads(prevLeads => {
                const newLeads = prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
                console.log('Updated leads array');
                return newLeads;
              });
              // CRITICAL: Also update filteredLeads so next/prev navigation works correctly
              setFilteredLeads(prevFiltered => {
                return prevFiltered.map(l => l.id === updatedLead.id ? updatedLead : l);
              });
            }}
          />
        </ResizableMovableModal>
      )}

      {/* Follow-Up Reminders Popup Modal */}
      {showFollowUpModal && (
        <ResizableMovableModal
          onClose={() => setShowFollowUpModal(false)}
        >
          <div className="max-h-full overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-3xl font-black text-gray-900">📋 FOLLOW-UP REMINDERS</h2>
              <p className="text-gray-600 mt-1">Your hot and warm leads that need attention</p>
            </div>
            <FollowUpReminders
              leads={followUpLeads}
              onLeadClick={(lead) => {
                handleLeadDoubleClick(lead);
                setShowFollowUpModal(false);
              }}
              onRemoveFollowUp={handleRemoveFollowUp}
              onUpdateFollowUpDate={handleUpdateFollowUpDate}
            />
          </div>
        </ResizableMovableModal>
      )}
    </div>
  );
}

// Lead Detail Form Component
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

  // Reset form data when lead changes
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

  // Track changes
  const handleFormChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Track pending changes
    const changes: Partial<Lead> = {};
    Object.keys(newFormData).forEach(key => {
      if (newFormData[key as keyof typeof newFormData] !== lead[key as keyof Lead]) {
        (changes as any)[key] = newFormData[key as keyof typeof newFormData];
      }
    });
    setPendingChanges(Object.keys(changes).length > 0 ? changes : null);
  };

  // Special handler for date of birth that also updates age
  const handleDateOfBirthChange = (dateValue: string) => {
    const calculatedAge = calculateAge(dateValue);
    const newFormData = { ...formData, date_of_birth: dateValue, age: calculatedAge };
    setFormData(newFormData);
    
    // Track pending changes
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
            {(session.user as any).role !== 'setter' && (
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
          {/* Activity Timeline */}
          <ActivitiesSection
            leadId={lead.id!}
            lead={lead}
            session={session}
            onLeadUpdate={(updatedLead) => {
              console.log('ActivitiesSection onLeadUpdate called with:', updatedLead);
              // Update the lead without closing modal
              if (onLeadChange) {
                console.log('Calling onLeadChange');
                onLeadChange(updatedLead);
              } else {
                console.log('onLeadChange is not defined!');
              }
            }}
          />

          {/* Notes Section */}
          <NotesSection leadId={lead.id!} />

          {/* Images Section */}
          <ImagesSection leadId={lead.id!} />

          {/* Policies Section */}
          <PoliciesSection leadId={lead.id!} />
        </div>
      </div>
    </div>
  );
}

// ActivitiesSection Component
function ActivitiesSection({ leadId, lead, onLeadUpdate, session }: { leadId: number; lead: Lead; onLeadUpdate: (lead: Lead) => void; session: any }) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [activityDetail, setActivityDetail] = useState('');
  const [activityOutcome, setActivityOutcome] = useState<ActivityOutcome | ''>('no_answer');
  const [leadTemperature, setLeadTemperature] = useState<LeadTemperature | ''>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [appointmentEndDateTime, setAppointmentEndDateTime] = useState('');

  useEffect(() => {
    fetchActivities();
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

  // Auto-suggest follow-up date based on outcome
  const suggestFollowUpDate = (outcome: ActivityOutcome | '') => {
    if (!outcome) return '';

    const today = new Date();
    const suggestions: { [key: string]: number } = {
      'no_answer': 0,        // No auto-suggestion - need more data on patterns
      'answered': 7,         // Follow up in a week if they asked
      'scheduled': 0         // No follow-up needed, appointment is set
    };

    const daysToAdd = suggestions[outcome] || 3;
    if (daysToAdd === 0) return '';

    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0];
  };

  // Update suggested follow-up when temperature changes to warm/hot
  useEffect(() => {
    if ((leadTemperature === 'warm' || leadTemperature === 'hot') && activityOutcome && !nextFollowUpDate) {
      setNextFollowUpDate(suggestFollowUpDate(activityOutcome));
    }
  }, [leadTemperature, activityOutcome]);

  const addActivity = async () => {
    if (isLoading) return;

    // Auto-generate detail if empty but outcome is selected
    let detail = activityDetail.trim();
    if (!detail && activityOutcome) {
      // Generate a default message based on outcome
      const outcomeMessages: { [key: string]: string } = {
        'answered': 'Call answered',
        'no_answer': 'No answer',
        'scheduled': 'Appointment scheduled',
        'disconnected': 'Phone disconnected'
      };
      detail = outcomeMessages[activityOutcome] || `${activityType} - ${activityOutcome}`;
    }

    // Must have either detail or outcome
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
          next_follow_up_date: nextFollowUpDate || null
        })
      });

      if (response.ok) {
        // If outcome is scheduled and appointment time is set, create calendar event
        if (activityOutcome === 'scheduled' && appointmentDateTime) {
          // Determine the correct agent_id
          const userRole = (session?.user as any)?.role;
          const userId = (session?.user as any)?.id;
          let agentId = userId;

          if (userRole === 'setter') {
            // Setters create events on their agent's calendar
            const agentIdValue = (session?.user as any)?.agent_id;
            if (agentIdValue) {
              agentId = agentIdValue;
            }
          }

          // Create calendar event
          const calendarResponse = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: agentId,
              lead_id: leadId,
              title: `Appointment: ${lead.first_name} ${lead.last_name}`,
              description: `${lead.address || ''}\n${lead.city || ''}, ${lead.state || ''} ${lead.zip_code || ''}\nPhone: ${lead.phone || ''}\n${lead.phone_2 ? `Phone 2: ${lead.phone_2}\n` : ''}${detail ? `\nNotes: ${detail}` : ''}`.trim(),
              start_time: appointmentDateTime,
              end_time: appointmentEndDateTime || appointmentDateTime,
              event_type: 'appointment',
            }),
          });

          if (!calendarResponse.ok) {
            console.error('Failed to create calendar event');
          }
        }

        setActivityDetail('');
        setActivityOutcome('no_answer');
        setLeadTemperature('');
        setNextFollowUpDate('');
        setAppointmentDateTime('');
        setAppointmentEndDateTime('');
        setShowActivityForm(false);
        await fetchActivities();

        // Check if user should be reminded to try texting
        const activitiesResponse = await fetch(`/api/leads/${leadId}/activities`);
        if (activitiesResponse.ok) {
          const allActivities = await activitiesResponse.json();

          // Calculate total dials and text attempts
          const totalDials = allActivities
            .filter((act: any) => act.activity_type === 'call')
            .reduce((sum: number, act: any) => sum + (act.dial_count || 0), 0);

          const textAttempts = allActivities
            .filter((act: any) => act.activity_type === 'text').length;

          // Remind user to try texting if they've made 6+ dials with no texts
          if (totalDials >= 6 && textAttempts === 0) {
            alert('💡 Tip: You\'ve made 6+ calls without an answer. Consider trying to text this prospect instead!');
          }
        }

        // Fetch updated lead data to refresh the status
        console.log('Fetching updated lead data for leadId:', leadId);
        const leadResponse = await fetch(`/api/leads/${leadId}`);
        if (leadResponse.ok) {
          const updatedLead = await leadResponse.json();
          console.log('Updated lead received:', updatedLead);
          console.log('Updated lead status:', updatedLead.status);
          // Update the lead in the parent component to reflect status change
          onLeadUpdate({ ...lead, ...updatedLead });
          console.log('Called onLeadUpdate with updated lead');
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
    // SQLite stores timestamps as UTC strings, append 'Z' to ensure proper parsing
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    // Convert to Mountain Time using Intl.DateTimeFormat
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
      case 'note': return '📝';
      case 'status_change': return '🔄';
      case 'appointment': return '📅';
      case 'sale': return '💰';
      default: return '📋';
    }
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    switch(type) {
      case 'call': return 'Call';
      case 'text': return 'Text';
      case 'email': return 'Email';
      case 'note': return 'Note';
      case 'status_change': return 'Status Change';
      case 'appointment': return 'Appointment';
      case 'sale': return 'Sale';
      default: return type;
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

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => {
            setActivityType('call');
            setShowActivityForm(true);
          }}
          className={`px-2 py-2 rounded text-xs transition-colors ${
            activityType === 'call'
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          📞 Call
        </button>
        <button
          onClick={() => {
            setActivityType('text');
            setShowActivityForm(true);
          }}
          className={`px-2 py-2 rounded text-xs transition-colors ${
            activityType === 'text'
              ? 'bg-green-600 text-white font-bold'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          💬 Text
        </button>
      </div>

      {/* Activity Form */}
      {showActivityForm && (
        <div className="mb-4 bg-gray-50 p-3 rounded border">

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
            <select
              value={activityOutcome}
              onChange={(e) => setActivityOutcome(e.target.value as ActivityOutcome | '')}
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
            >
              <option value="">Select outcome...</option>
              <option value="answered">Answered</option>
              <option value="no_answer">No Answer</option>
              <option value="scheduled">Scheduled</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>

          {/* Appointment Date/Time fields - only show when scheduled */}
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

                    // Update end time
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
                        const year = tomorrow.getFullYear();
                        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                        const day = String(tomorrow.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })();

                      setAppointmentDateTime(`${date}T${time}`);

                      // Auto-set end time to 1 hour later
                      const [hours, minutes] = time.split(':').map(Number);
                      let endHour = hours + 1;
                      const endMinutes = minutes;

                      if (endHour >= 24) endHour = 23;
                      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
                      setAppointmentEndDateTime(`${date}T${endTime}`);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                    required
                  >
                    <option value="08:00">8:00 AM</option>
                    <option value="08:30">8:30 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="09:30">9:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="15:30">3:30 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="16:30">4:30 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="17:30">5:30 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="18:30">6:30 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="19:30">7:30 PM</option>
                    <option value="20:00">8:00 PM</option>
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
                        const year = tomorrow.getFullYear();
                        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                        const day = String(tomorrow.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })();

                      setAppointmentEndDateTime(`${date}T${time}`);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                  >
                    <option value="08:30">8:30 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="09:30">9:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="15:30">3:30 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="16:30">4:30 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="17:30">5:30 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="18:30">6:30 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="19:30">7:30 PM</option>
                    <option value="20:00">8:00 PM</option>
                    <option value="20:30">8:30 PM</option>
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

          {/* Wrong Info Checkbox */}
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
                ⚠️ Mark as Wrong Info (bad phone, email, address, etc.)
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
              }}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activities Timeline */}
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
                    <span className="text-xs font-semibold text-gray-700">
                      {getActivityTypeLabel(activity.activity_type)}
                    </span>
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
                    {activity.activity_type === 'text' && activity.total_texts_at_time && (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                        Text #{activity.total_texts_at_time}
                      </span>
                    )}
                    {activity.activity_type === 'email' && activity.total_emails_at_time && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                        Email #{activity.total_emails_at_time}
                      </span>
                    )}
                    {activity.lead_temperature_after && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                        {activity.lead_temperature_after === 'hot' && '🔥 Hot'}
                        {activity.lead_temperature_after === 'warm' && '☀️ Warm'}
                        {activity.lead_temperature_after === 'cold' && '❄️ Cold'}
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
                    <p className="text-xs text-gray-500">{formatActivityDate(activity.created_at)}</p>
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
    // SQLite stores timestamps as UTC strings, append 'Z' to ensure proper parsing
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    // Convert to Mountain Time using Intl.DateTimeFormat
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
      
      {/* Add Note Input */}
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
      
      {/* Notes List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 text-sm">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-gray-800 mb-2">{note.note}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {formatNoteDate(note.created_at)}
                </span>
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
      
      {/* Upload Button */}
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
      
      {/* Images List */}
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {image.original_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(image.file_size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(image.uploaded_at).toLocaleDateString()}
                  </p>
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

      {/* Image Viewer Modal */}
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
              title="Close"
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
  const [editingPolicy, setEditingPolicy] = useState<LeadPolicy | null>(null);
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
  const [editPolicy, setEditPolicy] = useState({
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

  const openEditPolicy = (policy: LeadPolicy) => {
    setEditingPolicy(policy);
    setEditPolicy({
      policy_type: policy.policy_type,
      policy_number: policy.policy_number || '',
      coverage_amount: policy.coverage_amount?.toString() || '',
      premium_amount: policy.premium_amount?.toString() || '',
      commission_amount: policy.commission_amount?.toString() || '',
      start_date: policy.start_date || '',
      end_date: policy.end_date || '',
      status: policy.status,
      notes: policy.notes || ''
    });
  };

  const updatePolicy = async () => {
    if (!editingPolicy || !editPolicy.policy_type.trim()) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/policies/${editingPolicy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editPolicy,
          coverage_amount: editPolicy.coverage_amount ? parseFloat(editPolicy.coverage_amount) : undefined,
          premium_amount: editPolicy.premium_amount ? parseFloat(editPolicy.premium_amount) : undefined,
          commission_amount: editPolicy.commission_amount ? parseFloat(editPolicy.commission_amount) : undefined
        })
      });

      if (response.ok) {
        setEditingPolicy(null);
        setEditPolicy({
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
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'not_approved': return 'bg-orange-100 text-orange-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'lapsed': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
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
      
      {/* Add Policy Form */}
      {isAddingPolicy && (
        <div className="mb-4 p-3 bg-gray-50 rounded border space-y-3">
          <div>
            <input
              type="text"
              placeholder="Policy Type (e.g., Life, Health, Auto)"
              value={newPolicy.policy_type}
              onChange={(e) => setNewPolicy({...newPolicy, policy_type: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Policy Number"
              value={newPolicy.policy_number}
              onChange={(e) => setNewPolicy({...newPolicy, policy_number: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
          </div>
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
          <div>
            <input
              type="number"
              step="0.01"
              placeholder="Est. Commission Earned"
              value={newPolicy.commission_amount}
              onChange={(e) => setNewPolicy({...newPolicy, commission_amount: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Policy counts as a sale. Commission affects revenue total.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              placeholder="Start Date"
              value={newPolicy.start_date}
              onChange={(e) => setNewPolicy({...newPolicy, start_date: e.target.value})}
              className="p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
            <input
              type="date"
              placeholder="End Date"
              value={newPolicy.end_date}
              onChange={(e) => setNewPolicy({...newPolicy, end_date: e.target.value})}
              className="p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
            />
          </div>
          <select
            value={newPolicy.status}
            onChange={(e) => setNewPolicy({...newPolicy, status: e.target.value as any})}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="not_approved">Not Approved</option>
            <option value="declined">Declined</option>
            <option value="lapsed">Lapsed</option>
            <option value="expired">Expired</option>
          </select>
          <textarea
            placeholder="Notes"
            value={newPolicy.notes}
            onChange={(e) => setNewPolicy({...newPolicy, notes: e.target.value})}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none resize-none"
          />
          <button
            onClick={addPolicy}
            className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Add Policy
          </button>
        </div>
      )}
      
      {/* Policies List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {policies.length === 0 ? (
          <p className="text-gray-500 text-sm">No policies added</p>
        ) : (
          policies.map((policy) => (
            <div 
              key={policy.id} 
              className="bg-gray-50 p-3 rounded border cursor-pointer hover:bg-gray-100 transition-colors" 
              onDoubleClick={() => openEditPolicy(policy)}
              title="Double-click to edit policy"
            >
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
                <div className="text-xs text-gray-600 mb-1">
                  {policy.coverage_amount && (
                    <span>Coverage: ${policy.coverage_amount.toLocaleString()} </span>
                  )}
                  {policy.premium_amount && (
                    <span>Premium: ${policy.premium_amount.toLocaleString()} </span>
                  )}
                  {policy.commission_amount && (
                    <span className="font-bold text-green-600">Commission: ${policy.commission_amount.toLocaleString()}</span>
                  )}
                </div>
              )}
              
              {(policy.start_date || policy.end_date) && (
                <div className="text-xs text-gray-600 mb-1">
                  {policy.start_date && <span>Start: {policy.start_date} </span>}
                  {policy.end_date && <span>End: {policy.end_date}</span>}
                </div>
              )}
              
              {policy.notes && (
                <p className="text-xs text-gray-700 mt-2">{policy.notes}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Policy</h3>
              <button
                onClick={() => setEditingPolicy(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Policy Type (e.g., Life, Health, Auto)"
                  value={editPolicy.policy_type}
                  onChange={(e) => setEditPolicy({...editPolicy, policy_type: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Policy Number"
                  value={editPolicy.policy_number}
                  onChange={(e) => setEditPolicy({...editPolicy, policy_number: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Coverage Amount"
                  value={editPolicy.coverage_amount}
                  onChange={(e) => setEditPolicy({...editPolicy, coverage_amount: e.target.value})}
                  className="p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Premium Amount"
                  value={editPolicy.premium_amount}
                  onChange={(e) => setEditPolicy({...editPolicy, premium_amount: e.target.value})}
                  className="p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Est. Commission Earned"
                  value={editPolicy.commission_amount}
                  onChange={(e) => setEditPolicy({...editPolicy, commission_amount: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Policy counts as a sale. Commission affects revenue total.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={editPolicy.start_date}
                  onChange={(e) => setEditPolicy({...editPolicy, start_date: e.target.value})}
                  className="p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={editPolicy.end_date}
                  onChange={(e) => setEditPolicy({...editPolicy, end_date: e.target.value})}
                  className="p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <select
                value={editPolicy.status}
                onChange={(e) => setEditPolicy({...editPolicy, status: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="not_approved">Not Approved</option>
                <option value="declined">Declined</option>
                <option value="lapsed">Lapsed</option>
                <option value="expired">Expired</option>
              </select>
              <textarea
                placeholder="Notes"
                value={editPolicy.notes}
                onChange={(e) => setEditPolicy({...editPolicy, notes: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none resize-none"
              />
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingPolicy(null)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updatePolicy}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Update Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white text-xl">Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}
