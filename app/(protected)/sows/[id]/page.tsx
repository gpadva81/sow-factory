import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import type { LLMSOWOutput } from '@/lib/llm/interface';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  GENERATING: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600',
  MERGING: 'bg-blue-100 text-blue-700',
  UPLOADING: 'bg-purple-100 text-purple-700',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function SOWDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const sow = await prisma.sOW.findUnique({
    where: { id: params.id },
    include: {
      template: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!sow) notFound();

  if (session.user.role !== 'ADMIN' && sow.createdById !== session.user.id) {
    redirect('/sows');
  }

  const llmData = sow.llmOutputJson as { sow: LLMSOWOutput } | null;
  const sowContent = llmData?.sow ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/sows" className="text-sm text-brand-600 hover:underline">
            ← My SOWs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {sowContent?.project_title ?? 'SOW Details'}
          </h1>
          {sowContent?.client_name && (
            <p className="text-gray-500 mt-0.5">{sowContent.client_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              STATUS_STYLES[sow.status] ?? 'bg-gray-100'
            }`}
          >
            {sow.status}
          </span>
          {sow.sharepointWebUrl && (
            <a
              href={sow.sharepointWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Open in SharePoint
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {sow.status === 'FAILED' && sow.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Generation failed:</strong> {sow.errorMessage}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <dt className="font-medium text-gray-500">Template</dt>
            <dd className="mt-0.5">
              <Link href={`/templates/${sow.template.id}`} className="text-brand-600 hover:underline">
                {sow.template.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Created by</dt>
            <dd className="mt-0.5 text-gray-700">
              {sow.createdBy.name ?? sow.createdBy.email}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Created</dt>
            <dd className="mt-0.5 text-gray-700">
              {new Date(sow.createdAt).toLocaleString()}
            </dd>
          </div>
          {sow.requestId && (
            <div>
              <dt className="font-medium text-gray-500">Request ID</dt>
              <dd className="mt-0.5 text-gray-700 font-mono truncate">{sow.requestId}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* SOW content preview */}
      {sowContent && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            SOW Content Preview
          </h2>

          <Section title="Overview">
            <p className="text-sm text-gray-700 leading-relaxed">{sowContent.overview}</p>
          </Section>

          <Section title="Objectives">
            <StringList items={sowContent.objectives} />
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Section title="In Scope">
              <StringList items={sowContent.scope_included} />
            </Section>
            <Section title="Out of Scope">
              <StringList items={sowContent.scope_excluded} />
            </Section>
          </div>

          <Section title="Deliverables">
            <div className="space-y-3">
              {sowContent.deliverables.map((d, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <p className="font-medium text-sm text-gray-800">{d.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{d.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Acceptance:</span> {d.acceptance_criteria}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Timeline">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium text-gray-600">Milestone</th>
                    <th className="text-left py-1.5 font-medium text-gray-600">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sowContent.timeline.map((t, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-gray-700">{t.milestone}</td>
                      <td className="py-1.5 text-gray-500">{t.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Section title="Assumptions">
              <StringList items={sowContent.assumptions} />
            </Section>
            <Section title="Risks">
              <div className="space-y-2">
                {sowContent.risks.map((r, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gray-700 font-medium">{r.risk}</span>
                    <span className="text-gray-500 ml-1">→ {r.mitigation}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section title="Pricing">
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {sowContent.pricing.currency} {sowContent.pricing.amount.toLocaleString()}
                </span>
                <span className="text-gray-500 capitalize">{sowContent.pricing.model}</span>
              </div>
              {sowContent.pricing.notes && (
                <p className="text-xs text-gray-500 mt-1">{sowContent.pricing.notes}</p>
              )}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
