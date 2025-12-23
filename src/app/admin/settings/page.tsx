'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Lead vendor management state
  const [vendors, setVendors] = useState<any[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch vendors
  useEffect(() => {
    if ((session?.user as any)?.role === 'admin') {
      fetchVendors();
    }
  }, [session]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/lead-vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_name: newVendorName.trim() }),
      });

      if (response.ok) {
        setNewVendorName('');
        setShowVendorForm(false);
        setSuccess('Vendor added successfully!');
        fetchVendors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add vendor');
      }
    } catch (error) {
      setError('Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setSuccess('Vendor deleted successfully!');
        fetchVendors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete vendor');
      }
    } catch (error) {
      setError('Failed to delete vendor');
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
            <h1 className="text-4xl font-black">⚙️ Admin Settings</h1>
            <NavigationMenu currentPage="admin-settings" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
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

        {/* Lead Vendor Management */}
        <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-3xl font-black mb-6">🏷️ Lead Vendor Management</h2>

          <div className="mb-6">
            <button
              onClick={() => setShowVendorForm(!showVendorForm)}
              className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
            >
              {showVendorForm ? 'Cancel' : '+ Add New Vendor'}
            </button>
          </div>

          {showVendorForm && (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Add New Vendor</h3>
              <form onSubmit={handleAddVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="e.g., Marc Publishing Leads"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Adding...' : 'Add Vendor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVendorForm(false)}
                    className="bg-gray-300 text-black px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Vendors List */}
          <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left p-4 font-bold">Vendor Name</th>
                  <th className="text-left p-4 font-bold">Created</th>
                  <th className="text-left p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-8 text-gray-500">
                      No vendors yet. Click "Add New Vendor" to create one.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4 font-semibold">{vendor.vendor_name}</td>
                      <td className="p-4 text-gray-600">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDeleteVendor(vendor.id, vendor.vendor_name)}
                          disabled={loading}
                          className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
