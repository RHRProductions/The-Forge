'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface BouncedEmail {
  email_address: string;
  bounce_reason: string;
  last_bounce_date: string;
  bounce_count: number;
  lead_id: number | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export default function BouncedEmailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bouncedEmails, setBouncedEmails] = useState<BouncedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchBouncedEmails();
    }
  }, [session]);

  const fetchBouncedEmails = async () => {
    try {
      const response = await fetch('/api/emails/bounced');
      if (response.ok) {
        const data = await response.json();
        setBouncedEmails(data);
      }
    } catch (error) {
      console.error('Error fetching bounced emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBounce = async (email: string) => {
    if (!confirm(`Remove "${email}" from bounce list?\n\nThis will allow emails to be sent to this address again. Only do this if you believe the bounce was temporary.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/emails/bounced/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully removed bounce status from ${data.updated} record(s).`);
        await fetchBouncedEmails();
      } else {
        alert('Failed to remove bounce status');
      }
    } catch (error) {
      console.error('Error removing bounce:', error);
      alert('An error occurred');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const filteredEmails = bouncedEmails.filter(item =>
    item.email_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black">⚠️ Bounced Emails</h1>
              <p className="text-gray-400 mt-2">Manage invalid or bounced email addresses</p>
            </div>
            <NavigationMenu currentPage="bounced-emails" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Info Box */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-bold text-yellow-800">About Bounced Emails</h3>
              <p className="text-yellow-700 mt-1">
                Emails that bounce are automatically prevented from receiving future campaigns.
                Common reasons include invalid addresses, full mailboxes, or blocked domains.
                Only remove a bounce if you believe it was temporary (e.g., mailbox was full).
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded border-l-4 border-red-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">Total Bounced Emails</h3>
            <p className="text-3xl font-bold">{bouncedEmails.length}</p>
          </div>
          <div className="bg-white p-4 rounded border-l-4 border-orange-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">With Lead Info</h3>
            <p className="text-3xl font-bold">
              {bouncedEmails.filter(e => e.lead_id).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded border-l-4 border-gray-600 shadow">
            <h3 className="text-sm font-medium text-gray-600">Total Bounce Attempts</h3>
            <p className="text-3xl font-bold">
              {bouncedEmails.reduce((sum, e) => sum + e.bounce_count, 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by email, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
          />
        </div>

        {/* Bounced Emails Table */}
        <div className="bg-white border-2 border-red-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-4">Email Address</th>
                <th className="text-left p-4">Lead Info</th>
                <th className="text-left p-4">Bounce Reason</th>
                <th className="text-left p-4">Last Bounce</th>
                <th className="text-left p-4">Count</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    {searchQuery ? 'No bounced emails match your search' : 'No bounced emails found'}
                  </td>
                </tr>
              ) : (
                filteredEmails.map((item, index) => (
                  <tr key={item.email_address} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-4">
                      <div className="font-medium">{item.email_address}</div>
                    </td>
                    <td className="p-4">
                      {item.lead_id ? (
                        <div>
                          <div className="font-medium">
                            {item.first_name} {item.last_name}
                          </div>
                          {item.phone && (
                            <div className="text-sm text-gray-600">{item.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No lead found</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                        {item.bounce_reason || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(item.last_bounce_date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className="font-bold">{item.bounce_count}</span>
                    </td>
                    <td className="p-4">
                      {(session.user as any).role === 'admin' && (
                        <button
                          onClick={() => handleRemoveBounce(item.email_address)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700 transition-colors"
                        >
                          Remove Bounce
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
