import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { GenerateSOWPanel } from './GenerateSOWPanel';

export const dynamic = 'force-dynamic';

export default async function TemplatePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const template = await prisma.template.findUnique({
    where: { id: params.id, active: true },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  if (!template) notFound();

  const recentSows = await prisma.sOW.findMany({
    where: {
      templateId: template.id,
      ...(session?.user?.role !== 'ADMIN' ? { createdById: session?.user?.id } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Template info */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
          {template.description && (
            <p className="text-sm text-gray-500 mt-2">{template.description}</p>
          )}
          <dl className="mt-4 space-y-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <dt className="font-medium">Created by</dt>
              <dd>{template.createdBy.name ?? template.createdBy.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Last updated</dt>
              <dd>{new Date(template.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {recentSows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Recent SOWs</h2>
            <ul className="space-y-2">
              {recentSows.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/sows/${s.id}`}
                    className="flex items-center justify-between text-xs hover:text-brand-600 transition-colors"
                  >
                    <span className="truncate text-gray-700">
                      {(s.inputJson as Record<string, unknown>)?.client_name as string ?? s.id.slice(0, 8)}
                    </span>
                    <span
                      className={`ml-2 shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                        s.status === 'COMPLETE'
                          ? 'bg-green-100 text-green-700'
                          : s.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: Generate form */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Generate SOW</h2>
          <p className="text-sm text-gray-500 mb-6">
            Fill in the details below. The AI will draft the SOW content and produce a formatted Word document.
          </p>
          <GenerateSOWPanel
            templateId={template.id}
            intakeSchema={template.intakeSchemaJson as Record<string, unknown>}
          />
        </div>
      </div>
    </div>
  );
}
