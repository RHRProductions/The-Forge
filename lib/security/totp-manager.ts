import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Generates a new TOTP secret for a user
 */
export function generateSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generates a QR code URI for authenticator apps
 */
export async function generateQRCode(secret: string, email: string): Promise<string> {
  const totp = new OTPAuth.TOTP({
    issuer: 'The Forge CRM',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const uri = totp.toString();

  // Generate QR code as data URL
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(uri);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verifies a TOTP token against a secret
 * @param secret The user's TOTP secret (base32 encoded)
 * @param token The 6-digit token from authenticator app
 * @returns true if valid, false otherwise
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'The Forge CRM',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Allow 1 period of drift (30 seconds before/after) for clock skew
    const delta = totp.validate({ token, window: 1 });

    return delta !== null;
  } catch (error) {
    console.error('Error verifying TOTP token:', error);
    return false;
  }
}

/**
 * Generates 8 random backup codes
 * Each code is 8 alphanumeric characters
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < 8; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXX-XXXX for readability
    code = code.slice(0, 4) + '-' + code.slice(4);
    codes.push(code);
  }

  return codes;
}

/**
 * Hashes backup codes for secure storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashedCodes: string[] = [];

  for (const code of codes) {
    const hash = await bcrypt.hash(code, 10);
    hashedCodes.push(hash);
  }

  return hashedCodes;
}

/**
 * Validates a backup code and returns the index if valid
 * @param hashedCodes Array of hashed backup codes from database
 * @param inputCode The code entered by the user
 * @returns Index of matching code, or -1 if no match
 */
export async function validateBackupCode(hashedCodes: string[], inputCode: string): Promise<number> {
  // Normalize input (remove spaces, convert to uppercase)
  const normalizedInput = inputCode.replace(/\s/g, '').toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(normalizedInput, hashedCodes[i]);
    if (isValid) {
      return i;
    }
  }

  return -1;
}

/**
 * Encrypts the TOTP secret for database storage
 */
export function encryptSecret(secret: string): string {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from encryption key and salt
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the secret
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);

  // Get auth tag
  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted and encode as base64
  const result = Buffer.concat([salt, iv, tag, encrypted]).toString('base64');

  return result;
}

/**
 * Decrypts the TOTP secret from database storage
 */
export function decryptSecret(encryptedSecret: string): string {
  // Decode from base64
  const buffer = Buffer.from(encryptedSecret, 'base64');

  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(TAG_POSITION, TAG_POSITION + TAG_LENGTH);
  const encrypted = buffer.subarray(ENCRYPTED_POSITION);

  // Derive key from encryption key and salt
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}
