import Link from 'next/link';
import { getConfigStatus } from '@/lib/config/store';

export async function DemoModeBanner() {
  let isMock = true;
  try {
    const status = await getConfigStatus();
    isMock = status.overallMock;
  } catch {
    // DB not ready yet during first boot – stay silent
    return null;
  }

  if (!isMock) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        <p className="text-xs text-amber-800">
          <strong>Demo mode active —</strong> SOW documents are generated locally and not uploaded to real SharePoint.
          Add your Azure &amp; OpenAI credentials to enable production mode.
        </p>
        <Link
          href="/settings"
          className="shrink-0 text-xs font-medium text-amber-800 underline hover:text-amber-900"
        >
          Configure credentials →
        </Link>
      </div>
    </div>
  );
}
