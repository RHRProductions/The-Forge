export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'agent' | 'setter';
  agent_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2?: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  marital_status?: string;
  occupation?: string;
  income?: string;
  household_size?: number;
  status: LeadStatus;
  contact_method?: ContactMethod;
  lead_type: LeadType;
  cost_per_lead: number;
  sales_amount: number;
  notes?: string;
  timestamped_notes?: TimestampedNote[];
  images?: LeadImage[];
  policies?: LeadPolicy[];
  activities?: LeadActivity[];
  source: string;
  lead_score?: number;
  lead_temperature?: LeadTemperature;
  last_contact_date?: string;
  next_follow_up?: string;
  contact_attempt_count?: number;
  total_dials?: number;
  owner_id?: number;
  worked_by_id?: number;
  wrong_info?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TimestampedNote {
  id?: number;
  lead_id: number;
  note: string;
  created_at: string;
}

export interface LeadImage {
  id?: number;
  lead_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface LeadPolicy {
  id?: number;
  lead_id: number;
  policy_number?: string;
  policy_type: string;
  coverage_amount?: number;
  premium_amount?: number;
  commission_amount?: number;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'not_approved' | 'declined' | 'lapsed';
  notes?: string;
  created_at: string;
}

export interface LeadActivity {
  id?: number;
  lead_id: number;
  activity_type: ActivityType;
  activity_detail: string;
  outcome?: ActivityOutcome;
  lead_temperature_after?: LeadTemperature;
  next_follow_up_date?: string;
  contact_attempt_number?: number;
  dial_count?: number;
  total_dials_at_time?: number;
  created_by_user_id?: number;
  created_at: string;
}

export type ActivityType =
  | 'call'
  | 'text'
  | 'email'
  | 'note'
  | 'status_change'
  | 'appointment'
  | 'sale';

export type ActivityOutcome =
  | 'answered'
  | 'no_answer'
  | 'scheduled'
  | 'disconnected';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'no_answer'
  | 'follow_up_needed'
  | 'not_set'
  | 'appointment_set'
  | 'pending'
  | 'issued'
  | 'qualified'
  | 'not_qualified'
  | 'refund_needed'
  | 'closed_won'
  | 'closed_lost'
  | 'closed'
  | 'tol';

export type ContactMethod = 
  | 'phone'
  | 'text'
  | 'email';

export type LeadType =
  | 't65'
  | 't65_wl'
  | 'life'
  | 'client'
  | 'other';

export type LeadTemperature =
  | 'hot'
  | 'warm'
  | 'cold';