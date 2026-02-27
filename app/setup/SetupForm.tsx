'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Setup failed');
      setLoading(false);
      return;
    }

    router.push('/login?setup=complete');
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          type="text"
          className={inputClass}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          className={inputClass}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          required
          placeholder="jane@company.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          className={inputClass}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm password</label>
        <input
          type="password"
          className={inputClass}
          value={form.confirm}
          onChange={(e) => set('confirm', e.target.value)}
          required
          placeholder="Repeat password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors text-sm"
      >
        {loading ? 'Creating account…' : 'Create admin account'}
      </button>
    </form>
  );
}
