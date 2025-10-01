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
  source: string;
  lead_score?: number;
  last_contact_date?: string;
  next_follow_up?: string;
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
  start_date?: string;
  end_date?: string;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  notes?: string;
  created_at: string;
}

export type LeadStatus = 
  | 'new'
  | 'no_answer'
  | 'follow_up_needed'
  | 'not_set'
  | 'appointment_set'
  | 'refund_needed'
  | 'closed';

export type ContactMethod = 
  | 'phone'
  | 'text'
  | 'email';

export type LeadType = 
  | 't65'
  | 'life'
  | 'client'
  | 'other';