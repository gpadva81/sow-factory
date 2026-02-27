/**
 * Encrypted runtime config store.
 *
 * Values are stored in the AppConfig table encrypted with AES-256-GCM.
 * The encryption key is read from ENCRYPTION_KEY (64-char hex = 32 bytes).
 *
 * If ENCRYPTION_KEY is absent a key is derived from NEXTAUTH_SECRET so
 * local dev works without extra setup, but a warning is logged.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && hex.length === 64) {
    return Buffer.from(hex, 'hex');
  }
  // Fallback: derive from NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    logger.warn('ENCRYPTION_KEY not set – deriving from NEXTAUTH_SECRET. Set ENCRYPTION_KEY in production.');
    return createHash('sha256').update(secret).digest();
  }
  throw new Error('Set ENCRYPTION_KEY (64-char hex) or NEXTAUTH_SECRET in environment variables.');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: 12 bytes IV | 16 bytes auth tag | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function getConfigValue(key: string): Promise<string | null> {
  const record = await prisma.appConfig.findUnique({ where: { key } });
  if (!record) return null;
  try {
    return decrypt(record.encrypted);
  } catch {
    logger.error({ key }, 'Failed to decrypt config value');
    return null;
  }
}

export async function setConfigValue(
  key: string,
  value: string,
  updatedById?: string,
): Promise<void> {
  const encrypted = encrypt(value);
  await prisma.appConfig.upsert({
    where: { key },
    create: { key, encrypted, updatedById: updatedById ?? null },
    update: { encrypted, updatedById: updatedById ?? null },
  });
}

export async function deleteConfigValue(key: string): Promise<void> {
  await prisma.appConfig.deleteMany({ where: { key } });
}

// ─── Bulk helpers ──────────────────────────────────────────────────────────────

/** Returns true/false for each integration block – never leaks actual values. */
export async function getConfigStatus(): Promise<{
  sharepoint: boolean;
  openai: boolean;
  overallMock: boolean;
}> {
  const [tenantId, apiKey] = await Promise.all([
    getConfigValue('azure.tenantId'),
    getConfigValue('openai.apiKey'),
  ]);

  const envMock = process.env.MOCK_SHAREPOINT === 'true';
  const sharepoint = !!(tenantId);
  const openai = !!(apiKey || process.env.OPENAI_API_KEY);

  return {
    sharepoint,
    openai,
    overallMock: envMock || !sharepoint,
  };
}

/** Convenience: get all graph credentials, DB takes priority over env. */
export async function getGraphCredentials(): Promise<{
  tenantId: string | null;
  clientId: string | null;
  clientSecret: string | null;
}> {
  const [tenantId, clientId, clientSecret] = await Promise.all([
    getConfigValue('azure.tenantId'),
    getConfigValue('azure.clientId'),
    getConfigValue('azure.clientSecret'),
  ]);
  return {
    tenantId: tenantId ?? process.env.AZURE_TENANT_ID ?? null,
    clientId: clientId ?? process.env.AZURE_CLIENT_ID ?? null,
    clientSecret: clientSecret ?? process.env.AZURE_CLIENT_SECRET ?? null,
  };
}

/** Convenience: get OpenAI API key, DB takes priority over env. */
export async function getOpenAIKey(): Promise<string | null> {
  const dbKey = await getConfigValue('openai.apiKey');
  return dbKey ?? process.env.OPENAI_API_KEY ?? null;
}

export async function getOpenAIModel(): Promise<string> {
  const dbModel = await getConfigValue('openai.model');
  return dbModel ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
}
