import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { getContractsByAccount } from '@/lib/autotask/client';
import { auditLog } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';

const QuerySchema = z.object({
  accountId: z.string().regex(/^\d+$/, 'accountId must be a numeric string'),
});

/**
 * GET /api/autotask/contracts?accountId=12345
 *
 * Phase 2 endpoint – returns Autotask contracts for a given account.
 * Requires AUTOTASK_* env vars to be set.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({ accountId: searchParams.get('accountId') });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'accountId query parameter is required and must be numeric' },
      { status: 400 },
    );
  }

  try {
    const contracts = await getContractsByAccount(Number(parsed.data.accountId));

    await auditLog({
      actorUserId: session.user.id,
      action: 'AUTOTASK_CONTRACTS_QUERIED',
      metadataJson: { accountId: parsed.data.accountId, count: contracts.length },
    });

    return NextResponse.json({ contracts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Autotask contracts query failed');
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
