/**
 * Error Message Sanitization - Prevents information leakage
 * Ensures production errors don't expose sensitive system information
 */

interface SanitizedError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /\/home\/[^\/\s]+/gi,                    // File paths
  /\/var\/[^\/\s]+/gi,
  /\/usr\/[^\/\s]+/gi,
  /C:\\[^\\s]+/gi,
  /\/Users\/[^\/\s]+/gi,
  /ENOENT.*'\/[^']+'/gi,                   // File not found errors with paths
  /sqlite3.*database.*\/[^']+/gi,          // SQLite file paths
  /password/gi,                            // Password mentions
  /secret/gi,                              // Secret key mentions
  /token/gi,                               // Token mentions (except in generic context)
  /api[_\s]key/gi,                         // API key mentions
  /connection.*refused.*:\d+/gi,           // Connection details
  /ECONNREFUSED.*:\d+/gi,
  /at\s+\w+\s+\(\/[^)]+\)/gi,             // Stack trace lines
  /Error:\s+SQLITE_[A-Z_]+/gi,            // SQLite error codes with details
];

/**
 * Safe, generic error messages for production
 */
const GENERIC_ERRORS: { [key: string]: string } = {
  'ENOENT': 'Resource not found',
  'EACCES': 'Access denied',
  'ECONNREFUSED': 'Service unavailable',
  'ETIMEDOUT': 'Request timeout',
  'SQLITE_CONSTRAINT': 'Data validation error',
  'SQLITE_ERROR': 'Database error',
  'SQLITE_BUSY': 'System busy, please try again',
  'SQLITE_LOCKED': 'Resource locked, please try again',
};

/**
 * Sanitize error message for safe display to users
 */
export function sanitizeError(error: any, includeDetails: boolean = process.env.NODE_ENV !== 'production'): SanitizedError {
  // In development, return full error details
  if (includeDetails) {
    return {
      message: error?.message || 'An error occurred',
      code: error?.code,
      status: error?.status || error?.statusCode || 500,
    };
  }

  // Production: sanitize error message
  const errorMessage = error?.message || 'An error occurred';
  const errorCode = error?.code;

  // Check if we have a generic message for this error code
  if (errorCode && GENERIC_ERRORS[errorCode]) {
    return {
      message: GENERIC_ERRORS[errorCode],
      status: error?.status || error?.statusCode || 500,
    };
  }

  // Remove sensitive information from error message
  let sanitized = errorMessage;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // If message contains stack trace or technical details, replace with generic message
  if (sanitized.includes('at ') || sanitized.includes('Error:')) {
    sanitized = 'An unexpected error occurred. Please try again.';
  }

  // Truncate very long error messages
  if (sanitized.length > 200) {
    sanitized = 'An error occurred while processing your request.';
  }

  return {
    message: sanitized,
    status: error?.status || error?.statusCode || 500,
  };
}

/**
 * Log error with full details (for server-side logging)
 * while returning sanitized version to client
 */
export function handleError(error: any, context?: string): SanitizedError {
  // Log full error server-side
  console.error(`[ERROR]${context ? ` ${context}:` : ''}`, {
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
    name: error?.name,
  });

  // Return sanitized error for client
  return sanitizeError(error);
}

/**
 * Create safe error response for API endpoints
 */
export function createErrorResponse(error: any, context?: string): {
  error: string;
  code?: string;
} {
  const sanitized = handleError(error, context);
  
  return {
    error: sanitized.message,
    ...(sanitized.code && { code: sanitized.code }),
  };
}
