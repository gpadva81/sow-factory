import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { NewTemplateForm } from './NewTemplateForm';

export default async function NewTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/templates');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Template</h1>
        <p className="text-sm text-gray-500 mt-1">
          Register a SharePoint DOCX as a SOW template and define its intake form.
        </p>
      </div>
      <NewTemplateForm />
    </div>
  );
}
