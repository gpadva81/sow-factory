import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { getConfigValue, setConfigValue, deleteConfigValue, getConfigStatus } from '@/lib/config/store';
import { invalidateCredentialCache } from '@/lib/graph/client';
import { auditLog } from '@/lib/audit/logger';

// Keys we allow to be managed through the UI
const ALLOWED_KEYS = [
  'azure.tenantId',
  'azure.clientId',
  'azure.clientSecret',
  'sharepoint.siteId',
  'sharepoint.driveId',
  'openai.apiKey',
  'openai.model',
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

const SaveSettingsSchema = z.object({
  // Partial – only keys included in the payload are updated
  'azure.tenantId': z.string().optional(),
  'azure.clientId': z.string().optional(),
  'azure.clientSecret': z.string().optional(),
  'sharepoint.siteId': z.string().optional(),
  'sharepoint.driveId': z.string().optional(),
  'openai.apiKey': z.string().optional(),
  'openai.model': z.string().optional(),
});

/** GET /api/settings – returns which keys are configured (never values) */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const configured: Record<string, boolean> = {};
  await Promise.all(
    ALLOWED_KEYS.map(async (key) => {
      const val = await getConfigValue(key);
      configured[key] = !!val;
    }),
  );

  const status = await getConfigStatus();

  return NextResponse.json({ configured, status });
}

/** PATCH /api/settings – save one or more config values */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SaveSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const updates: AllowedKey[] = [];

  for (const key of ALLOWED_KEYS) {
    const value = parsed.data[key];
    if (value === undefined) continue;

    if (value === '') {
      await deleteConfigValue(key);
    } else {
      await setConfigValue(key, value, session.user.id);
    }
    updates.push(key);
  }

  // Invalidate cached Graph credentials so next call picks up new values
  if (updates.some((k) => k.startsWith('azure.'))) {
    invalidateCredentialCache();
  }

  await auditLog({
    actorUserId: session.user.id,
    action: 'SETTINGS_UPDATED',
    metadataJson: { keys: updates },
  });

  return NextResponse.json({ updated: updates });
}
