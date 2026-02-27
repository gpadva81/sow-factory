import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);

  const templates = await prisma.template.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOW Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Select a template to generate a Statement of Work</p>
        </div>
        {session?.user?.role === 'ADMIN' && (
          <Link
            href="/templates/new"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Template
          </Link>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No templates yet</p>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/templates/new" className="text-brand-600 text-sm hover:underline mt-2 inline-block">
              Create your first template →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all group"
            >
              <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                {t.name}
              </h2>
              {t.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>By {t.createdBy.name ?? t.createdBy.email}</span>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
