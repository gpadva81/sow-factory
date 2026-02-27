'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE_SCHEMA = JSON.stringify(
  {
    type: 'object',
    title: 'Project Details',
    required: ['client_name', 'project_type', 'project_description'],
    properties: {
      client_name: {
        type: 'string',
        title: 'Client Name',
        description: 'Full legal name of the client organisation',
      },
      project_type: {
        type: 'string',
        title: 'Project Type',
        enum: ['Implementation', 'Migration', 'Assessment', 'Support', 'Consulting'],
      },
      budget_usd: {
        type: 'number',
        title: 'Budget (USD)',
        description: 'Estimated project budget',
      },
      include_training: {
        type: 'boolean',
        title: 'Include Training',
        description: 'Should user training be in scope?',
      },
      project_description: {
        type: 'string',
        title: 'Project Description',
        format: 'textarea',
        description: 'Detailed description of goals, context, and requirements',
      },
    },
  },
  null,
  2,
);

export function NewTemplateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    sharepointFileId: '',
    sharepointSiteId: process.env.NEXT_PUBLIC_DEFAULT_SITE_ID ?? '',
    sharepointDriveId: process.env.NEXT_PUBLIC_DEFAULT_DRIVE_ID ?? '',
    outputFolderId: '',
    intakeSchemaJson: EXAMPLE_SCHEMA,
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate JSON schema field
    let parsedSchema: unknown;
    try {
      parsedSchema = JSON.parse(form.intakeSchemaJson);
    } catch {
      setError('Intake Schema JSON is not valid JSON');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          sharepointFileId: form.sharepointFileId,
          sharepointSiteId: form.sharepointSiteId,
          sharepointDriveId: form.sharepointDriveId,
          outputFolderId: form.outputFolderId,
          intakeSchemaJson: parsedSchema,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const created = await res.json() as { id: string };
      router.push(`/templates/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          placeholder="e.g. Professional Services – Fixed Price"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${inputClass} resize-y`}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="When should this template be used?"
        />
      </div>

      <hr className="border-gray-100" />
      <h2 className="text-sm font-semibold text-gray-800">SharePoint Configuration</h2>

      <div>
        <label className={labelClass}>
          SharePoint Site ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={form.sharepointSiteId}
          onChange={(e) => set('sharepointSiteId', e.target.value)}
          required
          placeholder="contoso.sharepoint.com,<guid>,<guid>"
        />
      </div>

      <div>
        <label className={labelClass}>
          Drive ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={form.sharepointDriveId}
          onChange={(e) => set('sharepointDriveId', e.target.value)}
          required
          placeholder="b!…"
        />
      </div>

      <div>
        <label className={labelClass}>
          Template File ID (driveItem ID) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={form.sharepointFileId}
          onChange={(e) => set('sharepointFileId', e.target.value)}
          required
          placeholder="01ABC123…"
        />
        <p className="text-xs text-gray-400 mt-1">
          The driveItem ID of the .docx template in SharePoint. See Graph Explorer → /me/drive/root/children.
        </p>
      </div>

      <div>
        <label className={labelClass}>
          Output Folder ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          value={form.outputFolderId}
          onChange={(e) => set('outputFolderId', e.target.value)}
          required
          placeholder="01XYZ456…"
        />
        <p className="text-xs text-gray-400 mt-1">
          driveItem ID of the folder where generated SOWs will be uploaded.
        </p>
      </div>

      <hr className="border-gray-100" />
      <div>
        <label className={labelClass}>
          Intake Schema (JSON Schema) <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Defines the fields shown to users when generating a SOW. See{' '}
          <a href="/docs/template-authoring.md" target="_blank" className="text-brand-600 hover:underline">
            authoring guide
          </a>
          .
        </p>
        <textarea
          className={`${inputClass} font-mono text-xs resize-y`}
          rows={16}
          value={form.intakeSchemaJson}
          onChange={(e) => set('intakeSchemaJson', e.target.value)}
          required
          spellCheck={false}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors text-sm"
      >
        {loading ? 'Creating…' : 'Create Template'}
      </button>
    </form>
  );
}
