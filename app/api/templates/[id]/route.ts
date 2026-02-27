import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit/logger';

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  sharepointFileId: z.string().min(1).optional(),
  sharepointSiteId: z.string().min(1).optional(),
  sharepointDriveId: z.string().min(1).optional(),
  outputFolderId: z.string().min(1).optional(),
  intakeSchemaJson: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
  }

  const template = await prisma.template.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  }

  const { intakeSchemaJson, ...restData } = parsed.data;
  const updated = await prisma.template.update({
    where: { id: params.id },
    data: {
      ...restData,
      ...(intakeSchemaJson !== undefined && {
        intakeSchemaJson: intakeSchemaJson as Prisma.InputJsonObject,
      }),
    },
  });

  await auditLog({
    actorUserId: session.user.id,
    action: 'TEMPLATE_UPDATED',
    entityType: 'Template',
    entityId: params.id,
    metadataJson: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
  }

  // Soft-delete
  await prisma.template.update({
    where: { id: params.id },
    data: { active: false },
  });

  await auditLog({
    actorUserId: session.user.id,
    action: 'TEMPLATE_DELETED',
    entityType: 'Template',
    entityId: params.id,
  });

  return new NextResponse(null, { status: 204 });
}
