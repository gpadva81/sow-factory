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

export function GenerateSOWPanel({ templateId, intakeSchema }: GenerateSOWPanelProps) {
  const router = useRouter();
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(intakeData: Record<string, unknown>) {
    setError(null);
    setResult(null);

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, intakeData }),
    });

    const data = await res.json() as { error?: string; detail?: string } & Partial<GenerateResult>;

    if (!res.ok) {
      setError(data.detail ?? data.error ?? `Error ${res.status}`);
      return;
    }

    setResult(data as GenerateResult);
    // Also navigate to the new SOW page after a brief delay
    setTimeout(() => router.push(`/sows/${data.sowId}`), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-green-800">SOW Generated Successfully</p>
              <p className="text-sm text-green-700 mt-1">
                {result.projectTitle} — {result.clientName}
              </p>
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
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Open in SharePoint
          </a>
          <a
            href={`/sows/${result.sowId}`}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
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
          <strong>Error:</strong> {error}
        </div>
      )}
      <DynamicIntakeForm
        schema={intakeSchema as unknown as Parameters<typeof DynamicIntakeForm>[0]['schema']}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
