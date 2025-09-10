/**
 * Formats a phone number string to include dashes for better readability
 * Supports various input formats and normalizes to XXX-XXX-XXXX format
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle different lengths
  if (digits.length === 10) {
    // Format as XXX-XXX-XXXX
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // Handle numbers starting with 1 (US country code)
    const withoutCountryCode = digits.slice(1);
    return `${withoutCountryCode.slice(0, 3)}-${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
  } else if (digits.length >= 7) {
    // For other lengths, try to format as best as possible
    if (digits.length === 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }
  
  // If we can't format it properly, return the original
  return phoneNumber;
}

/**
 * Formats a name to have proper capitalization (first letter uppercase, rest lowercase)
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats city/state names with proper capitalization
 */
export function formatLocation(location: string): string {
  if (!location) return '';
  
  return location
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a date string to YYYY-MM-DD format for HTML date inputs
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format to YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

/**
 * Calculates age from a date of birth string (handles various formats)
 */
export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  
  try {
    let dob: Date;
    
    // Try to parse various date formats
    if (dateOfBirth.includes('/')) {
      // Handle MM/DD/YYYY or M/D/YYYY format
      const parts = dateOfBirth.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1; // Month is 0-indexed
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        dob = new Date(year, month, day);
      } else {
        dob = new Date(dateOfBirth);
      }
    } else {
      // Handle YYYY-MM-DD or other formats
      dob = new Date(dateOfBirth);
    }
    
    if (isNaN(dob.getTime())) return 0;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  } catch (error) {
    return 0;
  }
}