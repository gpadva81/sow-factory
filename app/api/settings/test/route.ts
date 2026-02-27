import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { graphRequest } from '@/lib/graph/client';
import { getOpenAIKey, getOpenAIModel } from '@/lib/config/store';
import OpenAI from 'openai';

/** POST /api/settings/test?service=sharepoint|openai */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = new URL(req.url).searchParams.get('service');

  if (service === 'sharepoint') {
    try {
      interface OrgInfo { displayName?: string; id: string }
      const org = await graphRequest<OrgInfo>('/organization?$select=displayName,id');
      return NextResponse.json({ ok: true, detail: `Connected to tenant: ${(org as { value?: OrgInfo[] }).value?.[0]?.displayName ?? 'unknown'}` });
    } catch (err) {
      return NextResponse.json({ ok: false, detail: err instanceof Error ? err.message : String(err) });
    }
  }

  if (service === 'openai') {
    try {
      const apiKey = await getOpenAIKey();
      if (!apiKey) return NextResponse.json({ ok: false, detail: 'No OpenAI API key configured' });
      const model = await getOpenAIModel();
      const client = new OpenAI({ apiKey });
      // Minimal call to verify the key is valid
      await client.models.retrieve(model);
      return NextResponse.json({ ok: true, detail: `Connected – model ${model} is available` });
    } catch (err) {
      return NextResponse.json({ ok: false, detail: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ error: 'Unknown service. Use ?service=sharepoint or ?service=openai' }, { status: 400 });
}
