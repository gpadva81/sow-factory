/**
 * Metrics service (Phase 2 stub).
 *
 * Normalises raw Autotask data into structured objects that the LLM
 * prompt builder can inject into SOW sections or standalone reports.
 */

import { getContractsByAccount, getTimeEntriesByContract } from './client';

export interface ContractMetrics {
  contractId: number;
  contractName: string;
  totalHoursBilled: number;
  billingApproved: number;
  billingPending: number;
  startDate: string;
  endDate: string;
}

export async function getContractMetrics(accountId: number): Promise<ContractMetrics[]> {
  const contracts = await getContractsByAccount(accountId);

  const metrics = await Promise.all(
    contracts.map(async (contract) => {
      const entries = await getTimeEntriesByContract(contract.id);
      const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked ?? 0), 0);
      const approved = entries
        .filter((e) => e.billingApprovalDateTime !== null)
        .reduce((sum, e) => sum + e.hoursWorked, 0);

      return {
        contractId: contract.id,
        contractName: contract.contractName,
        totalHoursBilled: totalHours,
        billingApproved: approved,
        billingPending: totalHours - approved,
        startDate: contract.startDate,
        endDate: contract.endDate,
      };
    }),
  );

  return metrics;
}
