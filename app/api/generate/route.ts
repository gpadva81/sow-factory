import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getLLMProvider } from '@/lib/llm/openai';
import { mergeDocx } from '@/lib/docx/merger';
import { getFileContent, uploadFile } from '@/lib/graph/sharepoint';
import { validateIntakeData } from '@/lib/validation/intake';
import { auditLog } from '@/lib/audit/logger';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

const GenerateBodySchema = z.object({
  templateId: z.string().min(1),
  intakeData: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const log = logger.child({ requestId });

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limit ────────────────────────────────────────────────────────────
  if (!checkRateLimit(session.user.id)) {
    log.warn({ userId: session.user.id }, 'Rate limit exceeded');
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 },
    );
  }

  // ── 3. Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = GenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { templateId, intakeData } = parsed.data;

  // ── 4. Load template ─────────────────────────────────────────────────────────
  const template = await prisma.template.findUnique({ where: { id: templateId, active: true } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // ── 5. Validate intake against template schema ────────────────────────────────
  const validation = validateIntakeData(template.intakeSchemaJson, intakeData);
  if (!validation.success) {
    return NextResponse.json(
      { error: `Intake validation failed: ${validation.error}` },
      { status: 400 },
    );
  }

  // ── 6. Create SOW record ─────────────────────────────────────────────────────
  const sow = await prisma.sOW.create({
    data: {
      templateId: template.id,
      createdById: session.user.id,
      inputJson: intakeData as Prisma.InputJsonObject,
      status: 'GENERATING',
      requestId,
    },
  });

  log.info({ sowId: sow.id, templateId }, 'SOW generation started');

  try {
    // ── 7. Call LLM ────────────────────────────────────────────────────────────
    const llmProvider = getLLMProvider();
    const llmResult = await llmProvider.generateSOW(intakeData, {
      name: template.name,
      description: template.description ?? null,
    });

    await auditLog({
      actorUserId: session.user.id,
      action: 'LLM_GENERATE_SOW',
      entityType: 'SOW',
      entityId: sow.id,
      metadataJson: { templateId, requestId, model: process.env.OPENAI_MODEL },
      requestId,
    });

    await prisma.sOW.update({
      where: { id: sow.id },
      data: {
        llmOutputJson: llmResult as unknown as Prisma.InputJsonObject,
        status: 'MERGING',
      },
    });

    // ── 8. Fetch template DOCX from SharePoint ─────────────────────────────────
    const templateBuffer = await getFileContent(
      template.sharepointSiteId,
      template.sharepointDriveId,
      template.sharepointFileId,
    );

    // ── 9. Merge into DOCX ─────────────────────────────────────────────────────
    const mergedBuffer = await mergeDocx(templateBuffer, llmResult);

    // ── 10. Upload to SharePoint ───────────────────────────────────────────────
    await prisma.sOW.update({ where: { id: sow.id }, data: { status: 'UPLOADING' } });

    const fileName = `SOW_${llmResult.sow.client_name.replace(/\s+/g, '_')}_${sow.id.slice(0, 8)}.docx`;
    const uploaded = await uploadFile(
      template.sharepointSiteId,
      template.sharepointDriveId,
      template.outputFolderId,
      fileName,
      mergedBuffer,
    );

    await auditLog({
      actorUserId: session.user.id,
      action: 'SHAREPOINT_UPLOAD',
      entityType: 'SOW',
      entityId: sow.id,
      metadataJson: { fileName, fileId: uploaded.id, webUrl: uploaded.webUrl },
      requestId,
    });

    // ── 11. Finalise SOW record ────────────────────────────────────────────────
    const finalSow = await prisma.sOW.update({
      where: { id: sow.id },
      data: {
        sharepointFileId: uploaded.id,
        sharepointWebUrl: uploaded.webUrl,
        status: 'COMPLETE',
      },
    });

    log.info({ sowId: sow.id, webUrl: uploaded.webUrl }, 'SOW generation complete');

    await auditLog({
      actorUserId: session.user.id,
      action: 'SOW_GENERATED',
      entityType: 'SOW',
      entityId: sow.id,
      metadataJson: { requestId, webUrl: uploaded.webUrl },
      requestId,
    });

    return NextResponse.json({
      sowId: finalSow.id,
      webUrl: uploaded.webUrl,
      status: 'COMPLETE',
      projectTitle: llmResult.sow.project_title,
      clientName: llmResult.sow.client_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err, sowId: sow.id }, 'SOW generation failed');

    await prisma.sOW.update({
      where: { id: sow.id },
      data: { status: 'FAILED', errorMessage: message },
    });

    await auditLog({
      actorUserId: session.user.id,
      action: 'SOW_GENERATION_FAILED',
      entityType: 'SOW',
      entityId: sow.id,
      metadataJson: { error: message, requestId },
      requestId,
    });

    return NextResponse.json(
      { error: 'SOW generation failed', detail: message, requestId },
      { status: 500 },
    );
  }
}
