'use client';

import { useState } from 'react';

interface Configured {
  'azure.tenantId': boolean;
  'azure.clientId': boolean;
  'azure.clientSecret': boolean;
  'sharepoint.siteId': boolean;
  'sharepoint.driveId': boolean;
  'openai.apiKey': boolean;
  'openai.model': boolean;
}

interface SettingsFormProps {
  configured: Configured;
}

type TestResult = { ok: boolean; detail: string } | null;

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300'}`}
      aria-label={on ? 'Configured' : 'Not configured'}
    />
  );
}

function SectionCard({
  title,
  description,
  children,
  testService,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  testService?: string;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch(`/api/settings/test?service=${testService}`, { method: 'POST' });
    const data = await res.json() as TestResult;
    setTestResult(data);
    setTesting(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {testService && (
          <button
            onClick={runTest}
            disabled={testing}
            className="shrink-0 ml-4 text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        )}
      </div>

      {testResult && (
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            testResult.ok
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {testResult.ok ? '✓ ' : '✗ '}{testResult.detail}
        </div>
      )}

      {children}
    </div>
  );
}

interface CredentialFieldProps {
  label: string;
  fieldKey: string;
  configured: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}

function CredentialField({
  label,
  fieldKey,
  configured,
  value,
  onChange,
  placeholder,
  hint,
}: CredentialFieldProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <StatusDot on={configured} />
        {configured && !value && (
          <span className="text-xs text-gray-400">(saved – enter new value to replace)</span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        id={fieldKey}
        type="password"
        autoComplete="off"
        className="block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        placeholder={configured ? '••••••••  (leave blank to keep current)' : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SettingsForm({ configured }: SettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled state – empty string means "don't change this key"
  const [fields, setFields] = useState({
    'azure.tenantId': '',
    'azure.clientId': '',
    'azure.clientSecret': '',
    'sharepoint.siteId': '',
    'sharepoint.driveId': '',
    'openai.apiKey': '',
    'openai.model': '',
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(section: 'azure' | 'openai') {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload: Record<string, string> = {};

    if (section === 'azure') {
      if (fields['azure.tenantId']) payload['azure.tenantId'] = fields['azure.tenantId'];
      if (fields['azure.clientId']) payload['azure.clientId'] = fields['azure.clientId'];
      if (fields['azure.clientSecret']) payload['azure.clientSecret'] = fields['azure.clientSecret'];
      if (fields['sharepoint.siteId']) payload['sharepoint.siteId'] = fields['sharepoint.siteId'];
      if (fields['sharepoint.driveId']) payload['sharepoint.driveId'] = fields['sharepoint.driveId'];
    } else {
      if (fields['openai.apiKey']) payload['openai.apiKey'] = fields['openai.apiKey'];
      if (fields['openai.model']) payload['openai.model'] = fields['openai.model'];
    }

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      return;
    }

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Save failed');
    } else {
      setSaved(true);
      // Clear fields after save (values are now stored encrypted)
      if (section === 'azure') {
        setFields((prev) => ({
          ...prev,
          'azure.tenantId': '',
          'azure.clientId': '',
          'azure.clientSecret': '',
          'sharepoint.siteId': '',
          'sharepoint.driveId': '',
        }));
      } else {
        setFields((prev) => ({ ...prev, 'openai.apiKey': '', 'openai.model': '' }));
      }
      // Refresh the page so status dots update
      setTimeout(() => window.location.reload(), 800);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          ✓ Settings saved successfully.
        </div>
      )}

      {/* ── Azure / SharePoint ─────────────────────────────────────────────── */}
      <SectionCard
        title="Microsoft Azure & SharePoint"
        description="Used to fetch DOCX templates and upload generated SOWs. Requires an App Registration with Sites.Selected permission."
        testService="sharepoint"
      >
        <div className="space-y-4">
          <CredentialField
            label="Tenant ID"
            fieldKey="azure.tenantId"
            configured={configured['azure.tenantId']}
            value={fields['azure.tenantId']}
            onChange={(v) => set('azure.tenantId', v)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            hint="Azure portal → Azure Active Directory → Overview → Directory (tenant) ID"
          />
          <CredentialField
            label="Client ID"
            fieldKey="azure.clientId"
            configured={configured['azure.clientId']}
            value={fields['azure.clientId']}
            onChange={(v) => set('azure.clientId', v)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            hint="App registrations → your app → Application (client) ID"
          />
          <CredentialField
            label="Client Secret"
            fieldKey="azure.clientSecret"
            configured={configured['azure.clientSecret']}
            value={fields['azure.clientSecret']}
            onChange={(v) => set('azure.clientSecret', v)}
            placeholder="your-client-secret-value"
            hint="App registrations → Certificates & secrets → New client secret"
          />
          <CredentialField
            label="SharePoint Site ID"
            fieldKey="sharepoint.siteId"
            configured={configured['sharepoint.siteId']}
            value={fields['sharepoint.siteId']}
            onChange={(v) => set('sharepoint.siteId', v)}
            placeholder="contoso.sharepoint.com,<guid>,<guid>"
            hint="Graph Explorer → GET /sites/{hostname}:/{path} → copy the id field"
          />
          <CredentialField
            label="SharePoint Drive ID"
            fieldKey="sharepoint.driveId"
            configured={configured['sharepoint.driveId']}
            value={fields['sharepoint.driveId']}
            onChange={(v) => set('sharepoint.driveId', v)}
            placeholder="b!..."
            hint="Graph Explorer → GET /sites/{siteId}/drives → copy the drive id"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={() => handleSave('azure')}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save Azure settings'}
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <p className="font-medium">Required App Registration permissions (Application, not Delegated):</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li><code>Sites.Selected</code> — least-privilege SharePoint access</li>
            <li>After adding permission, grant access to your specific site via Graph API or SharePoint Admin</li>
          </ul>
        </div>
      </SectionCard>

      {/* ── OpenAI ─────────────────────────────────────────────────────────── */}
      <SectionCard
        title="OpenAI"
        description="Used to generate SOW content from intake form answers."
        testService="openai"
      >
        <div className="space-y-4">
          <CredentialField
            label="API Key"
            fieldKey="openai.apiKey"
            configured={configured['openai.apiKey']}
            value={fields['openai.apiKey']}
            onChange={(v) => set('openai.apiKey', v)}
            placeholder="sk-..."
            hint="platform.openai.com → API keys"
          />
          <div>
            <label htmlFor="openai.model" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              Model
              <StatusDot on={configured['openai.model']} />
            </label>
            <select
              id="openai.model"
              className="block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={fields['openai.model'] || 'gpt-4o'}
              onChange={(e) => set('openai.model', e.target.value)}
            >
              <option value="gpt-4o">gpt-4o (recommended)</option>
              <option value="gpt-4o-mini">gpt-4o-mini (faster / cheaper)</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => handleSave('openai')}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save OpenAI settings'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
