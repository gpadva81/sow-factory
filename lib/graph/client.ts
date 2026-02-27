import { ClientSecretCredential } from '@azure/identity';
import { getGraphCredentials } from '@/lib/config/store';
import { logger } from '@/lib/logger';

// Short-lived cache so we don't hit the DB on every Graph call.
// Invalidated automatically after TTL or when credentials are saved.
let _credentialCache: {
  credential: ClientSecretCredential;
  tenantId: string;
  clientId: string;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateCredentialCache(): void {
  _credentialCache = null;
}

async function getCredential(): Promise<ClientSecretCredential> {
  const now = Date.now();

  if (_credentialCache && now < _credentialCache.expiresAt) {
    return _credentialCache.credential;
  }

  const { tenantId, clientId, clientSecret } = await getGraphCredentials();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Azure credentials are not configured. ' +
        'Go to Settings to add your Azure Tenant ID, Client ID, and Client Secret.',
    );
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  _credentialCache = { credential, tenantId, clientId, expiresAt: now + CACHE_TTL_MS };

  return credential;
}

async function getAccessToken(): Promise<string> {
  const credential = await getCredential();
  const token = await credential.getToken('https://graph.microsoft.com/.default');
  if (!token?.token) throw new Error('Failed to acquire Microsoft Graph access token');
  return token.token;
}

export async function graphRequest<T>(
  path: string,
  options: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0${path}`;

  logger.debug({ path, method: options.method ?? 'GET' }, 'Graph API request');

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ path, status: response.status, body }, 'Graph API error');
    throw new Error(`Graph API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function graphGetRaw(path: string): Promise<Response> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0${path}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph API ${response.status}: ${body}`);
  }

  return response;
}
