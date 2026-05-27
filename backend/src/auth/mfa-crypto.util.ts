import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secretMaterial: string): Buffer {
  return createHash('sha256').update(secretMaterial, 'utf8').digest();
}

export function encryptMfaSecret(
  plain: string,
  secretMaterial: string,
): string {
  const key = deriveKey(secretMaterial);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptMfaSecret(
  encB64: string,
  secretMaterial: string,
): string {
  const key = deriveKey(secretMaterial);
  const buf = Buffer.from(encB64, 'base64url');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}
