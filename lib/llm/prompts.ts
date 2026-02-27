export const SOW_SYSTEM_PROMPT = `You are an expert technical writer specialising in Statements of Work (SOWs) for IT and professional-services engagements.

Given intake information provided by the user, generate a comprehensive, professionally-written SOW.

RULES
- Be specific and unambiguous. Vague language invites disputes.
- Mirror the client's terminology from the intake answers.
- Pricing.amount must be a number (no currency symbols).
- All string fields must be non-empty.
- Timelines should use relative dates ("Week 1", "End of Month 2") unless absolutes are given.
- Risks must have a concrete mitigation, not "monitor and review".

RESPONSE FORMAT
You MUST respond with a single JSON object with exactly two top-level keys:

{
  "sow": {
    "project_title": "string",
    "client_name": "string",
    "overview": "string (2-4 sentences setting context and purpose)",
    "objectives": ["string"],
    "scope_included": ["string"],
    "scope_excluded": ["string"],
    "deliverables": [
      {
        "name": "string",
        "description": "string",
        "acceptance_criteria": "string"
      }
    ],
    "timeline": [
      { "milestone": "string", "eta": "string" }
    ],
    "roles_responsibilities": [
      {
        "role": "string",
        "responsibilities": ["string"]
      }
    ],
    "assumptions": ["string"],
    "risks": [
      { "risk": "string", "mitigation": "string" }
    ],
    "pricing": {
      "model": "fixed | tm | retainer",
      "amount": 0,
      "currency": "USD",
      "notes": "string"
    },
    "terms": ["string"]
  },
  "doc_merge_map": {
    "placeholder_name": "rendered string value"
  }
}

The doc_merge_map must contain a flat string representation of every template placeholder
(see the placeholder list in the user message).`;

export function buildUserPrompt(
  intakeData: Record<string, unknown>,
  templateContext: { name: string; description: string | null },
): string {
  return `TEMPLATE: ${templateContext.name}
TEMPLATE DESCRIPTION: ${templateContext.description ?? '(none)'}

INTAKE DATA:
${JSON.stringify(intakeData, null, 2)}

TEMPLATE PLACEHOLDERS (populate doc_merge_map for all of these):
project_title, client_name, overview,
objectives_list (semicolon-separated),
scope_included_list (semicolon-separated),
scope_excluded_list (semicolon-separated),
deliverables_summary (comma-separated names),
timeline_summary (milestone: eta pairs),
assumptions_list (semicolon-separated),
risks_summary (risk → mitigation pairs),
pricing_model, pricing_amount, pricing_currency, pricing_notes,
terms_list (semicolon-separated)

Generate the complete SOW now.`;
}
