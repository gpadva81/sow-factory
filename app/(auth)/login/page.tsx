import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { LoginButton } from './LoginButton';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/templates');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SOW Factory</h1>
          <p className="mt-2 text-sm text-gray-500">
            Generate professional Statements of Work in minutes
          </p>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400 mb-4">Sign in with your company account</p>
          <LoginButton />
        </div>

        <p className="text-xs text-gray-400">
          Access is restricted to authorised team members.
        </p>
      </div>
    </div>
  );
}
