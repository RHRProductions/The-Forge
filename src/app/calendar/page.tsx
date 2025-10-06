'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CalendarEvent {
  id: number;
  agent_id: number;
  lead_id?: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_phone?: string;
  created_by_name?: string;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'appointment',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch events
  useEffect(() => {
    if (session?.user) {
      fetchEvents();
    }
  }, [session]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/calendar');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedTimeSlot({ date, hour });
    const startDateTime = new Date(date);
    startDateTime.setHours(hour, 0, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hour + 1, 0, 0, 0);

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      ...formData,
      start_time: formatForInput(startDateTime),
      end_time: formatForInput(endDateTime),
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Determine the correct agent_id
      // For setters, use their agent_id. For agents/admins, use their own id
      const userRole = (session?.user as any).role;
      const userId = (session?.user as any).id;
      let agentId = userId;

      if (userRole === 'setter') {
        // Setters create events on their agent's calendar
        const agentIdValue = (session?.user as any).agent_id;
        if (agentIdValue) {
          agentId = agentIdValue;
        }
      }

      // Send the datetime-local values directly (format: YYYY-MM-DDTHH:mm)
      // This keeps the local timezone without conversion
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time,
          event_type: formData.event_type,
        }),
      });

      if (response.ok) {
        await fetchEvents();
        setShowAddForm(false);
        setFormData({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          event_type: 'appointment',
        });
        setSelectedTimeSlot(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create event');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      alert('Failed to delete event');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: notesText,
        }),
      });

      if (response.ok) {
        await fetchEvents();
        // Update the selected event with new description
        setSelectedEvent({ ...selectedEvent, description: notesText });
        setEditingNotes(false);
      }
    } catch (error) {
      alert('Failed to save notes');
    }
  };

  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (date: Date, hour: number, e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedEvent) return;

    // Calculate new start and end times
    const newStartTime = new Date(date);
    newStartTime.setHours(hour, 0, 0, 0);

    const oldStartTime = new Date(draggedEvent.start_time.replace('T', ' '));
    const oldEndTime = new Date(draggedEvent.end_time.replace('T', ' '));
    const duration = oldEndTime.getTime() - oldStartTime.getTime();

    const newEndTime = new Date(newStartTime.getTime() + duration);

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    try {
      const response = await fetch(`/api/calendar/${draggedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: formatForInput(newStartTime),
          end_time: formatForInput(newEndTime),
        }),
      });

      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      alert('Failed to move event');
    }

    setDraggedEvent(null);
  };

  // Get week days
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start on Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Time slots (8 AM to 8 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8);

  // Get events for a specific time slot
  const getEventsForSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      // Handle both ISO format (with Z) and local format (without Z)
      // For local format, create date in local timezone
      let eventStart: Date;
      if (event.start_time.includes('Z')) {
        // UTC format - convert to local
        eventStart = new Date(event.start_time);
      } else {
        // Local format - parse as local time
        eventStart = new Date(event.start_time.replace('T', ' '));
      }

      // Check if event is on the same date and hour
      const isSameDate =
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate();

      const isSameHour = eventStart.getHours() === hour;

      return isSameDate && isSameHour;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const weekDays = view === 'week' ? getWeekDays(currentDate) : [currentDate];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">📅 Calendar</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Calendar Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => view === 'week' ? navigateWeek('prev') : navigateDay('prev')}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-bold"
            >
              ← Previous
            </button>
            <h2 className="text-2xl font-bold">
              {view === 'week'
                ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              }
            </h2>
            <button
              onClick={() => view === 'week' ? navigateWeek('next') : navigateDay('next')}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-bold"
            >
              Next →
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
            >
              Today
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded font-bold ${view === 'day' ? 'bg-black text-white' : 'bg-gray-200'}`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded font-bold ${view === 'week' ? 'bg-black text-white' : 'bg-gray-200'}`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Add Event Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-red-600 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Add Appointment</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  >
                    <option value="appointment">Appointment</option>
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedTimeSlot(null);
                    }}
                    className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Event Detail Modal */}
        {showEventDetail && selectedEvent && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] w-96 max-h-[90vh]">
            <div className="bg-white border-4 border-red-600 rounded-lg p-6 overflow-y-auto shadow-2xl max-h-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Appointment Details</h2>
                <button
                  onClick={() => {
                    setShowEventDetail(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Client</label>
                  <p className="text-lg">
                    {selectedEvent.lead_first_name && selectedEvent.lead_last_name
                      ? `${selectedEvent.lead_first_name} ${selectedEvent.lead_last_name}`
                      : selectedEvent.title}
                  </p>
                </div>

                {selectedEvent.lead_phone && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <p className="text-lg">
                      <a href={`tel:${selectedEvent.lead_phone}`} className="text-blue-600 hover:underline">
                        {selectedEvent.lead_phone}
                      </a>
                    </p>
                  </div>
                )}

                {selectedEvent.description && (() => {
                  // Extract address from description (first line typically contains address info)
                  const lines = selectedEvent.description.split('\n').filter(line => line.trim());
                  const addressLines = [];
                  for (const line of lines) {
                    if (line.startsWith('Phone:') || line.startsWith('Notes:')) break;
                    if (line.trim()) addressLines.push(line.trim());
                  }
                  const address = addressLines.join(', ');

                  return address ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                      <p className="text-lg">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {address} 📍
                        </a>
                      </p>
                    </div>
                  ) : null;
                })()}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date & Time</label>
                  <p className="text-lg">
                    {new Date(selectedEvent.start_time).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-md text-gray-600">
                    {new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(selectedEvent.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {selectedEvent.created_by_name && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Set By</label>
                    <p className="text-md text-gray-600">{selectedEvent.created_by_name}</p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-gray-700">Notes</label>
                    {!editingNotes && (
                      <button
                        onClick={() => {
                          setNotesText(selectedEvent.description || '');
                          setEditingNotes(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedEvent.description ? 'Edit' : 'Add Notes'}
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        className="w-full p-3 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-sm"
                        rows={6}
                        placeholder="Add appointment notes, address, or other details..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNotes}
                          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes(false);
                            setNotesText('');
                          }}
                          className="bg-gray-300 text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 min-h-[80px]">
                      {selectedEvent.description ? (
                        <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEvent.description}</pre>
                      ) : (
                        <p className="text-gray-400 text-sm italic">No notes added yet</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (confirm('Delete this appointment?')) {
                        handleDelete(selectedEvent.id);
                        setShowEventDetail(false);
                        setSelectedEvent(null);
                      }
                    }}
                    className="flex-1 bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowEventDetail(false);
                      setSelectedEvent(null);
                    }}
                    className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white border-2 border-red-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-black text-white">
                  <th className="p-3 text-left border-r border-gray-600" style={{ width: '80px' }}>Time</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="p-3 text-center border-r border-gray-600">
                      <div className="font-bold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-sm">{day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(hour => (
                  <tr key={hour} className="border-t border-gray-200">
                    <td className="p-2 text-sm font-medium text-gray-600 border-r border-gray-200 bg-gray-50">
                      {hour % 12 || 12}:00 {hour >= 12 ? 'PM' : 'AM'}
                    </td>
                    {weekDays.map(day => {
                      const slotEvents = getEventsForSlot(day, hour);
                      return (
                        <td
                          key={`${day.toISOString()}-${hour}`}
                          className={`p-1 border-r border-gray-200 align-top cursor-pointer hover:bg-blue-50 transition-colors min-h-[80px] ${
                            draggedEvent ? 'hover:bg-green-100' : ''
                          }`}
                          onClick={() => handleTimeSlotClick(day, hour)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(day, hour, e)}
                        >
                          {slotEvents.map(event => (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => handleDragStart(event, e)}
                              className={`mb-1 p-2 rounded text-xs font-bold cursor-move relative group ${
                                event.event_type === 'appointment' ? 'bg-green-500 text-white' :
                                event.event_type === 'meeting' ? 'bg-blue-500 text-white' :
                                event.event_type === 'call' ? 'bg-yellow-500 text-white' :
                                event.event_type === 'personal' ? 'bg-purple-500 text-white' :
                                'bg-gray-500 text-white'
                              } ${draggedEvent?.id === event.id ? 'opacity-50' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setShowEventDetail(true);
                              }}
                            >
                              <div className="font-bold truncate pr-6">{event.title}</div>
                              {event.lead_first_name && (
                                <div className="text-xs opacity-90 truncate">
                                  {event.lead_first_name} {event.lead_last_name}
                                </div>
                              )}
                              <div className="text-xs opacity-75">
                                {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this appointment?')) {
                                    handleDelete(event.id);
                                  }
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded px-1 text-xs transition-opacity"
                                title="Delete appointment"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Call</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm">Personal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
