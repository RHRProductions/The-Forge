'use client';

import { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, ContactMethod, LeadType } from '../../types/lead';
import { formatPhoneNumber, formatName, formatLocation, formatDateForInput, calculateAge } from '../../lib/utils';
import { TimestampedNote, LeadImage, LeadPolicy, LeadActivity, ActivityType, ActivityOutcome } from '../../types/lead';

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

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [currentLeadIndex, setCurrentLeadIndex] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<Partial<Lead> | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string>('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    lead_type: '',
    city: '',
    zip_code: '',
    age_min: '',
    age_max: ''
  });
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
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
    status: 'new' as LeadStatus,
    contact_method: '' as ContactMethod,
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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, filters]);

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

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const applyFilters = () => {
    let filtered = leads;

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    // Filter by lead type
    if (filters.lead_type) {
      filtered = filtered.filter(lead => lead.lead_type === filters.lead_type);
    }

    // Filter by city
    if (filters.city) {
      filtered = filtered.filter(lead => 
        lead.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Filter by zip code
    if (filters.zip_code) {
      filtered = filtered.filter(lead => 
        lead.zip_code.includes(filters.zip_code)
      );
    }

    // Filter by age range
    if (filters.age_min) {
      filtered = filtered.filter(lead => 
        lead.age && lead.age >= parseInt(filters.age_min)
      );
    }
    if (filters.age_max) {
      filtered = filtered.filter(lead => 
        lead.age && lead.age <= parseInt(filters.age_max)
      );
    }

    setFilteredLeads(filtered);
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      city: '',
      zip_code: '',
      age_min: '',
      age_max: ''
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
      status: 'new',
      contact_method: '' as ContactMethod,
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
    
    // Add total spent to the form data
    formData.append('totalSpent', totalSpent.toString());
    
    try {
      setUploadStatus('Uploading...');
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus(`Successfully imported ${result.successCount} leads! Cost per lead: $${result.costPerLead?.toFixed(2) || '0.00'}`);
        fetchLeads();
        setTimeout(() => {
          setUploadStatus('');
          setShowUploadForm(false);
          setTotalSpent(0);
        }, 4000);
      } else {
        setUploadStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
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
  };

  const handleLeadDoubleClick = (lead: Lead) => {
    const index = leads.findIndex(l => l.id === lead.id);
    setCurrentLeadIndex(index);
    setSelectedLead(lead);
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
    if (nextIndex < leads.length) {
      setCurrentLeadIndex(nextIndex);
      setSelectedLead(leads[nextIndex]);
    }
  };

  const handlePrevious = async () => {
    await saveCurrentChanges();
    const prevIndex = currentLeadIndex - 1;
    if (prevIndex >= 0) {
      setCurrentLeadIndex(prevIndex);
      setSelectedLead(leads[prevIndex]);
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
        fetchLeads();
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

  const totalLeads = leads.length;
  const totalCost = leads.reduce((sum, lead) => sum + lead.cost_per_lead, 0);
  const totalSales = leads.reduce((sum, lead) => sum + lead.sales_amount, 0);
  const roi = totalCost > 0 ? ((totalSales - totalCost) / totalCost * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl font-black mb-3">
            🔥 The Forge 🔥
          </h1>
          <p className="text-gray-300 text-lg">Where Cold Leads Turn to Gold Leads</p>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="bg-gray-100 p-6 border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
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
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Lead Management</h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                setShowAddForm(false);
              }}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              {showUploadForm ? 'Cancel Upload' : 'Upload CSV'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowUploadForm(false);
              }}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
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
                  <input
                    type="text"
                    placeholder="Occupation"
                    value={formData.occupation}
                    onChange={(e) => handleFormChange('occupation', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Income"
                    value={formData.income}
                    onChange={(e) => handleFormChange('income', e.target.value)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Household Size"
                    value={formData.household_size}
                    onChange={(e) => handleFormChange('household_size', parseInt(e.target.value) || 0)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
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
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="no_answer">No Answer</option>
                    <option value="follow_up_needed">Follow Up Needed</option>
                    <option value="qualified">Qualified</option>
                    <option value="not_qualified">Not Qualified</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
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
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost Per Lead"
                    value={formData.cost_per_lead.toFixed(2)}
                    onChange={(e) => handleFormChange('cost_per_lead', parseFloat(e.target.value) || 0)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Sales Amount"
                    value={formData.sales_amount}
                    onChange={(e) => handleFormChange('sales_amount', parseFloat(e.target.value) || 0)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Lead Score (0-100)"
                    value={formData.lead_score}
                    onChange={(e) => handleFormChange('lead_score', parseInt(e.target.value) || 0)}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    min="0"
                    max="100"
                  />
                  <input
                    type="date"
                    placeholder="Next Follow Up"
                    value={formData.next_follow_up}
                    onChange={(e) => setFormData({...formData, next_follow_up: e.target.value})}
                    className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none md:col-span-2"
                rows={3}
              />
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
          <div className="flex flex-wrap gap-4 items-center">
            <h3 className="text-lg font-semibold text-gray-800 mr-4">Filter Leads:</h3>
            
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
                <option value="follow_up_needed">Follow Up Needed</option>
                <option value="not_set">Not Set</option>
                <option value="appointment_set">Appointment Set</option>
                <option value="refund_needed">Refund Needed</option>
                <option value="closed">Closed</option>
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
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-32"
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
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-28"
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
                  className="px-2 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-16"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.age_max}
                  onChange={(e) => handleFilterChange('age_max', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded text-sm focus:border-red-600 focus:outline-none w-16"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex flex-col justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            {/* Results Count */}
            <div className="flex flex-col justify-end">
              <div className="text-sm text-gray-600">
                Showing {filteredLeads.length} of {leads.length} leads
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded border-2 border-red-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Phone</th>
                  <th className="p-4 text-left">Address</th>
                  <th className="p-4 text-left">DOB</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Actions</th>
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
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{formatName(lead.first_name)} {formatName(lead.last_name)}</div>
                          <div className="text-sm text-black">{lead.company}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium">{formatPhoneNumber(lead.phone)}</div>
                          {lead.phone_2 && <div className="text-black">{formatPhoneNumber(lead.phone_2)}</div>}
                          <div className="text-xs text-black">{lead.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div>{lead.address}</div>
                          <div className="text-black">{formatLocation(lead.city)}, {formatLocation(lead.state)} {lead.zip_code}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {lead.date_of_birth && (
                            <div>{new Date(lead.date_of_birth).toLocaleDateString()}</div>
                          )}
                          {lead.age && <div className="text-xs text-black">Age: {lead.age}</div>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                            lead.status === 'closed_won' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {lead.status.replace('_', ' ')}
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
                      <td className="p-4 text-sm">{lead.contact_method?.replace('_', ' ') || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(lead.id!)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
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
          hasNext={currentLeadIndex < leads.length - 1}
          hasPrevious={currentLeadIndex > 0}
          currentIndex={currentLeadIndex}
          totalCount={leads.length}
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
          />
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
  setPendingChanges
}: { 
  lead: Lead; 
  onUpdate: (lead: Lead) => void; 
  onClose: () => void;
  setPendingChanges: (changes: Partial<Lead> | null) => void;
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
    contact_method: lead.contact_method || '' as ContactMethod,
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
      contact_method: lead.contact_method || '' as ContactMethod,
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
                <option value="follow_up_needed">Follow Up Needed</option>
                <option value="not_set">Not Set</option>
                <option value="appointment_set">Appointment Set</option>
                <option value="refund_needed">Refund Needed</option>
                <option value="closed">Closed</option>
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
          <ActivitiesSection leadId={lead.id!} />

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
function ActivitiesSection({ leadId }: { leadId: number }) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [activityDetail, setActivityDetail] = useState('');
  const [activityOutcome, setActivityOutcome] = useState<ActivityOutcome | ''>('');
  const [isLoading, setIsLoading] = useState(false);

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

  const addActivity = async () => {
    if (!activityDetail.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          activity_type: activityType,
          activity_detail: activityDetail.trim(),
          outcome: activityOutcome || null
        })
      });

      if (response.ok) {
        setActivityDetail('');
        setActivityOutcome('');
        setShowActivityForm(false);
        await fetchActivities();
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-purple-100 text-purple-800';
      case 'voicemail': return 'bg-yellow-100 text-yellow-800';
      case 'no_answer': return 'bg-gray-100 text-gray-800';
      case 'busy': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h4 className="text-lg font-semibold mb-4 text-gray-900">Activity Timeline</h4>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => {
            setActivityType('call');
            setShowActivityForm(true);
          }}
          className="px-2 py-2 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
        >
          📞 Call
        </button>
        <button
          onClick={() => {
            setActivityType('text');
            setShowActivityForm(true);
          }}
          className="px-2 py-2 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
        >
          💬 Text
        </button>
        <button
          onClick={() => {
            setActivityType('email');
            setShowActivityForm(true);
          }}
          className="px-2 py-2 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
        >
          📧 Email
        </button>
      </div>

      {/* Activity Form */}
      {showActivityForm && (
        <div className="mb-4 bg-gray-50 p-3 rounded border">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Activity Type</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
            >
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
              <option value="status_change">Status Change</option>
              <option value="appointment">Appointment</option>
              <option value="sale">Sale</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Details</label>
            <textarea
              value={activityDetail}
              onChange={(e) => setActivityDetail(e.target.value)}
              placeholder="What happened?..."
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none resize-none text-sm"
              rows={2}
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Outcome (Optional)</label>
            <select
              value={activityOutcome}
              onChange={(e) => setActivityOutcome(e.target.value as ActivityOutcome | '')}
              className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
            >
              <option value="">None</option>
              <option value="answered">Answered</option>
              <option value="voicemail">Voicemail</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addActivity}
              disabled={!activityDetail.trim() || isLoading}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Activity'}
            </button>
            <button
              onClick={() => {
                setShowActivityForm(false);
                setActivityDetail('');
                setActivityOutcome('');
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {getActivityTypeLabel(activity.activity_type)}
                    </span>
                    {activity.outcome && (
                      <span className={`px-2 py-0.5 rounded text-xs ${getOutcomeColor(activity.outcome)}`}>
                        {activity.outcome.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mb-1">{activity.activity_detail}</p>
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
          premium_amount: newPolicy.premium_amount ? parseFloat(newPolicy.premium_amount) : undefined
        })
      });
      
      if (response.ok) {
        setNewPolicy({
          policy_type: '',
          policy_number: '',
          coverage_amount: '',
          premium_amount: '',
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
          premium_amount: editPolicy.premium_amount ? parseFloat(editPolicy.premium_amount) : undefined
        })
      });
      
      if (response.ok) {
        setEditingPolicy(null);
        setEditPolicy({
          policy_type: '',
          policy_number: '',
          coverage_amount: '',
          premium_amount: '',
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
              
              {(policy.coverage_amount || policy.premium_amount) && (
                <div className="text-xs text-gray-600 mb-1">
                  {policy.coverage_amount && (
                    <span>Coverage: ${policy.coverage_amount.toLocaleString()} </span>
                  )}
                  {policy.premium_amount && (
                    <span>Premium: ${policy.premium_amount.toLocaleString()}</span>
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