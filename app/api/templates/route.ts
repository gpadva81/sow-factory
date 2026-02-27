import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit/logger';
import { logger } from '@/lib/logger';

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sharepointFileId: z.string().min(1),
  sharepointSiteId: z.string().min(1),
  sharepointDriveId: z.string().min(1),
  outputFolderId: z.string().min(1),
  intakeSchemaJson: z.record(z.unknown()),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const perPage = 20;

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    }),
    prisma.template.count({ where: { active: true } }),
  ]);

  return NextResponse.json({ templates, total, page, perPage });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const template = await prisma.template.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      sharepointFileId: data.sharepointFileId,
      sharepointSiteId: data.sharepointSiteId,
      sharepointDriveId: data.sharepointDriveId,
      outputFolderId: data.outputFolderId,
      intakeSchemaJson: data.intakeSchemaJson as Prisma.InputJsonObject,
      createdById: session.user.id,
    },
  });

  await auditLog({
    actorUserId: session.user.id,
    action: 'TEMPLATE_CREATED',
    entityType: 'Template',
    entityId: template.id,
    metadataJson: { name: template.name },
  });

  logger.info({ templateId: template.id }, 'Template created');

  return NextResponse.json(template, { status: 201 });
}
