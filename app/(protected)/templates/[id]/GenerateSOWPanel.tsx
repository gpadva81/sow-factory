'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicIntakeForm } from '@/components/forms/DynamicIntakeForm';

interface GenerateResult {
  sowId: string;
  webUrl: string;
  projectTitle: string;
  clientName: string;
}

interface GenerateSOWPanelProps {
  templateId: string;
  intakeSchema: Record<string, unknown>;
}

function friendlyError(raw: string): string {
  if (raw.includes('API key')) return 'OpenAI API key is not configured. Ask an admin to add it in Settings.';
  if (raw.includes('does not have access to model')) return 'The configured OpenAI API key does not have access to the selected model. Go to Settings → OpenAI and choose a different model.';
  if (raw.includes('Azure credentials')) return 'Azure / SharePoint credentials are not configured. Ask an admin to add them in Settings.';
  if (raw.includes('Rate limit')) return 'You have hit the generation rate limit. Please wait a moment and try again.';
  if (raw.includes('Intake validation')) return raw.replace('Intake validation failed: ', 'Please fix these fields: ');
  // Truncate long internal errors
  return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
}

export function GenerateSOWPanel({ templateId, intakeSchema }: GenerateSOWPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(intakeData: Record<string, unknown>) {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, intakeData }),
      });

      const data = await res.json() as { error?: string; detail?: string } & Partial<GenerateResult>;

      if (!res.ok) {
        setError(friendlyError(data.detail ?? data.error ?? `Error ${res.status}`));
        return;
      }

      setResult(data as GenerateResult);
      setTimeout(() => router.push(`/sows/${data.sowId}`), 2000);
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-green-800">SOW Generated Successfully</p>
              <p className="text-sm text-green-700 mt-1">{result.projectTitle} — {result.clientName}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={result.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Open in SharePoint
          </a>
          <a href={`/sows/${result.sowId}`} className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            View Details
          </a>
        </div>
        <p className="text-xs text-gray-400">Redirecting to SOW details…</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Error: </strong>{error}
        </div>
      )}
      <DynamicIntakeForm
        schema={intakeSchema as unknown as Parameters<typeof DynamicIntakeForm>[0]['schema']}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
