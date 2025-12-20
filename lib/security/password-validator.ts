/**
 * Password Security Validation
 * Enforces strong password requirements to prevent brute force attacks
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS via bcrypt)
  if (password.length > 72) {
    errors.push('Password must be less than 72 characters');
  }

  // Require uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Require lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Require number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Require special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const PASSWORD_REQUIREMENTS = [
  'At least 8 characters long',
  'Contains uppercase letter (A-Z)',
  'Contains lowercase letter (a-z)',
  'Contains number (0-9)',
  'Contains special character (!@#$%^&* etc.)',
];
