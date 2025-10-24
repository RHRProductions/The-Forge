import { Lead } from '../../types/lead';

export interface PersonalizationData {
  first_name: string;
  last_name: string;
  age?: number;
  city?: string;
  state?: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  booking_link: string;
  livestream_link: string;
  unsubscribe_link: string;
  company_name?: string;
  company_address?: string;
}

/**
 * Replaces all personalization variables in email content
 * Variables format: {variable_name}
 */
export function personalizeContent(
  template: string,
  data: PersonalizationData
): string {
  let personalized = template;

  // Replace all variables
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    personalized = personalized.replace(regex, String(value || ''));
  });

  // Handle conditional age-based messaging
  // Example: {if_under_65}You're approaching Medicare age{/if_under_65}
  if (data.age) {
    personalized = handleConditionalContent(personalized, data.age);
  }

  return personalized;
}

/**
 * Handles conditional content based on age
 */
function handleConditionalContent(content: string, age: number): string {
  let result = content;

  // {if_under_65}...{/if_under_65}
  const under65Regex = /\{if_under_65\}(.*?)\{\/if_under_65\}/gs;
  if (age < 65) {
    result = result.replace(under65Regex, '$1');
  } else {
    result = result.replace(under65Regex, '');
  }

  // {if_65_or_over}...{/if_65_or_over}
  const over65Regex = /\{if_65_or_over\}(.*?)\{\/if_65_or_over\}/gs;
  if (age >= 65) {
    result = result.replace(over65Regex, '$1');
  } else {
    result = result.replace(over65Regex, '');
  }

  // {if_turning_65}...{/if_turning_65} - within 6 months of turning 65
  const turning65Regex = /\{if_turning_65\}(.*?)\{\/if_turning_65\}/gs;
  if (age === 64) {
    result = result.replace(turning65Regex, '$1');
  } else {
    result = result.replace(turning65Regex, '');
  }

  return result;
}

/**
 * Build personalization data from lead and agent info
 */
export function buildPersonalizationData(
  lead: Lead,
  agentInfo: {
    name: string;
    phone?: string;
    email: string;
  },
  links: {
    bookingLink: string;
    livestreamLink: string;
    unsubscribeLink: string;
  },
  companyInfo?: {
    name?: string;
    address?: string;
  }
): PersonalizationData {
  return {
    first_name: lead.first_name || 'there',
    last_name: lead.last_name || '',
    age: lead.age,
    city: lead.city || 'your area',
    state: lead.state || 'Colorado',
    agent_name: agentInfo.name,
    agent_phone: agentInfo.phone || '',
    agent_email: agentInfo.email,
    booking_link: links.bookingLink,
    livestream_link: links.livestreamLink,
    unsubscribe_link: links.unsubscribeLink,
    company_name: companyInfo?.name || 'Right Hand Retirement',
    company_address: companyInfo?.address || '13034 E 14th Ave, Aurora, CO 80011'
  };
}

/**
 * Generate booking link for a specific lead
 */
export function generateBookingLink(leadId: number, baseUrl: string): string {
  return `${baseUrl}/book?lead=${leadId}`;
}

/**
 * Generate livestream registration link for a specific lead and seminar
 */
export function generateLivestreamLink(
  leadId: number,
  seminarId: number,
  baseUrl: string
): string {
  return `${baseUrl}/livestream/register?seminar=${seminarId}&lead=${leadId}`;
}

/**
 * Generate unsubscribe link for a specific email
 */
export function generateUnsubscribeLink(
  leadEmail: string,
  baseUrl: string
): string {
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(leadEmail)}`;
}

/**
 * Extract plain text from HTML (for email clients that don't support HTML)
 */
export function htmlToPlainText(html: string): string {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Convert links to plain text with URL
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}
