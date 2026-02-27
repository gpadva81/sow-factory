/**
 * Autotask / Datto PSA REST API client (Phase 2 stub).
 *
 * All methods here are placeholders that validate configuration and
 * return typed mock data. Replace the bodies with real HTTP calls
 * once PSA integration is scoped.
 *
 * Auth: Autotask uses HTTP Basic auth where:
 *   username = AUTOTASK_USERNAME
 *   password = AUTOTASK_SECRET
 *   header   = ApiIntegrationCode: AUTOTASK_INTEGRATION_CODE
 */

import { logger } from '@/lib/logger';

export interface AutotaskContract {
  id: number;
  contractName: string;
  contractType: number;
  accountId: number;
  startDate: string;
  endDate: string;
  status: number;
}

export interface AutotaskTimeEntry {
  id: number;
  contractId: number;
  resourceId: number;
  hoursWorked: number;
  dateWorked: string;
  billingApprovalDateTime: string | null;
}

function getConfig(): { baseUrl: string; username: string; secret: string; integrationCode: string } {
  const baseUrl = process.env.AUTOTASK_BASE_URL;
  const username = process.env.AUTOTASK_USERNAME;
  const secret = process.env.AUTOTASK_SECRET;
  const integrationCode = process.env.AUTOTASK_INTEGRATION_CODE;

  if (!baseUrl || !username || !secret || !integrationCode) {
    throw new Error(
      'Autotask environment variables not configured. ' +
        'Set AUTOTASK_BASE_URL, AUTOTASK_USERNAME, AUTOTASK_SECRET, AUTOTASK_INTEGRATION_CODE.',
    );
  }

  return { baseUrl, username, secret, integrationCode };
}

async function autotaskFetch<T>(path: string): Promise<T> {
  const { baseUrl, username, secret, integrationCode } = getConfig();

  const credentials = Buffer.from(`${username}:${secret}`).toString('base64');

  logger.info({ path }, 'Autotask API request');

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      ApiIntegrationCode: integrationCode,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Autotask API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

// ─── Public methods ────────────────────────────────────────────────────────────

export async function getContractsByAccount(accountId: number): Promise<AutotaskContract[]> {
  interface AutotaskResponse {
    items: AutotaskContract[];
  }
  const data = await autotaskFetch<AutotaskResponse>(
    `/Contracts/query?search={"filter":[{"op":"eq","field":"accountId","value":${accountId}}]}`,
  );
  return data.items;
}

export async function getTimeEntriesByContract(contractId: number): Promise<AutotaskTimeEntry[]> {
  interface AutotaskResponse {
    items: AutotaskTimeEntry[];
  }
  const data = await autotaskFetch<AutotaskResponse>(
    `/TimeEntries/query?search={"filter":[{"op":"eq","field":"contractId","value":${contractId}}]}`,
  );
  return data.items;
}
