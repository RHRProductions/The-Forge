/**
 * Input Sanitization - Prevents XSS attacks
 * Sanitizes all user input to prevent malicious HTML/JavaScript injection
 */

interface SanitizationOptions {
  maxLength?: number;
  allowedTags?: string[];
  stripHtml?: boolean;
}

/**
 * Sanitize text input by removing HTML tags and limiting length
 */
export function sanitizeText(input: string | null | undefined, options: SanitizationOptions = {}): string {
  if (!input) return '';
  
  const {
    maxLength = 1000,
    stripHtml = true,
  } = options;

  let sanitized = String(input).trim();

  // Strip HTML tags if enabled
  if (stripHtml) {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities to prevent double encoding
    sanitized = sanitized
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');
    
    // Remove any remaining script-like content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const sanitized = String(email).trim().toLowerCase();
  
  // Basic email validation pattern
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  
  if (!emailPattern.test(sanitized)) {
    // If it doesn't match email pattern, strip special characters
    return sanitized.replace(/[<>\"']/g, '').substring(0, 255);
  }
  
  return sanitized.substring(0, 255);
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Keep only digits, spaces, parentheses, hyphens, and plus sign
  const sanitized = String(phone).replace(/[^0-9\s()\-+]/g, '').trim();
  
  return sanitized.substring(0, 20);
}

/**
 * Sanitize notes/long text (allows some formatting but removes dangerous content)
 */
export function sanitizeNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  
  let sanitized = String(notes).trim();
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  
  // Limit length (notes can be longer)
  return sanitized.substring(0, 10000);
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'number' ? input : parseFloat(String(input).replace(/[^0-9.-]/g, ''));
  
  return isNaN(num) ? null : num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'number' ? Math.floor(input) : parseInt(String(input).replace(/[^0-9-]/g, ''));
  
  return isNaN(num) ? null : num;
}

/**
 * Sanitize lead object - applies appropriate sanitization to each field
 * Only includes fields that were actually provided in the input
 */
export function sanitizeLead(lead: any): any {
  const result: any = {};

  // Only sanitize and include fields that exist in the input
  if (lead.first_name !== undefined) result.first_name = sanitizeText(lead.first_name, { maxLength: 100 });
  if (lead.last_name !== undefined) result.last_name = sanitizeText(lead.last_name, { maxLength: 100 });
  if (lead.email !== undefined) result.email = sanitizeEmail(lead.email);
  if (lead.phone !== undefined) result.phone = sanitizePhone(lead.phone);
  if (lead.phone_2 !== undefined) result.phone_2 = sanitizePhone(lead.phone_2);
  if (lead.company !== undefined) result.company = sanitizeText(lead.company, { maxLength: 200 });
  if (lead.address !== undefined) result.address = sanitizeText(lead.address, { maxLength: 300 });
  if (lead.city !== undefined) result.city = sanitizeText(lead.city, { maxLength: 100 });
  if (lead.state !== undefined) result.state = sanitizeText(lead.state, { maxLength: 50 });
  if (lead.zip_code !== undefined) result.zip_code = sanitizeText(lead.zip_code, { maxLength: 20 });
  if (lead.date_of_birth !== undefined) result.date_of_birth = sanitizeText(lead.date_of_birth, { maxLength: 20 });
  if (lead.age !== undefined) result.age = sanitizeInteger(lead.age);
  if (lead.gender !== undefined) result.gender = sanitizeText(lead.gender, { maxLength: 20 });
  if (lead.marital_status !== undefined) result.marital_status = sanitizeText(lead.marital_status, { maxLength: 50 });
  if (lead.occupation !== undefined) result.occupation = sanitizeText(lead.occupation, { maxLength: 200 });
  if (lead.income !== undefined) result.income = sanitizeText(lead.income, { maxLength: 50 });
  if (lead.household_size !== undefined) result.household_size = sanitizeInteger(lead.household_size);
  if (lead.status !== undefined) result.status = sanitizeText(lead.status, { maxLength: 50 });
  if (lead.contact_method !== undefined) result.contact_method = sanitizeText(lead.contact_method, { maxLength: 50 });
  if (lead.lead_type !== undefined) result.lead_type = sanitizeText(lead.lead_type, { maxLength: 50 });
  if (lead.cost_per_lead !== undefined) result.cost_per_lead = sanitizeNumber(lead.cost_per_lead);
  if (lead.sales_amount !== undefined) result.sales_amount = sanitizeNumber(lead.sales_amount);
  if (lead.notes !== undefined) result.notes = sanitizeNotes(lead.notes);
  if (lead.source !== undefined) result.source = sanitizeText(lead.source, { maxLength: 200 });
  if (lead.lead_score !== undefined) result.lead_score = sanitizeInteger(lead.lead_score);
  if (lead.lead_temperature !== undefined) result.lead_temperature = sanitizeText(lead.lead_temperature, { maxLength: 20 });
  if (lead.last_contact_date !== undefined) result.last_contact_date = sanitizeText(lead.last_contact_date, { maxLength: 50 });
  if (lead.next_follow_up !== undefined) result.next_follow_up = sanitizeText(lead.next_follow_up, { maxLength: 50 });
  // Boolean fields - pass through as-is (handled by API)
  if (lead.wrong_info !== undefined) result.wrong_info = lead.wrong_info;
  if (lead.call_screening !== undefined) result.call_screening = lead.call_screening;

  return result;
}

/**
 * Sanitize user object
 */
export function sanitizeUser(user: any): any {
  return {
    name: sanitizeText(user.name, { maxLength: 200 }),
    email: sanitizeEmail(user.email),
    role: sanitizeText(user.role, { maxLength: 20 }),
    agent_id: sanitizeInteger(user.agent_id),
  };
}

/**
 * Sanitize note/activity text
 */
export function sanitizeActivity(activity: any): any {
  return {
    type: sanitizeText(activity.type, { maxLength: 50 }),
    description: sanitizeNotes(activity.description),
    notes: sanitizeNotes(activity.notes),
  };
}
