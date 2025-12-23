'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface ParsedLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number | null;
  gender: string;
  marital_status: string;
  occupation: string;
  income: string;
  household_size: number | null;
  status: string;
  contact_method: string;
  lead_type: string;
  cost_per_lead: number;
  sales_amount: number;
  notes: string;
  source: string;
  lead_score: number;
  lead_temperature: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LeadVendor {
  id: number;
  vendor_name: string;
  default_cost_per_lead?: number;
  default_temperature?: string;
}

export default function BulkAssignLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // CSV Upload state
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [costPerLead, setCostPerLead] = useState('');
  const [leadTemperature, setLeadTemperature] = useState('cold');
  const [csvUploaded, setCsvUploaded] = useState(false);

  // Agents list
  const [agents, setAgents] = useState<Agent[]>([]);

  // Lead vendors list
  const [leadVendors, setLeadVendors] = useState<LeadVendor[]>([]);

  const [selectedAgent, setSelectedAgent] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [leadsToAssign, setLeadsToAssign] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    lead_type: '',
    city: '',
    state: '',
    zip_code: '',
    temperature: '',
    age_min: '',
    age_max: '',
  });

  // Redirect if not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch agents and vendors on mount
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchAgents();
      fetchVendors();
    }
  }, [status, session]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/bulk-assign-leads');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/lead-vendors');
      if (response.ok) {
        const data = await response.json();
        setLeadVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  // Get unique sources from parsed leads
  const sources = useMemo(() => {
    const uniqueSources = new Set(parsedLeads.map(l => l.source).filter(Boolean));
    return Array.from(uniqueSources).sort();
  }, [parsedLeads]);

  // Filter leads in memory
  const filteredLeads = useMemo(() => {
    return parsedLeads.filter(lead => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const digitsOnly = filters.search.replace(/\D/g, '');
        const nameMatch = `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchLower);
        const phoneMatch = lead.phone.replace(/\D/g, '').includes(digitsOnly);
        if (!nameMatch && !phoneMatch) return false;
      }

      // Status filter
      if (filters.status && lead.status !== filters.status) return false;

      // Lead type filter
      if (filters.lead_type && lead.lead_type !== filters.lead_type) return false;

      // City filter
      if (filters.city && !lead.city.toLowerCase().includes(filters.city.toLowerCase())) return false;

      // State filter
      if (filters.state && !lead.state.toLowerCase().includes(filters.state.toLowerCase())) return false;

      // Zip code filter
      if (filters.zip_code && !lead.zip_code.includes(filters.zip_code)) return false;

      // Temperature filter
      if (filters.temperature && lead.lead_temperature !== filters.temperature) return false;

      // Age filters
      if (filters.age_min && lead.age !== null && lead.age < parseInt(filters.age_min)) return false;
      if (filters.age_max && lead.age !== null && lead.age > parseInt(filters.age_max)) return false;

      return true;
    });
  }, [parsedLeads, filters]);

  // Calculate how many leads will actually be assigned
  const actualLeadsToAssign = useMemo(() => {
    const count = parseInt(leadsToAssign) || 0;
    if (count <= 0 || count >= filteredLeads.length) {
      return filteredLeads;
    }
    return filteredLeads.slice(0, count);
  }, [filteredLeads, leadsToAssign]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      lead_type: '',
      city: '',
      state: '',
      zip_code: '',
      temperature: '',
      age_min: '',
      age_max: '',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!vendorName.trim()) {
      setError('Please select a lead vendor before uploading');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendorName', vendorName);
      formData.append('costPerLead', costPerLead || '0');
      formData.append('leadTemperature', leadTemperature);

      const response = await fetch('/api/admin/parse-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setParsedLeads(data.leads);
        setCsvUploaded(true);
        setSuccess(`Successfully parsed ${data.total} leads from CSV`);
      } else {
        setError(data.error || 'Failed to parse CSV');
      }
    } catch (error) {
      setError('Failed to upload CSV file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetUpload = () => {
    setParsedLeads([]);
    setCsvUploaded(false);
    setVendorName('');
    setCostPerLead('');
    setLeadTemperature('cold');
    clearFilters();
    setSuccess('');
    setError('');
  };

  const handleAssignLeads = async () => {
    if (!selectedAgent) {
      setError('Please select an agent to assign leads to');
      return;
    }

    if (actualLeadsToAssign.length === 0) {
      setError('No leads to assign');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/save-and-assign-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: actualLeadsToAssign,
          targetAgentId: parseInt(selectedAgent),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowConfirm(false);
        setSelectedAgent('');
        setLeadsToAssign('');

        // Remove assigned leads from the list
        const assignedIds = new Set(actualLeadsToAssign.map(l => l.id));
        setParsedLeads(prev => prev.filter(l => !assignedIds.has(l.id)));
        clearFilters();
      } else {
        setError(data.error || 'Failed to assign leads');
      }
    } catch (error) {
      setError('Failed to assign leads');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">Bulk Assign Leads</h1>
            <NavigationMenu currentPage="admin" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Back Link */}
        <button
          onClick={() => router.push('/admin/settings')}
          className="mb-6 text-gray-600 hover:text-black flex items-center gap-2"
        >
          &larr; Back to Admin Settings
        </button>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-blue-800 mb-2">How to use:</h2>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Select a lead vendor and configure upload settings</li>
            <li>Upload a CSV file containing the leads you want to distribute</li>
            <li>Use filters to select a subset of leads to assign</li>
            <li>Select an agent and click "Assign" to transfer those leads</li>
            <li>Repeat steps 3-4 to distribute different subsets to different agents</li>
          </ol>
        </div>

        {/* CSV Upload Section */}
        {!csvUploaded ? (
          <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Upload CSV</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Lead Vendor <span className="text-red-600">*</span>
                </label>
                <select
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                >
                  <option value="">Select a vendor...</option>
                  {leadVendors.map(vendor => (
                    <option key={vendor.id} value={vendor.vendor_name}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cost Per Lead ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPerLead}
                  onChange={(e) => setCostPerLead(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lead Temperature</label>
                <select
                  value={leadTemperature}
                  onChange={(e) => setLeadTemperature(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                >
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className={`cursor-pointer ${!vendorName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-gray-600 mb-2">
                  {uploading ? 'Uploading...' : 'Click to upload CSV file'}
                </div>
                <button
                  type="button"
                  onClick={() => vendorName.trim() && fileInputRef.current?.click()}
                  disabled={uploading || !vendorName.trim()}
                  className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Processing...' : 'Select CSV File'}
                </button>
              </label>
              {!vendorName.trim() && (
                <p className="text-sm text-red-600 mt-2">Please select a lead vendor first</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Upload Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-green-800">CSV Uploaded:</span>{' '}
                  <span className="text-green-700">
                    {parsedLeads.length} leads from "{vendorName}"
                    (Cost: ${parseFloat(costPerLead || '0').toFixed(2)}/lead, Temp: {leadTemperature})
                  </span>
                </div>
                <button
                  onClick={resetUpload}
                  className="bg-gray-500 text-white px-4 py-2 rounded font-bold hover:bg-gray-600 transition-colors"
                >
                  Upload New CSV
                </button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Filter Leads</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="Name or phone..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="no_answer">No Answer</option>
                    <option value="follow_up_needed">Follow Up Needed</option>
                    <option value="not_set">Not Set</option>
                    <option value="appointment_set">Appointment Set</option>
                    <option value="refund_needed">Refund Needed</option>
                    <option value="closed">Closed</option>
                    <option value="tol">TOL</option>
                  </select>
                </div>

                {/* Lead Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Lead Type</label>
                  <select
                    value={filters.lead_type}
                    onChange={(e) => handleFilterChange('lead_type', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="t65">T65</option>
                    <option value="t65_wl">T65 WL</option>
                    <option value="life">Life</option>
                    <option value="client">Client</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="City..."
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value.toUpperCase())}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="e.g. AZ"
                    maxLength={2}
                  />
                </div>

                {/* Zip Code */}
                <div>
                  <label className="block text-sm font-medium mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={filters.zip_code}
                    onChange={(e) => handleFilterChange('zip_code', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="Zip..."
                  />
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature</label>
                  <select
                    value={filters.temperature}
                    onChange={(e) => handleFilterChange('temperature', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="">All Temperatures</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium mb-1">Age Min</label>
                  <input
                    type="number"
                    value={filters.age_min}
                    onChange={(e) => handleFilterChange('age_min', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="Min age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Age Max</label>
                  <input
                    type="number"
                    value={filters.age_max}
                    onChange={(e) => handleFilterChange('age_max', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="Max age"
                  />
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Filtered Leads: <span className="text-red-600">{filteredLeads.length.toLocaleString()}</span>
                  <span className="text-gray-500 text-lg font-normal ml-2">
                    (of {parsedLeads.length.toLocaleString()} total)
                  </span>
                </h2>
              </div>

              {/* Assignment Controls */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">Assign to Agent</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id.toString()}>
                          {agent.name} ({agent.email}) - {agent.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[150px]">
                    <label className="block text-sm font-medium mb-1">
                      # of Leads
                      <span className="text-gray-500 font-normal"> (optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={filteredLeads.length}
                      value={leadsToAssign}
                      onChange={(e) => setLeadsToAssign(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      placeholder={`All (${filteredLeads.length})`}
                    />
                  </div>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!selectedAgent || filteredLeads.length === 0 || loading}
                    className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Assign {actualLeadsToAssign.length.toLocaleString()} Leads
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 border-b-2 border-gray-300">Name</th>
                      <th className="text-left p-3 border-b-2 border-gray-300">Phone</th>
                      <th className="text-left p-3 border-b-2 border-gray-300">Location</th>
                      <th className="text-left p-3 border-b-2 border-gray-300">Age</th>
                      <th className="text-left p-3 border-b-2 border-gray-300">Type</th>
                      <th className="text-left p-3 border-b-2 border-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500">
                          No leads match the current filters
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.slice(0, 50).map(lead => (
                        <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">{lead.first_name} {lead.last_name}</td>
                          <td className="p-3">{lead.phone}</td>
                          <td className="p-3">{lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}</td>
                          <td className="p-3">{lead.age || '-'}</td>
                          <td className="p-3">
                            <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                              {lead.lead_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {filteredLeads.length > 50 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing first 50 of {filteredLeads.length.toLocaleString()} matching leads
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border-4 border-red-600">
              <h3 className="text-xl font-bold mb-4">Confirm Assignment</h3>
              <p className="text-gray-600 mb-4">
                You are about to save and assign <strong>{actualLeadsToAssign.length.toLocaleString()} leads</strong> to{' '}
                <strong>{agents.find(a => a.id.toString() === selectedAgent)?.name}</strong>.
              </p>
              <p className="text-gray-600 mb-6">
                These leads will be saved to the database with the selected agent as owner. Continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignLeads}
                  className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Yes, Assign Leads'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
