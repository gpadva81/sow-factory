import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  GENERATING: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600',
  MERGING: 'bg-blue-100 text-blue-700',
  UPLOADING: 'bg-purple-100 text-purple-700',
};

export default async function SOWsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const where =
    session.user.role === 'ADMIN' ? {} : { createdById: session.user.id };

  const sows = await prisma.sOW.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      template: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {session.user.role === 'ADMIN' ? 'All SOWs' : 'My SOWs'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {sows.length} document{sows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {sows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No SOWs generated yet</p>
          <Link href="/templates" className="text-brand-600 text-sm hover:underline mt-2 inline-block">
            Pick a template to get started →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client / Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                {session.user.role === 'ADMIN' && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created by</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sows.map((sow) => {
                const input = sow.inputJson as Record<string, unknown>;
                const clientName = (input?.client_name as string) ?? '—';
                const llmOut = sow.llmOutputJson as Record<string, unknown> | null;
                const projectTitle = (llmOut?.sow as Record<string, unknown>)?.project_title as string | undefined;

                return (
                  <tr key={sow.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{clientName}</div>
                      {projectTitle && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{projectTitle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sow.template.name}</td>
                    {session.user.role === 'ADMIN' && (
                      <td className="px-4 py-3 text-gray-500">
                        {sow.createdBy.name ?? sow.createdBy.email}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[sow.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sow.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(sow.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sows/${sow.id}`}
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
