import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { setup?: string; error?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect('/templates');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SOW Factory</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {searchParams.setup === 'complete' && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            ✓ Account created. Sign in below.
          </div>
        )}

        <LoginForm error={searchParams.error} />

        <p className="text-center text-xs text-gray-400">
          New deployment?{' '}
          <a href="/setup" className="text-brand-600 hover:underline">
            Run first-time setup
          </a>
        </p>
      </div>
    </div>
  );
}
