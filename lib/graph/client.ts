import { ClientSecretCredential } from '@azure/identity';
import { logger } from '@/lib/logger';

let _credential: ClientSecretCredential | null = null;

function getCredential(): ClientSecretCredential {
  if (!_credential) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        'Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.',
      );
    }
    _credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return _credential;
}

async function getAccessToken(): Promise<string> {
  const token = await getCredential().getToken('https://graph.microsoft.com/.default');
  if (!token?.token) throw new Error('Failed to acquire Microsoft Graph access token');
  return token.token;
}

interface GraphRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  rawResponse?: boolean;
}

export async function graphRequest<T>(
  path: string,
  options: GraphRequestOptions = {},
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

  if (options.rawResponse) {
    return response as unknown as T;
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
