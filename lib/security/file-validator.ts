/**
 * File Upload Validation - Enhanced security for file uploads
 * Validates actual file content, not just MIME types and extensions
 */

/**
 * File signatures (magic numbers) for allowed image formats
 * These are the first few bytes of each file type
 */
const FILE_SIGNATURES: { [key: string]: number[][] } = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // RIFF????WEBP (null = any byte)
  ],
};

/**
 * Check if file signature matches expected type
 */
function checkFileSignature(buffer: Buffer, signatures: number[][]): boolean {
  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      // null in signature means "any byte" (for RIFF file size bytes)
      if (signature[i] !== null && buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Validate uploaded image file
 */
export async function validateImageFile(file: File): Promise<{
  valid: boolean;
  error?: string;
  detectedType?: string;
}> {
  try {
    // 1. Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // 2. Check minimum file size (avoid empty or corrupted files)
    const MIN_SIZE = 100; // 100 bytes minimum
    if (file.size < MIN_SIZE) {
      return { valid: false, error: 'File is too small or corrupted' };
    }

    // 3. Check MIME type (first line of defense)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      return { valid: false, error: `Invalid MIME type: ${file.type}. Allowed: JPG, PNG, GIF, WEBP` };
    }

    // 4. Validate file signature (magic number)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Read first 12 bytes for signature checking
    const header = buffer.slice(0, 12);

    // Check if actual file content matches claimed MIME type
    let signatureMatches = false;
    let detectedType = '';

    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      if (checkFileSignature(header, signatures)) {
        signatureMatches = true;
        detectedType = mimeType;
        break;
      }
    }

    if (!signatureMatches) {
      return {
        valid: false,
        error: 'File content does not match claimed type. Possible file corruption or spoofing.',
      };
    }

    // 5. Verify claimed MIME type matches detected type
    if (file.type !== detectedType) {
      return {
        valid: false,
        error: `File type mismatch. Claimed: ${file.type}, Detected: ${detectedType}`,
      };
    }

    // 6. Check for executable content (basic check)
    const fileContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    
    // Look for common executable signatures/patterns
    const dangerousPatterns = [
      '<?php',           // PHP code
      '<%',              // ASP/JSP code
      '<script',         // JavaScript
      'eval(',           // JavaScript eval
      'exec(',           // Command execution
      'system(',         // System calls
      'MZ',              // Windows executable
      '\x7fELF',         // Linux executable
    ];

    for (const pattern of dangerousPatterns) {
      if (fileContent.includes(pattern)) {
        return {
          valid: false,
          error: 'File contains potentially dangerous content',
        };
      }
    }

    return {
      valid: true,
      detectedType,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Validate CSV file upload
 */
export async function validateCSVFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // 1. Check file size (max 50MB for CSV)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'CSV file size exceeds 50MB limit' };
    }

    // 2. Check MIME type
    const allowedMimeTypes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return { valid: false, error: `Invalid MIME type: ${file.type}. Expected CSV file.` };
    }

    // 3. Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return { valid: false, error: 'File must have .csv extension' };
    }

    // 4. Read first few bytes and check for text content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // CSV should be plain text - check first 1KB
    const sample = buffer.slice(0, Math.min(1024, buffer.length));
    
    // Check for binary content (most bytes should be printable ASCII)
    let nonPrintableCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Allow printable ASCII (32-126), newlines (10,13), tabs (9)
      if (!(byte >= 32 && byte <= 126) && byte !== 10 && byte !== 13 && byte !== 9) {
        nonPrintableCount++;
      }
    }

    // If more than 10% non-printable, probably not a text file
    if (nonPrintableCount / sample.length > 0.1) {
      return { valid: false, error: 'File appears to be binary, not CSV text' };
    }

    // 5. Check for dangerous content
    const textSample = sample.toString('utf8');
    const dangerousPatterns = [
      '<?php',
      '<%',
      '<script',
      'javascript:',
    ];

    for (const pattern of dangerousPatterns) {
      if (textSample.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          valid: false,
          error: 'CSV contains potentially dangerous content',
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}
