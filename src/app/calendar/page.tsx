'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface CalendarEvent {
  id: number;
  agent_id: number;
  lead_id?: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  color?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_phone?: string;
  created_by_name?: string;
  appointment_outcome?: string;
  appointment_detail?: string;
  lead_temperature?: string;
  lead_status?: string;
  pending_policies?: number;
  active_policies?: number;
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
    color: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [resizingEvent, setResizingEvent] = useState<{ event: CalendarEvent; edge: 'top' | 'bottom'; previewStart?: Date; previewEnd?: Date } | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    activity_type: 'note' as any,
    activity_detail: '',
    outcome: '' as any,
    lead_temperature_after: '' as any,
    next_follow_up_date: '',
  });
  const [policies, setPolicies] = useState<any[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyFormData, setPolicyFormData] = useState({
    policy_number: '',
    policy_type: '',
    coverage_amount: '',
    premium_amount: '',
    commission_amount: '',
    start_date: '',
    status: 'pending',
    notes: '',
  });
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [editingColor, setEditingColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [editingDateTime, setEditingDateTime] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

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

  const fetchActivities = async (leadId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchPolicies = async (leadId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/policies`);
      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchImages = async (leadId: number) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  // Fetch data when event detail is shown and has a lead_id
  useEffect(() => {
    if (showEventDetail && selectedEvent?.lead_id) {
      fetchActivities(selectedEvent.lead_id);
      fetchPolicies(selectedEvent.lead_id);
      fetchImages(selectedEvent.lead_id);
    } else {
      setActivities([]);
      setPolicies([]);
      setImages([]);
    }
  }, [showEventDetail, selectedEvent]);

  const handleTimeSlotClick = (date: Date, hour: number, minute: number = 0) => {
    setSelectedTimeSlot({ date, hour });
    const startDateTime = new Date(date);
    startDateTime.setHours(hour, minute, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hour, minute + 15, 0, 0); // Default to 15 minutes

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
          color: formData.color || null,
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
          color: '',
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

  const handleCloseEventDetail = async () => {
    // If editing notes and there are changes, save them first
    if (editingNotes && notesText !== selectedEvent?.description) {
      await handleSaveNotes();
    }
    setShowEventDetail(false);
    setSelectedEvent(null);
    setEditingNotes(false);
  };

  const handleUpdateColor = async (color: string) => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          color: color || null,
        }),
      });

      if (response.ok) {
        await fetchEvents();
        // Update the selected event with new color
        setSelectedEvent({ ...selectedEvent, color: color });
        setEditingColor(false);
      }
    } catch (error) {
      alert('Failed to update color');
    }
  };

  const handleUpdateDateTime = async () => {
    if (!selectedEvent) return;

    // Validate that end is after start
    const start = new Date(editStartTime);
    const end = new Date(editEndTime);
    if (end <= start) {
      alert('End time must be after start time');
      return;
    }

    try {
      const response = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: editStartTime,
          end_time: editEndTime,
        }),
      });

      if (response.ok) {
        await fetchEvents();
        // Update the selected event with new times
        setSelectedEvent({ ...selectedEvent, start_time: editStartTime, end_time: editEndTime });
        setEditingDateTime(false);
      }
    } catch (error) {
      alert('Failed to update time');
    }
  };

  const handleCreateActivity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEvent?.lead_id) return;

    try {
      // Create activity - set dial_count to 0 for appointment activities
      const activityResponse = await fetch(`/api/leads/${selectedEvent.lead_id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityFormData,
          dial_count: 0,  // Appointment-related activities don't count as dials
        }),
      });

      if (activityResponse.ok) {
        // If presentation was made, check if there are any policies
        if (activityFormData.activity_type === 'appointment') {
          // Fetch policies for this lead
          const policiesResponse = await fetch(`/api/leads/${selectedEvent.lead_id}/policies`);
          if (policiesResponse.ok) {
            const policies = await policiesResponse.json();

            // If no policies exist, this was a presentation without a sale
            if (policies.length === 0) {
              // Set follow-up date to 7 days from now
              const followUpDate = new Date();
              followUpDate.setDate(followUpDate.getDate() + 7);

              // Update lead to hot temperature, follow_up_needed status, and set follow-up date
              const updateResponse = await fetch(`/api/leads/${selectedEvent.lead_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lead_temperature: 'hot',
                  status: 'follow_up_needed',
                  next_follow_up: followUpDate.toISOString().split('T')[0], // YYYY-MM-DD format
                }),
              });

              if (updateResponse.ok) {
                alert('Lead set to HOT with follow-up reminder for 7 days out.');
                // Refresh calendar to show updated color
                await fetchEvents();
              } else {
                console.error('Failed to update lead:', await updateResponse.text());
                alert('Failed to update lead. Please try again.');
              }
            }
          }
        }

        // Also add to lead notes with timestamp
        const activityTypeLabel = activityFormData.activity_type === 'note' ? 'Note' :
                                  activityFormData.activity_type === 'appointment' ? 'Presentation Made' :
                                  activityFormData.activity_type === 'sale' ? 'Policy Sold' :
                                  activityFormData.activity_type;

        const noteText = `[${activityTypeLabel}] ${activityFormData.activity_detail}`;

        await fetch(`/api/leads/${selectedEvent.lead_id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: noteText }),
        });

        await fetchActivities(selectedEvent.lead_id);
        await fetchEvents(); // Refresh calendar to show any status changes
        setShowActivityForm(false);
        setActivityFormData({
          activity_type: 'note',
          activity_detail: '',
          outcome: '',
          lead_temperature_after: '',
          next_follow_up_date: '',
        });
      }
    } catch (error) {
      alert('Failed to create activity');
    }
  };

  const handleQuickActivity = async (type: string, outcome?: string) => {
    if (!selectedEvent?.lead_id) return;

    const activityData: any = {
      activity_type: type,
      activity_detail: '',
      outcome: outcome || '',
      dial_count: 0,  // Appointment activities don't count as dials
    };

    let noteText = '';

    // Auto-set outcomes for appointment buttons
    if (type === 'appointment') {
      if (outcome === 'completed') {
        activityData.activity_detail = 'Client showed up for appointment';
        noteText = '[Appointment] Client showed up for appointment';
      } else if (outcome === 'no_show') {
        activityData.activity_detail = 'Client did not show for appointment';
        activityData.outcome = 'no_answer';  // Map to existing outcome
        noteText = '[Appointment] Client did not show for appointment';
      } else if (outcome === 'cancelled') {
        activityData.activity_detail = 'Appointment cancelled/rescheduled';
        noteText = '[Appointment] Appointment cancelled/rescheduled';
      }
    }

    try {
      const response = await fetch(`/api/leads/${selectedEvent.lead_id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        // Also add to lead notes
        if (noteText) {
          await fetch(`/api/leads/${selectedEvent.lead_id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteText }),
          });
        }

        await fetchActivities(selectedEvent.lead_id);
        await fetchEvents(); // Refresh calendar to show status changes (e.g., purple for no-show/cancelled)
      }
    } catch (error) {
      alert('Failed to log activity');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent?.lead_id) return;

    try {
      if (editingPolicy) {
        // Update existing policy
        const response = await fetch(`/api/leads/${selectedEvent.lead_id}/policies/${editingPolicy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policyFormData),
        });

        if (response.ok) {
          await fetchPolicies(selectedEvent.lead_id);
          await fetchEvents(); // Refresh calendar to show updated colors
          setShowPolicyForm(false);
          setEditingPolicy(null);
          setPolicyFormData({
            policy_number: '',
            policy_type: '',
            coverage_amount: '',
            premium_amount: '',
            commission_amount: '',
            start_date: '',
            status: 'pending',
            notes: '',
          });
        }
      } else {
        // Create new policy
        const response = await fetch(`/api/leads/${selectedEvent.lead_id}/policies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policyFormData),
        });

        if (response.ok) {
          await fetchPolicies(selectedEvent.lead_id);
          await fetchEvents(); // Refresh calendar to show updated colors
          setShowPolicyForm(false);
          setPolicyFormData({
            policy_number: '',
            policy_type: '',
            coverage_amount: '',
            premium_amount: '',
            commission_amount: '',
            start_date: '',
            status: 'pending',
            notes: '',
          });
        }
      }
    } catch (error) {
      alert('Failed to save policy');
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (!selectedEvent?.lead_id) return;
    if (!confirm('Are you sure you want to delete this policy? This will remove it from sales analytics.')) return;

    try {
      const response = await fetch(`/api/leads/${selectedEvent.lead_id}/policies/${policyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPolicies(selectedEvent.lead_id);
        await fetchEvents(); // Refresh calendar to show updated colors
      }
    } catch (error) {
      alert('Failed to delete policy');
    }
  };

  const handleEditPolicy = (policy: any) => {
    setEditingPolicy(policy);
    setPolicyFormData({
      policy_number: policy.policy_number || '',
      policy_type: policy.policy_type || '',
      coverage_amount: policy.coverage_amount?.toString() || '',
      premium_amount: policy.premium_amount?.toString() || '',
      commission_amount: policy.commission_amount?.toString() || '',
      start_date: policy.start_date || '',
      status: policy.status || 'pending',
      notes: policy.notes || '',
    });
    setShowPolicyForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEvent?.lead_id || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);  // Changed from 'file' to 'image' to match API

    setUploadingImage(true);
    try {
      const response = await fetch(`/api/leads/${selectedEvent.lead_id}/images`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchImages(selectedEvent.lead_id);
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
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

  const handleResizeStart = (event: CalendarEvent, edge: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStart = new Date(event.start_time.replace('T', ' '));
    const currentEnd = new Date(event.end_time.replace('T', ' '));
    setResizingEvent({ event, edge, previewStart: currentStart, previewEnd: currentEnd });
  };

  const handleResizePreview = (date: Date, hour: number, minute: number) => {
    if (!resizingEvent) return;

    const newTime = new Date(date);
    newTime.setHours(hour, minute, 0, 0);

    const currentStart = new Date(resizingEvent.event.start_time.replace('T', ' '));
    const currentEnd = new Date(resizingEvent.event.end_time.replace('T', ' '));

    setResizingEvent({
      ...resizingEvent,
      previewStart: resizingEvent.edge === 'top' ? newTime : currentStart,
      previewEnd: resizingEvent.edge === 'bottom' ? newTime : currentEnd,
    });
  };

  const handleResizeMove = async (date: Date, hour: number, minute: number) => {
    if (!resizingEvent) return;

    const newTime = new Date(date);
    newTime.setHours(hour, minute, 0, 0);

    const formatForInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const currentStart = new Date(resizingEvent.event.start_time.replace('T', ' '));
    const currentEnd = new Date(resizingEvent.event.end_time.replace('T', ' '));

    const newStart = resizingEvent.edge === 'top' ? newTime : currentStart;
    const newEnd = resizingEvent.edge === 'bottom' ? newTime : currentEnd;

    // Validate that end is after start
    if (newEnd <= newStart) {
      alert('End time must be after start time');
      setResizingEvent(null);
      return;
    }

    try {
      const response = await fetch(`/api/calendar/${resizingEvent.event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: formatForInput(newStart),
          end_time: formatForInput(newEnd),
        }),
      });

      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      alert('Failed to resize event');
    }

    setResizingEvent(null);
  };

  const handleDrop = async (date: Date, hour: number, minute: number, e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedEvent) return;

    // Calculate new start and end times
    const newStartTime = new Date(date);
    newStartTime.setHours(hour, minute, 0, 0);

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

  // Time slots (Full 24 hours in 15-minute increments)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      // Handle both ISO format (with Z) and local format (without Z)
      let eventStart: Date;
      if (event.start_time.includes('Z')) {
        eventStart = new Date(event.start_time);
      } else {
        eventStart = new Date(event.start_time.replace('T', ' '));
      }

      // Check if event is on the same date
      const isSameDate =
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate();

      return isSameDate;
    });
  };

  // Calculate event position and height
  const getEventPosition = (event: CalendarEvent, previewStart?: Date, previewEnd?: Date) => {
    let eventStart: Date, eventEnd: Date;

    if (previewStart && previewEnd) {
      eventStart = previewStart;
      eventEnd = previewEnd;
    } else if (event.start_time.includes('Z')) {
      eventStart = new Date(event.start_time);
      eventEnd = new Date(event.end_time);
    } else {
      eventStart = new Date(event.start_time.replace('T', ' '));
      eventEnd = new Date(event.end_time.replace('T', ' '));
    }

    // Calculate start position in minutes from midnight
    const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    // Each hour row is a fixed height, calculate proportional positioning
    // 60 minutes = 100% of one hour row
    const hourRowHeight = 60; // This will be used for percentage calculations
    const topPosition = (startMinutes / 60) * hourRowHeight;
    const height = (durationMinutes / 60) * hourRowHeight;

    return { topPosition, height, startMinutes, durationMinutes };
  };

  // Format duration for display
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
      <header className="bg-black text-white p-3 sm:p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-4xl font-black">📅 Calendar</h1>
            <NavigationMenu currentPage="calendar" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Calendar Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex gap-2 sm:gap-4 items-center flex-wrap">
            <button
              onClick={() => view === 'week' ? navigateWeek('prev') : navigateDay('prev')}
              className="bg-gray-200 hover:bg-gray-300 px-2 sm:px-4 py-2 rounded font-bold text-xs sm:text-base"
            >
              ← <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </button>
            <h2 className="text-sm sm:text-2xl font-bold">
              {view === 'week'
                ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              }
            </h2>
            <button
              onClick={() => view === 'week' ? navigateWeek('next') : navigateDay('next')}
              className="bg-gray-200 hover:bg-gray-300 px-2 sm:px-4 py-2 rounded font-bold text-xs sm:text-base"
            >
              <span className="hidden sm:inline">Next</span> →
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-2 rounded font-bold text-xs sm:text-base"
            >
              Today
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('day')}
              className={`px-2 sm:px-4 py-2 rounded font-bold text-xs sm:text-base ${view === 'day' ? 'bg-black text-white' : 'bg-gray-200'}`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-2 sm:px-4 py-2 rounded font-bold text-xs sm:text-base ${view === 'week' ? 'bg-black text-white' : 'bg-gray-200'}`}
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

                <div>
                  <label className="block text-sm font-medium mb-2">Custom Color (Optional)</label>
                  <p className="text-xs text-gray-500 mb-2">Leave blank to use automatic colors based on appointment status</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Blue', value: 'bg-blue-500 text-white' },
                      { name: 'Green', value: 'bg-green-500 text-white' },
                      { name: 'Red', value: 'bg-red-500 text-white' },
                      { name: 'Yellow', value: 'bg-yellow-500 text-white' },
                      { name: 'Purple', value: 'bg-purple-500 text-white' },
                      { name: 'Orange', value: 'bg-orange-500 text-white' },
                      { name: 'Pink', value: 'bg-pink-500 text-white' },
                      { name: 'Teal', value: 'bg-teal-500 text-white' },
                      { name: 'Gray', value: 'bg-gray-500 text-white' },
                    ].map((colorOption) => (
                      <button
                        key={colorOption.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: colorOption.value })}
                        className={`px-3 py-2 rounded text-xs font-bold ${colorOption.value} ${
                          formData.color === colorOption.value ? 'ring-2 ring-offset-2 ring-black' : ''
                        }`}
                      >
                        {colorOption.name}
                      </button>
                    ))}
                    {formData.color && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, color: '' })}
                        className="px-3 py-2 rounded text-xs font-bold border-2 border-gray-300 hover:bg-gray-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={handleCloseEventDetail}
          >
            <div
              className="bg-white border-2 sm:border-4 border-red-600 rounded-lg w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold">Appointment Details</h2>
                <button
                  onClick={handleCloseEventDetail}
                  className="text-gray-500 hover:text-gray-700 text-2xl ml-2 min-w-[32px]"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Client</label>
                  {selectedEvent.lead_id ? (
                    <button
                      onClick={() => router.push(`/?leadId=${selectedEvent.lead_id}`)}
                      className="text-lg text-blue-600 hover:text-blue-800 hover:underline font-semibold text-left"
                    >
                      {selectedEvent.lead_first_name && selectedEvent.lead_last_name
                        ? `${selectedEvent.lead_first_name} ${selectedEvent.lead_last_name}`
                        : selectedEvent.title}
                      {' →'}
                    </button>
                  ) : (
                    <p className="text-lg">
                      {selectedEvent.title}
                    </p>
                  )}
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
                  // Look for an explicit address pattern (street number + street name, or starts with "Address:")
                  const description = selectedEvent.description;
                  const addressMatch = description.match(/(?:^|\n)(?:Address:\s*)?(\d+[^,\n]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Parkway|Pkwy)[^,\n]*(?:,\s*[^,\n]+)?(?:,\s*[A-Z]{2}\s*\d{5})?)/i);

                  if (addressMatch) {
                    const address = addressMatch[1].trim();
                    return (
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
                    );
                  }
                  return null;
                })()}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-gray-700">Date & Time</label>
                    {!editingDateTime && (
                      <button
                        onClick={() => {
                          // Format for datetime-local input (YYYY-MM-DDTHH:mm)
                          const formatForInput = (timeStr: string) => {
                            // Parse the time string properly
                            let d: Date;
                            if (timeStr.includes('Z')) {
                              // UTC format
                              d = new Date(timeStr);
                            } else if (timeStr.includes('T') && !timeStr.includes(' ')) {
                              // Already in YYYY-MM-DDTHH:mm format
                              d = new Date(timeStr.replace('T', ' '));
                            } else {
                              // Other formats
                              d = new Date(timeStr);
                            }

                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const hours = String(d.getHours()).padStart(2, '0');
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${minutes}`;
                          };

                          const startFormatted = formatForInput(selectedEvent.start_time);
                          const endFormatted = formatForInput(selectedEvent.end_time);

                          console.log('Start time:', selectedEvent.start_time, '-> formatted:', startFormatted);
                          console.log('End time:', selectedEvent.end_time, '-> formatted:', endFormatted);

                          setEditStartTime(startFormatted);
                          setEditEndTime(endFormatted);
                          setEditingDateTime(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit Time
                      </button>
                    )}
                  </div>

                  {editingDateTime ? (
                    <div className="space-y-3 bg-gray-50 p-3 rounded border-2 border-gray-300">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start Date & Time</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={editStartTime.split('T')[0]}
                            onChange={(e) => {
                              const time = editStartTime.split('T')[1] || '09:00';
                              setEditStartTime(`${e.target.value}T${time}`);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={parseInt(editStartTime.split('T')[1]?.split(':')[0] || '9')}
                            onChange={(e) => {
                              const date = editStartTime.split('T')[0];
                              const minute = editStartTime.split('T')[1]?.split(':')[1] || '00';
                              setEditStartTime(`${date}T${e.target.value.padStart(2, '0')}:${minute}`);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editStartTime.split('T')[1]?.split(':')[1] || '00'}
                            onChange={(e) => {
                              const date = editStartTime.split('T')[0];
                              const hour = editStartTime.split('T')[1]?.split(':')[0] || '09';
                              setEditStartTime(`${date}T${hour}:${e.target.value}`);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="00">:00</option>
                            <option value="15">:15</option>
                            <option value="30">:30</option>
                            <option value="45">:45</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">End Date & Time</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={editEndTime.split('T')[0]}
                            onChange={(e) => {
                              const time = editEndTime.split('T')[1] || '10:00';
                              setEditEndTime(`${e.target.value}T${time}`);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={parseInt(editEndTime.split('T')[1]?.split(':')[0] || '10')}
                            onChange={(e) => {
                              const date = editEndTime.split('T')[0];
                              const minute = editEndTime.split('T')[1]?.split(':')[1] || '00';
                              setEditEndTime(`${date}T${e.target.value.padStart(2, '0')}:${minute}`);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editEndTime.split('T')[1]?.split(':')[1] || '00'}
                            onChange={(e) => {
                              const date = editEndTime.split('T')[0];
                              const hour = editEndTime.split('T')[1]?.split(':')[0] || '10';
                              setEditEndTime(`${date}T${hour}:${e.target.value}`);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="00">:00</option>
                            <option value="15">:15</option>
                            <option value="30">:30</option>
                            <option value="45">:45</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateDateTime}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                        >
                          Save Time
                        </button>
                        <button
                          onClick={() => {
                            setEditingDateTime(false);
                            setEditStartTime('');
                            setEditEndTime('');
                          }}
                          className="flex-1 bg-gray-300 text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <span className="ml-2 text-sm font-semibold text-gray-700">
                          ({(() => {
                            const start = new Date(selectedEvent.start_time);
                            const end = new Date(selectedEvent.end_time);
                            const durationMs = end.getTime() - start.getTime();
                            const durationMinutes = Math.floor(durationMs / 60000);
                            if (durationMinutes < 60) return `${durationMinutes}m`;
                            const hours = Math.floor(durationMinutes / 60);
                            const mins = durationMinutes % 60;
                            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                          })()})
                        </span>
                      </p>
                    </>
                  )}
                </div>

                {selectedEvent.created_by_name && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Set By</label>
                    <p className="text-md text-gray-600">{selectedEvent.created_by_name}</p>
                  </div>
                )}

                {/* Color Picker Section */}
                <div className="border-t-2 border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-gray-700">Appointment Color</label>
                    {!editingColor && (
                      <button
                        onClick={() => {
                          setSelectedColor(selectedEvent.color || '');
                          setEditingColor(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Change Color
                      </button>
                    )}
                  </div>

                  {editingColor ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">Select a color or clear to use automatic status-based colors</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Blue', value: 'bg-blue-500 text-white' },
                          { name: 'Green', value: 'bg-green-500 text-white' },
                          { name: 'Red', value: 'bg-red-500 text-white' },
                          { name: 'Yellow', value: 'bg-yellow-500 text-white' },
                          { name: 'Purple', value: 'bg-purple-500 text-white' },
                          { name: 'Orange', value: 'bg-orange-500 text-white' },
                          { name: 'Pink', value: 'bg-pink-500 text-white' },
                          { name: 'Teal', value: 'bg-teal-500 text-white' },
                          { name: 'Gray', value: 'bg-gray-500 text-white' },
                        ].map((colorOption) => (
                          <button
                            key={colorOption.name}
                            type="button"
                            onClick={() => setSelectedColor(colorOption.value)}
                            className={`px-3 py-2 rounded text-xs font-bold ${colorOption.value} ${
                              selectedColor === colorOption.value ? 'ring-2 ring-offset-2 ring-black' : ''
                            }`}
                          >
                            {colorOption.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleUpdateColor(selectedColor)}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                        >
                          Save Color
                        </button>
                        <button
                          onClick={() => handleUpdateColor('')}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-700"
                        >
                          Clear (Use Auto)
                        </button>
                        <button
                          onClick={() => {
                            setEditingColor(false);
                            setSelectedColor('');
                          }}
                          className="flex-1 bg-gray-300 text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {selectedEvent.color ? (
                        <>
                          <div className={`px-4 py-2 rounded text-sm font-bold ${selectedEvent.color}`}>
                            Custom Color
                          </div>
                          <span className="text-xs text-gray-500">(Using custom color)</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Using automatic status-based color</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Activities Section - Only show if event is linked to a lead */}
                {selectedEvent.lead_id && (
                  <div className="border-t-2 border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-bold text-gray-700">Activity Tracking</label>
                    </div>

                    {/* Quick Outcome Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button
                        onClick={() => handleQuickActivity('appointment', 'completed')}
                        className="bg-green-600 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm font-bold hover:bg-green-700 touch-manipulation"
                      >
                        <span className="hidden sm:inline">✓ Showed</span>
                        <span className="sm:hidden">✓</span>
                      </button>
                      <button
                        onClick={() => handleQuickActivity('appointment', 'no_show')}
                        className="bg-red-600 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm font-bold hover:bg-red-700 touch-manipulation"
                      >
                        <span className="hidden sm:inline">✗ No-Show</span>
                        <span className="sm:hidden">✗</span>
                      </button>
                      <button
                        onClick={() => handleQuickActivity('appointment', 'cancelled')}
                        className="bg-yellow-600 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm font-bold hover:bg-yellow-700 touch-manipulation"
                      >
                        <span className="hidden sm:inline">🔄 Cancelled</span>
                        <span className="sm:hidden">🔄</span>
                      </button>
                    </div>

                    {/* Add Activity Button */}
                    {!showActivityForm && (
                      <button
                        onClick={() => setShowActivityForm(true)}
                        className="w-full bg-black text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-800 mb-3"
                      >
                        + Add Activity
                      </button>
                    )}

                    {/* Activity Form */}
                    {showActivityForm && (
                      <div className="bg-gray-50 p-3 rounded border-2 border-gray-300 mb-3">
                        <form onSubmit={handleCreateActivity}>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">Activity Type</label>
                              <select
                                value={activityFormData.activity_type}
                                onChange={(e) => setActivityFormData({ ...activityFormData, activity_type: e.target.value as any })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="note">Note</option>
                                <option value="appointment">Presentation Made</option>
                                <option value="sale">Policy Sold</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Details</label>
                              <textarea
                                value={activityFormData.activity_detail}
                                onChange={(e) => setActivityFormData({ ...activityFormData, activity_detail: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows={3}
                                placeholder="Enter details..."
                                required
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowActivityForm(false);
                                  setActivityFormData({
                                    activity_type: 'note',
                                    activity_detail: '',
                                    outcome: '',
                                    lead_temperature_after: '',
                                    next_follow_up_date: '',
                                  });
                                }}
                                className="flex-1 bg-gray-300 text-black px-3 py-1 rounded text-sm font-bold hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Policies Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-gray-700">Policies</label>
                        {!showPolicyForm && (
                          <button
                            onClick={() => setShowPolicyForm(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-bold"
                          >
                            + Add Policy
                          </button>
                        )}
                      </div>

                      {showPolicyForm && (
                        <div className="bg-gray-50 p-3 rounded border-2 border-gray-300 mb-3">
                          <form onSubmit={handleCreatePolicy}>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Policy Number</label>
                                <input
                                  type="text"
                                  value={policyFormData.policy_number}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_number: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Policy Type *</label>
                                <input
                                  type="text"
                                  value={policyFormData.policy_type}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_type: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  required
                                  placeholder="e.g., Medicare Supplement, Term Life"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium mb-1">Coverage Amount</label>
                                  <input
                                    type="number"
                                    value={policyFormData.coverage_amount}
                                    onChange={(e) => setPolicyFormData({ ...policyFormData, coverage_amount: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="$"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">Premium</label>
                                  <input
                                    type="number"
                                    value={policyFormData.premium_amount}
                                    onChange={(e) => setPolicyFormData({ ...policyFormData, premium_amount: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="$/month"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Est. Commission Earned</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={policyFormData.commission_amount}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, commission_amount: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="$"
                                />
                                <p className="text-xs text-gray-500 mt-1">Policy counts as a sale. Commission affects revenue total.</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={policyFormData.start_date}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, start_date: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Status</label>
                                <select
                                  value={policyFormData.status}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, status: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="active">Active</option>
                                  <option value="cancelled">Cancelled</option>
                                  <option value="expired">Expired</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Notes</label>
                                <textarea
                                  value={policyFormData.notes}
                                  onChange={(e) => setPolicyFormData({ ...policyFormData, notes: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  rows={2}
                                  placeholder="Additional policy details..."
                                />
                              </div>
                              <div className="flex gap-2 pt-2">
                                <button
                                  type="submit"
                                  className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700"
                                >
                                  {editingPolicy ? 'Update Policy' : 'Save Policy'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPolicyForm(false);
                                    setEditingPolicy(null);
                                    setPolicyFormData({
                                      policy_number: '',
                                      policy_type: '',
                                      coverage_amount: '',
                                      premium_amount: '',
                                      commission_amount: '',
                                      start_date: '',
                                      status: 'pending',
                                      notes: '',
                                    });
                                  }}
                                  className="flex-1 bg-gray-300 text-black px-3 py-1 rounded text-sm font-bold hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {policies.length > 0 && (
                        <div className="space-y-2">
                          {policies.map((policy: any) => (
                            <div key={policy.id} className="bg-white border border-gray-200 rounded p-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-gray-900">{policy.policy_type}</div>
                                  {policy.policy_number && (
                                    <div className="text-xs text-gray-600">#{policy.policy_number}</div>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {policy.coverage_amount && (
                                      <span className="text-xs text-gray-500">Coverage: ${parseFloat(policy.coverage_amount).toLocaleString()}</span>
                                    )}
                                    {policy.premium_amount && (
                                      <span className="text-xs text-gray-500">Premium: ${parseFloat(policy.premium_amount).toLocaleString()}/mo</span>
                                    )}
                                    {policy.commission_amount && (
                                      <span className="text-xs font-bold text-green-600">Commission: ${parseFloat(policy.commission_amount).toLocaleString()}</span>
                                    )}
                                  </div>
                                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                                    policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                    policy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    policy.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {policy.status}
                                  </span>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <button
                                    onClick={() => handleEditPolicy(policy)}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePolicy(policy.id)}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Images Section */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-gray-700">Images</label>
                        <label className={`text-sm font-bold px-3 py-1 rounded cursor-pointer ${
                          uploadingImage ? 'bg-gray-400 text-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          {uploadingImage ? 'Uploading...' : '+ Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {images.map((image: any) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={`/uploads/${image.filename}`}
                                alt={image.original_name}
                                className="w-full h-20 sm:h-24 object-cover rounded border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 active:bg-opacity-50 transition-opacity flex items-center justify-center">
                                <a
                                  href={`/uploads/${image.filename}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white opacity-0 group-hover:opacity-100 active:opacity-100 text-xs font-bold touch-manipulation"
                                >
                                  View
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No images uploaded yet</p>
                      )}
                    </div>

                    {/* Activity History */}
                    {activities.length > 0 && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Activity History</label>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {activities.map((activity: any) => (
                            <div key={activity.id} className="bg-white border border-gray-200 rounded p-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900">
                                      {activity.activity_type === 'call' ? '📞' :
                                       activity.activity_type === 'text' ? '💬' :
                                       activity.activity_type === 'email' ? '📧' :
                                       activity.activity_type === 'appointment' ? '📋' :
                                       activity.activity_type === 'sale' ? '💰' : '📝'}
                                      {' '}
                                      {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                    </span>
                                    {activity.outcome && (
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        activity.outcome === 'answered' || activity.outcome === 'completed' ? 'bg-green-100 text-green-800' :
                                        activity.outcome === 'no_answer' ? 'bg-red-100 text-red-800' :
                                        activity.outcome === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {activity.outcome}
                                      </span>
                                    )}
                                  </div>
                                  {activity.activity_detail && (
                                    <p className="text-xs text-gray-600 mt-1">{activity.activity_detail}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 sm:p-6 pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (confirm('Delete this appointment?')) {
                      handleDelete(selectedEvent.id);
                      setShowEventDetail(false);
                      setSelectedEvent(null);
                    }
                  }}
                  className="w-full sm:flex-1 bg-red-600 text-white px-4 sm:px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors touch-manipulation"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowEventDetail(false);
                    setSelectedEvent(null);
                  }}
                  className="w-full sm:flex-1 bg-gray-300 text-black px-4 sm:px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors touch-manipulation"
                >
                  Close
                </button>
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
                  <th className="p-1 sm:p-3 text-left border-r border-gray-600 text-xs sm:text-base" style={{ width: '60px', minWidth: '60px' }}>Time</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="p-1 sm:p-3 text-center border-r border-gray-600" style={{ minWidth: '100px' }}>
                      <div className="font-bold text-xs sm:text-base">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-xs">{day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(hour => (
                  <tr key={hour} style={{ height: '60px' }}>
                    <td className="p-1 sm:p-2 text-xs sm:text-sm font-medium text-gray-600 border-r border-gray-200 bg-gray-50 align-top">
                      {hour % 12 || 12}:00 {hour >= 12 ? 'PM' : 'AM'}
                    </td>
                    {weekDays.map(day => {
                      const dayEvents = getEventsForDate(day);
                      // Filter events that start in this hour or span across it
                      const hourEvents = dayEvents.filter(event => {
                        const { startMinutes } = getEventPosition(event);
                        const eventHour = Math.floor(startMinutes / 60);
                        return eventHour === hour;
                      });

                      return (
                        <td
                          key={`${day.toISOString()}-${hour}`}
                          className="border-r border-gray-200 cursor-pointer transition-colors relative"
                          style={{ height: '60px', padding: 0 }}
                        >
                          {/* Click zones for 15-minute increments */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1/4 hover:bg-blue-100 hover:bg-opacity-30"
                            onClick={() => handleTimeSlotClick(day, hour, 0)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(day, hour, 0, e)}
                          ></div>
                          <div
                            className="absolute top-1/4 left-0 right-0 h-1/4 hover:bg-blue-100 hover:bg-opacity-30"
                            onClick={() => handleTimeSlotClick(day, hour, 15)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(day, hour, 15, e)}
                          ></div>
                          <div
                            className="absolute top-1/2 left-0 right-0 h-1/4 hover:bg-blue-100 hover:bg-opacity-30"
                            onClick={() => handleTimeSlotClick(day, hour, 30)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(day, hour, 30, e)}
                          ></div>
                          <div
                            className="absolute top-3/4 left-0 right-0 h-1/4 hover:bg-blue-100 hover:bg-opacity-30"
                            onClick={() => handleTimeSlotClick(day, hour, 45)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(day, hour, 45, e)}
                          ></div>

                          {/* Render events with calculated positions */}
                          {hourEvents.map(event => {
                            const { topPosition, height, durationMinutes } = getEventPosition(event);
                            const offsetInHour = topPosition - (hour * 60);
                            const topPercent = (offsetInHour / 60) * 100;
                            const heightPercent = (height / 60) * 100;

                            // Determine background color - use custom color if set, otherwise use automatic color logic
                            let bgColorClass = '';
                            if (event.color) {
                              // Use custom color
                              bgColorClass = event.color;
                            } else {
                              // Automatic color logic based on appointment status
                              if (event.appointment_outcome === 'no_answer' || event.appointment_detail?.toLowerCase().includes('cancelled')) {
                                bgColorClass = 'bg-purple-500 text-white';
                              } else if (event.event_type === 'appointment' && event.active_policies && event.active_policies > 0) {
                                bgColorClass = 'bg-green-400 text-white';
                              } else if (event.event_type === 'appointment' && event.pending_policies && event.pending_policies > 0) {
                                bgColorClass = 'bg-green-700 text-white';
                              } else if (event.event_type === 'appointment' && event.lead_temperature === 'hot') {
                                bgColorClass = 'bg-orange-600 text-white';
                              } else if (event.event_type === 'appointment' && event.lead_temperature === 'warm') {
                                bgColorClass = 'bg-orange-400 text-white';
                              } else if (event.event_type === 'appointment' && !event.appointment_outcome) {
                                bgColorClass = 'bg-blue-500 text-white';
                              } else if (event.event_type === 'appointment') {
                                bgColorClass = 'bg-green-500 text-white';
                              } else if (event.event_type === 'meeting') {
                                bgColorClass = 'bg-blue-500 text-white';
                              } else if (event.event_type === 'call') {
                                bgColorClass = 'bg-yellow-500 text-white';
                              } else if (event.event_type === 'personal') {
                                bgColorClass = 'bg-purple-500 text-white';
                              } else {
                                bgColorClass = 'bg-gray-500 text-white';
                              }
                            }

                            return (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => handleDragStart(event, e)}
                              className={`absolute left-1 right-1 px-2 py-1 rounded text-xs font-bold group ${bgColorClass} ${draggedEvent?.id === event.id ? 'opacity-50' : ''} cursor-move`}
                              style={{
                                top: `calc(${topPercent}% + 1px)`,
                                height: `calc(${heightPercent}% - 2px)`,
                                minHeight: '18px',
                                zIndex: 10
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setShowEventDetail(true);
                              }}
                            >
                              <div className="overflow-hidden h-full flex flex-col justify-center">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="font-bold truncate leading-tight flex-1">{event.title}</div>
                                  <div className="text-xs opacity-90 font-bold whitespace-nowrap">
                                    {formatDuration(durationMinutes)}
                                  </div>
                                </div>
                                {event.lead_first_name && heightPercent > 20 && (
                                  <div className="text-xs opacity-90 truncate leading-tight">
                                    {event.lead_first_name} {event.lead_last_name}
                                  </div>
                                )}
                                {heightPercent > 30 && (
                                  <div className="text-xs opacity-75">
                                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this appointment?')) {
                                    handleDelete(event.id);
                                  }
                                }}
                                className="hidden sm:block absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded px-1 text-xs transition-opacity"
                                title="Delete appointment"
                              >
                                ✕
                              </button>
                            </div>
                            );
                          })}
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
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">New Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className="text-sm">Warm Lead</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-600 rounded"></div>
            <span className="text-sm">Hot Lead</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm">Needs Rescheduling</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-700 rounded"></div>
            <span className="text-sm">Pending Policy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-sm">Active Client</span>
          </div>
        </div>
      </div>
    </div>
  );
}
