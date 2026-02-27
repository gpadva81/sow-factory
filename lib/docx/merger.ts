import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { LLMGenerateResult } from '@/lib/llm/interface';
import { logger } from '@/lib/logger';

/**
 * Merge LLM output into a docxtemplater-compatible DOCX template buffer.
 *
 * Placeholder syntax in templates (see docs/template-authoring.md):
 *   Scalar:  {project_title}
 *   Loop:    {#deliverables}{name} – {description}{/deliverables}
 *
 * docxtemplater uses single-brace tags by default when configured with
 * delimiters ['[', ']'] – but we keep the default '{' '}' here so existing
 * templates work out of the box.
 */
export async function mergeDocx(templateBuffer: Buffer, result: LLMGenerateResult): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const data = buildDocxData(result);
  logger.debug({ placeholders: Object.keys(data) }, 'Rendering DOCX template');

  doc.render(data);

  const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  return output as Buffer;
}

/**
 * Build the data object passed to docxtemplater.
 *
 * Scalar fields map directly; array fields wrap items in objects so loop
 * tags can reference properties (e.g. {#objectives}{text}{/objectives}).
 */
function buildDocxData(result: LLMGenerateResult): Record<string, unknown> {
  const { sow, doc_merge_map } = result;

  return {
    // ── Scalar fields ────────────────────────────────────────────────────────
    project_title: sow.project_title,
    client_name: sow.client_name,
    overview: sow.overview,
    pricing_model: sow.pricing.model,
    pricing_amount: String(sow.pricing.amount),
    pricing_currency: sow.pricing.currency,
    pricing_notes: sow.pricing.notes,

    // ── Loop arrays (wrap strings in {text:…} so templates use {text}) ───────
    objectives: sow.objectives.map((text) => ({ text })),
    scope_included: sow.scope_included.map((text) => ({ text })),
    scope_excluded: sow.scope_excluded.map((text) => ({ text })),
    assumptions: sow.assumptions.map((text) => ({ text })),
    terms: sow.terms.map((text) => ({ text })),

    // ── Complex loop arrays (fields match the object keys from LLM output) ───
    deliverables: sow.deliverables,
    timeline: sow.timeline,
    risks: sow.risks,

    // roles_responsibilities: expand nested responsibilities into {text:…} so
    // nested loops work: {#roles_responsibilities}…{#responsibilities}{text}{/responsibilities}…{/roles_responsibilities}
    roles_responsibilities: sow.roles_responsibilities.map((rr) => ({
      role: rr.role,
      responsibilities: rr.responsibilities.map((text) => ({ text })),
    })),

    // ── Flat merge map from LLM (supplementary / override values) ────────────
    ...doc_merge_map,
  };
}
