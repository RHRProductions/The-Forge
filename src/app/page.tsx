'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadStatus, ContactMethod } from '../../types/lead';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    status: 'new' as LeadStatus,
    contact_method: '' as ContactMethod,
    cost_per_lead: 0,
    sales_amount: 0,
    notes: '',
    source: 'manual'
  });

  useEffect(() => {
    fetchLeads();
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
      company: '',
      status: 'new',
      contact_method: '' as ContactMethod,
      cost_per_lead: 0,
      sales_amount: 0,
      notes: '',
      source: 'manual'
    });
    setShowAddForm(false);
    setEditingLead(null);
  };

  const startEdit = (lead: Lead) => {
    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company || '',
      status: lead.status,
      contact_method: lead.contact_method || '' as ContactMethod,
      cost_per_lead: lead.cost_per_lead,
      sales_amount: lead.sales_amount,
      notes: lead.notes || '',
      source: lead.source
    });
    setEditingLead(lead);
    setShowAddForm(true);
  };

  const handleCSVUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      setUploadStatus('Uploading...');
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus(`Successfully imported ${result.successCount} leads!`);
        fetchLeads();
        setTimeout(() => {
          setUploadStatus('');
          setShowUploadForm(false);
        }, 3000);
      } else {
        setUploadStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try again.');
    }
  };

  const totalLeads = leads.length;
  const totalCost = leads.reduce((sum, lead) => sum + lead.cost_per_lead, 0);
  const totalSales = leads.reduce((sum, lead) => sum + lead.sales_amount, 0);
  const roi = totalCost > 0 ? ((totalSales - totalCost) / totalCost * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold">The Forge</h1>
          <p className="text-gray-300 mt-2">Where Cold Leads Turn to Gold Leads</p>
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

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-6 rounded border-2 border-red-600 mb-6">
            <h3 className="text-xl font-bold mb-4">
              {editingLead ? 'Edit Lead' : 'Add New Lead'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Company"
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as LeadStatus})}
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
                onChange={(e) => setFormData({...formData, contact_method: e.target.value as ContactMethod})}
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
                value={formData.cost_per_lead}
                onChange={(e) => setFormData({...formData, cost_per_lead: parseFloat(e.target.value) || 0})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Sales Amount"
                value={formData.sales_amount}
                onChange={(e) => setFormData({...formData, sales_amount: parseFloat(e.target.value) || 0})}
                className="p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">CSV should include these columns:</p>
                <p className="text-xs">
                  first_name, last_name, email, phone, company, status, contact_method, cost_per_lead, sales_amount, notes
                </p>
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

        {/* Leads Table */}
        <div className="bg-white rounded border-2 border-red-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Contact</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Method</th>
                  <th className="p-4 text-left">Cost</th>
                  <th className="p-4 text-left">Sales</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No leads found. Add your first lead to get started!
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                          <div className="text-sm text-gray-500">{lead.company}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div>{lead.email}</div>
                          <div>{lead.phone}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                          lead.status === 'closed_won' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{lead.contact_method?.replace('_', ' ') || '-'}</td>
                      <td className="p-4 text-sm">${lead.cost_per_lead.toFixed(2)}</td>
                      <td className="p-4 text-sm">${lead.sales_amount.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(lead)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
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
    </div>
  );
}