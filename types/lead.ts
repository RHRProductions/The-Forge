export interface Lead {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
  status: LeadStatus;
  contact_method?: ContactMethod;
  cost_per_lead: number;
  sales_amount: number;
  notes?: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'no_answer'
  | 'follow_up_needed'
  | 'qualified'
  | 'not_qualified'
  | 'closed_won'
  | 'closed_lost';

export type ContactMethod = 
  | 'phone'
  | 'text'
  | 'email'
  | 'livestream'
  | 'video_comment'
  | 'seminar_event'
  | 'in_person'
  | 'social_media';