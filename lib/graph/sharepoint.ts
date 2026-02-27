import { graphGetRaw, graphRequest } from './client';
import { logger } from '@/lib/logger';

const isMock = () => process.env.MOCK_SHAREPOINT === 'true';

// ─── Mock template ─────────────────────────────────────────────────────────────

/**
 * Builds a minimal but structurally valid .docx buffer at runtime using
 * PizZip so the full pipeline can be exercised locally without SharePoint.
 *
 * The document contains every docxtemplater placeholder used by merger.ts.
 * For a production-quality template (letterhead, styles) use the
 * scripts/gen-sample-template.js script and upload to SharePoint.
 */
async function buildMockTemplateBuffer(): Promise<Buffer> {
  const PizZip = (await import('pizzip')).default;

  const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const WORD_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  function p(text: string): string {
    return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  }

  const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${p('STATEMENT OF WORK')}
    ${p('{project_title}')}
    ${p('Client: {client_name}')}
    ${p('{overview}')}
    {#objectives}${p('{text}')}{/objectives}
    {#scope_included}${p('In scope: {text}')}{/scope_included}
    {#scope_excluded}${p('Out of scope: {text}')}{/scope_excluded}
    {#deliverables}${p('{name}: {description} | AC: {acceptance_criteria}')}{/deliverables}
    {#timeline}${p('{milestone}: {eta}')}{/timeline}
    {#roles_responsibilities}${p('{role}')}{#responsibilities}${p('{text}')}{/responsibilities}{/roles_responsibilities}
    {#assumptions}${p('{text}')}{/assumptions}
    {#risks}${p('{risk} -> {mitigation}')}{/risks}
    ${p('Pricing: {pricing_model} {pricing_currency} {pricing_amount}')}
    ${p('Notes: {pricing_notes}')}
    {#terms}${p('{text}')}{/terms}
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', RELS);
  zip.file('word/document.xml', DOCUMENT);
  zip.file('word/_rels/document.xml.rels', WORD_RELS);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  webUrl: string;
  name: string;
}

/**
 * Download the raw bytes of a SharePoint file by its driveItem ID.
 */
export async function getFileContent(
  siteId: string,
  driveId: string,
  fileId: string,
): Promise<Buffer> {
  if (isMock()) {
    logger.warn('MOCK_SHAREPOINT=true – returning programmatically built mock template');
    return buildMockTemplateBuffer();
  }

  const path = `/sites/${siteId}/drives/${driveId}/items/${fileId}/content`;
  const response = await graphGetRaw(path);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a file into a specific folder (by folder driveItem ID).
 * Uses simple PUT upload (≤4 MB). For larger files use a resumable session.
 */
export async function uploadFile(
  siteId: string,
  driveId: string,
  folderId: string,
  fileName: string,
  content: Buffer,
): Promise<UploadedFile> {
  if (isMock()) {
    const mockUrl = `https://contoso.sharepoint.com/sites/sow-factory/Shared%20Documents/SOWs/${encodeURIComponent(fileName)}`;
    logger.warn({ fileName, mockUrl }, 'MOCK_SHAREPOINT=true – returning mock upload result');
    return { id: `mock-file-${Date.now()}`, webUrl: mockUrl, name: fileName };
  }

  interface DriveItem {
    id: string;
    webUrl: string;
    name: string;
  }

  const path = `/sites/${siteId}/drives/${driveId}/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;
  const item = await graphRequest<DriveItem>(path, {
    method: 'PUT',
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    body: content as unknown as BodyInit,
  });

  return { id: item.id, webUrl: item.webUrl, name: item.name };
}

/**
 * Resolve a SharePoint site ID from hostname + site path.
 * Useful when SHAREPOINT_SITE_ID is not pre-configured.
 */
export async function resolveSiteId(hostname: string, sitePath: string): Promise<string> {
  interface Site {
    id: string;
  }
  const site = await graphRequest<Site>(`/sites/${hostname}:${sitePath}`);
  return site.id;
}
