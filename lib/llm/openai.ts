import OpenAI from 'openai';
import { z } from 'zod';
import { SOW_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { LLMGenerateResult, LLMProvider } from './interface';
import { getOpenAIKey, getOpenAIModel } from '@/lib/config/store';
import { logger } from '@/lib/logger';

// ─── Zod schema for LLM response validation ────────────────────────────────────

const DeliverableSchema = z.object({
  name: z.string(),
  description: z.string(),
  acceptance_criteria: z.string(),
});

const SOWOutputSchema = z.object({
  project_title: z.string(),
  client_name: z.string(),
  overview: z.string(),
  objectives: z.array(z.string()),
  scope_included: z.array(z.string()),
  scope_excluded: z.array(z.string()),
  deliverables: z.array(DeliverableSchema),
  timeline: z.array(z.object({ milestone: z.string(), eta: z.string() })),
  roles_responsibilities: z.array(
    z.object({ role: z.string(), responsibilities: z.array(z.string()) }),
  ),
  assumptions: z.array(z.string()),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  pricing: z.object({
    model: z.enum(['fixed', 'tm', 'retainer']),
    amount: z.number(),
    currency: z.string(),
    notes: z.string(),
  }),
  terms: z.array(z.string()),
});

const LLMResponseSchema = z.object({
  sow: SOWOutputSchema,
  doc_merge_map: z.record(z.string()),
});

// ─── OpenAI provider ───────────────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  async generateSOW(
    intakeData: Record<string, unknown>,
    templateContext: { name: string; description: string | null },
  ): Promise<LLMGenerateResult> {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is not configured. Go to Settings to add your OpenAI API key.',
      );
    }

    const model = await getOpenAIModel();
    const client = new OpenAI({ apiKey });
    const userPrompt = buildUserPrompt(intakeData, templateContext);

    logger.info({ model, template: templateContext.name }, 'Calling LLM for SOW generation');

    const response = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SOW_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('LLM returned empty response');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`LLM response was not valid JSON: ${raw.slice(0, 200)}`);
    }

    const validated = LLMResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.error({ issues: validated.error.issues, raw }, 'LLM response failed schema validation');
      throw new Error(
        `LLM response did not match expected schema: ${validated.error.issues.map((i) => i.message).join(', ')}`,
      );
    }

    logger.info({ tokens: response.usage }, 'LLM generation complete');
    return validated.data;
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let _provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!_provider) _provider = new OpenAIProvider();
  return _provider;
}
