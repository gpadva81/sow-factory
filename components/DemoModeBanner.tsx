'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function DemoModeBanner() {
  const pathname = usePathname();
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    // Fetch mock status from API so this works as a client component
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { status?: { overallMock?: boolean } }) => {
        setIsMock(d.status?.overallMock ?? true);
      })
      .catch(() => setIsMock(true));
  }, []);

  // Don't show on settings page — user is already there
  if (pathname === '/settings') return null;
  if (!isMock) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        <p className="text-xs text-amber-800">
          <strong>Demo mode active —</strong> Documents are generated locally and not uploaded to SharePoint.
          Add credentials to enable production mode.
        </p>
        <Link
          href="/settings"
          className="shrink-0 text-xs font-medium text-amber-800 underline hover:text-amber-900 whitespace-nowrap"
        >
          Configure →
        </Link>
      </div>
    </div>
  );
}
