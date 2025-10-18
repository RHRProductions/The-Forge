'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_since?: string;
  products?: string;
  notes?: string;
  created_at: string;
}

interface ClientActivity {
  id: number;
  client_id: number;
  activity_type: string;
  notes: string | null;
  created_by_name: string;
  created_at: string;
}

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    phone_2: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    client_since: new Date().toISOString().split('T')[0],
    products: '',
    notes: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchClients();
    }
  }, [status]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          phone_2: '',
          date_of_birth: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          client_since: new Date().toISOString().split('T')[0],
          products: '',
          notes: ''
        });
        fetchClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const openClientDetail = async (client: Client) => {
    setSelectedClient(client);
    setLoadingActivities(true);

    try {
      const response = await fetch(`/api/clients/${client.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const addActivity = async (activityType: string, notes?: string) => {
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/clients/${selectedClient.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: activityType, notes })
      });

      if (response.ok) {
        const newActivity = await response.json();
        setActivities([newActivity, ...activities]);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleAEPLetter = () => {
    const year = new Date().getFullYear();
    addActivity('aep_letter', `AEP ${year} retention letter sent`);
  };

  const handleLogCall = () => {
    const notes = prompt('Call notes (optional):');
    addActivity('call', notes || 'Called client');
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">👥 Clients</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded font-bold transition-colors"
              >
                + Add Client
              </button>
              <NavigationMenu currentPage="clients" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="mb-6 bg-gray-100 p-4 rounded">
          <div className="text-2xl font-bold">Total Clients: {clients.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            Active clients with issued policies
          </div>
        </div>

        {/* Client Table */}
        {clients.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed">
            <div className="text-6xl mb-4">👥</div>
            <div className="text-2xl font-bold mb-2">No clients yet</div>
            <div className="text-gray-600 mb-4">Add your existing clients to get started</div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold"
            >
              + Add Your First Client
            </button>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border-4 border-black">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Name</th>
                    <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Phone</th>
                    <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Address</th>
                    <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Products</th>
                    <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Client Since</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => openClientDetail(client)}
                    >
                      <td className="p-2 sm:p-4">
                        <div>
                          <div className="font-medium text-xs sm:text-base">
                            {formatName(client.first_name)} {formatName(client.last_name)}
                          </div>
                          {client.email && (
                            <div className="text-xs text-gray-500">{client.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium">{formatPhoneNumber(client.phone)}</div>
                          {client.phone_2 && (
                            <div className="text-gray-500">{formatPhoneNumber(client.phone_2)}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          {client.address && <div>{client.address}</div>}
                          {client.city && client.state && (
                            <div className="text-gray-500">
                              {client.city}, {client.state} {client.zip_code}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          {client.products ? (
                            <div className="whitespace-pre-wrap">{client.products}</div>
                          ) : (
                            <span className="text-gray-400">No products listed</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          {client.client_since ? (
                            new Date(client.client_since).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Client</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-black text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Phone 2</label>
                  <input
                    type="tel"
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border-2 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border-2 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Client Since</label>
                  <input
                    type="date"
                    value={formData.client_since}
                    onChange={(e) => setFormData({ ...formData, client_since: e.target.value })}
                    className="w-full border-2 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Products/Policies</label>
                <textarea
                  value={formData.products}
                  onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                  placeholder="Medicare Advantage - Humana&#10;Part D - SilverScript&#10;Final Expense Life"
                  className="w-full border-2 rounded px-3 py-2 h-24"
                />
                <div className="text-xs text-gray-500 mt-1">List products/policies one per line</div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border-2 rounded px-3 py-2 h-20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold"
                >
                  Add Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {formatName(selectedClient.first_name)} {formatName(selectedClient.last_name)}
              </h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-500 hover:text-black text-2xl"
              >
                ×
              </button>
            </div>

            {/* Client Info */}
            <div className="bg-gray-50 rounded p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                {selectedClient.phone && (
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="font-semibold">📞 {formatPhoneNumber(selectedClient.phone)}</div>
                  </div>
                )}
                {selectedClient.phone_2 && (
                  <div>
                    <div className="text-xs text-gray-500">Phone 2</div>
                    <div className="font-semibold">📞 {formatPhoneNumber(selectedClient.phone_2)}</div>
                  </div>
                )}
                {selectedClient.email && (
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-semibold">✉️ {selectedClient.email}</div>
                  </div>
                )}
                {selectedClient.address && (
                  <div>
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="font-semibold">{selectedClient.address}</div>
                  </div>
                )}
                {selectedClient.city && selectedClient.state && (
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="font-semibold">📍 {selectedClient.city}, {selectedClient.state}</div>
                  </div>
                )}
                {selectedClient.date_of_birth && (
                  <div>
                    <div className="text-xs text-gray-500">Date of Birth</div>
                    <div className="font-semibold">
                      {new Date(selectedClient.date_of_birth).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedClient.client_since && (
                  <div>
                    <div className="text-xs text-gray-500">Client Since</div>
                    <div className="font-semibold">
                      {new Date(selectedClient.client_since).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {selectedClient.products && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Products/Policies</div>
                  <div className="whitespace-pre-wrap">{selectedClient.products}</div>
                </div>
              )}

              {selectedClient.notes && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Notes</div>
                  <div className="whitespace-pre-wrap">{selectedClient.notes}</div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <div className="font-bold text-lg mb-3">Quick Actions</div>
              <div className="flex gap-3">
                <button
                  onClick={handleAEPLetter}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition-colors"
                >
                  📧 AEP Letter Sent
                </button>
                <button
                  onClick={handleLogCall}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold transition-colors"
                >
                  📞 Log Call
                </button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <div className="font-bold text-lg mb-3">Activity Timeline</div>

              {loadingActivities ? (
                <div className="text-center py-8 text-gray-500">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activities yet. Use the quick actions above to log your first activity!
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border-l-4 border-gray-300 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">
                            {activity.activity_type === 'aep_letter' && '📧 AEP Letter Sent'}
                            {activity.activity_type === 'call' && '📞 Call Logged'}
                            {activity.activity_type === 'note' && '📝 Note Added'}
                          </div>
                          {activity.notes && (
                            <div className="text-sm text-gray-700 mt-1">{activity.notes}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(activity.created_at).toLocaleString()} by {activity.created_by_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
