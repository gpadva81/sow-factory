'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const navLinks = [
  { href: '/templates', label: 'Templates' },
  { href: '/sows', label: 'My SOWs' },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/templates" className="font-bold text-brand-700 text-lg">
              SOW Factory
            </Link>
            <div className="flex gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/templates/new"
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    pathname === '/templates/new'
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  + New Template
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{session?.user?.email}</span>
            {session?.user?.role === 'ADMIN' && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
