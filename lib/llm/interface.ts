// ─── SOW output contract ───────────────────────────────────────────────────────

export interface Deliverable {
  name: string;
  description: string;
  acceptance_criteria: string;
}

export interface TimelineEntry {
  milestone: string;
  eta: string;
}

export interface RoleResponsibility {
  role: string;
  responsibilities: string[];
}

export interface Risk {
  risk: string;
  mitigation: string;
}

export interface Pricing {
  model: 'fixed' | 'tm' | 'retainer';
  amount: number;
  currency: string;
  notes: string;
}

export interface LLMSOWOutput {
  project_title: string;
  client_name: string;
  overview: string;
  objectives: string[];
  scope_included: string[];
  scope_excluded: string[];
  deliverables: Deliverable[];
  timeline: TimelineEntry[];
  roles_responsibilities: RoleResponsibility[];
  assumptions: string[];
  risks: Risk[];
  pricing: Pricing;
  terms: string[];
}

export interface LLMGenerateResult {
  sow: LLMSOWOutput;
  /** Flat string map from template placeholder → rendered string value. */
  doc_merge_map: Record<string, string>;
}

// ─── Provider interface ────────────────────────────────────────────────────────

export interface LLMProvider {
  generateSOW(
    intakeData: Record<string, unknown>,
    templateContext: { name: string; description: string | null },
  ): Promise<LLMGenerateResult>;
}
