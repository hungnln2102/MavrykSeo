import * as crypto from 'crypto';

function getEncryptionKeyMaterial(secretKey?: string): string {
  const rawKey = secretKey || process.env.GSC_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('GSC_TOKEN_ENCRYPTION_KEY or ENCRYPTION_KEY must be configured before encrypting credentials.');
  }

  return rawKey;
}

export function validateEncryptionConfiguration(): void {
  getEncryptionKeyMaterial();
}

function getEncryptionKey(secretKey?: string): Buffer {
  const rawKey = getEncryptionKeyMaterial(secretKey);
  // If it's a 64-character hex string representing 32 bytes, use it directly
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  // Otherwise, hash the key string to derive a secure 32-byte key
  return crypto.createHash('sha256').update(rawKey).digest();
}
export function encryptToken(text: string, secretKeyHex?: string): string {
  const key = getEncryptionKey(secretKeyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    content: encrypted,
    tag: authTag,
  });
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as JSON or `iv:authTag:encryptedContent`.
 */
export function decryptToken(encryptedText: string, secretKeyHex?: string): string {
  const key = getEncryptionKey(secretKeyHex);

  let ivStr: string;
  let authTagStr: string;
  let contentStr: string;

  if (encryptedText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(encryptedText);
      ivStr = parsed.iv;
      authTagStr = parsed.tag;
      contentStr = parsed.content;
      if (!ivStr || !authTagStr || !contentStr) {
        throw new Error('Missing JSON cipher properties');
      }
    } catch (e: any) {
      throw new Error(`Invalid JSON cipher format: ${e.message}`);
    }
  } else {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    ivStr = parts[0];
    authTagStr = parts[1];
    contentStr = parts[2];
  }

  const iv = Buffer.from(ivStr, 'hex');
  const authTag = Buffer.from(authTagStr, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(contentStr, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
