import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getConfigValue, getConfigStatus } from '@/lib/config/store';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/templates');

  // Fetch which keys are set (boolean mask – never leak values to client)
  const [tenantId, clientId, clientSecret, siteId, driveId, openaiKey, openaiModel] =
    await Promise.all([
      getConfigValue('azure.tenantId'),
      getConfigValue('azure.clientId'),
      getConfigValue('azure.clientSecret'),
      getConfigValue('sharepoint.siteId'),
      getConfigValue('sharepoint.driveId'),
      getConfigValue('openai.apiKey'),
      getConfigValue('openai.model'),
    ]);

  const status = await getConfigStatus();

  const configured = {
    'azure.tenantId': !!tenantId,
    'azure.clientId': !!clientId,
    'azure.clientSecret': !!clientSecret,
    'sharepoint.siteId': !!siteId,
    'sharepoint.driveId': !!driveId,
    'openai.apiKey': !!openaiKey,
    'openai.model': !!openaiModel,
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your Azure / SharePoint and OpenAI credentials.
          Values are encrypted at rest — they are never shown again after saving.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Demo mode is {status.overallMock ? 'active' : 'inactive'}.</strong>{' '}
        {status.overallMock
          ? 'SOW documents are generated locally and not uploaded to real SharePoint. Add Azure credentials below to enable real document storage.'
          : 'Credentials are configured. Documents will be uploaded to SharePoint.'}
      </div>

      <SettingsForm configured={configured} />
    </div>
  );
}
