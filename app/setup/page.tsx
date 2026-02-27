import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { SetupForm } from './SetupForm';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect('/login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SOW Factory</h1>
          <p className="mt-2 text-sm text-gray-500">Create your admin account to get started</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          <strong>First-time setup.</strong> This page is only accessible before any users exist.
          After submitting, sign in at <code>/login</code>.
        </div>

        <SetupForm />
      </div>
    </div>
  );
}
