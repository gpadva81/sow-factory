'use client';

import { useState } from 'react';

// ─── JSON Schema types (minimal surface we handle) ────────────────────────────

interface JSONSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
}

interface JSONSchemaSection {
  type: 'object';
  title?: string;
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

interface JSONSchema {
  type: 'object';
  title?: string;
  description?: string;
  properties: Record<string, JSONSchemaProperty | JSONSchemaSection>;
  required?: string[];
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DynamicIntakeFormProps {
  schema: JSONSchema;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isSection(prop: JSONSchemaProperty | JSONSchemaSection): prop is JSONSchemaSection {
  return prop.type === 'object' && 'properties' in prop;
}

// ─── Field components ──────────────────────────────────────────────────────────

interface FieldProps {
  fieldKey: string;
  schema: JSONSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
}

function Field({ fieldKey, schema, value, onChange, required }: FieldProps) {
  const label = schema.title ?? fieldKey;
  const id = `field-${fieldKey}`;
  const baseInput =
    'mt-1 block w-full rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  if (schema.enum) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {schema.description && (
          <p className="text-xs text-gray-500 mt-0.5">{schema.description}</p>
        )}
        <select
          id={id}
          className={baseInput}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">Select an option…</option>
          {schema.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === 'boolean') {
    return (
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div>
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {schema.description && (
            <p className="text-xs text-gray-500">{schema.description}</p>
          )}
        </div>
      </div>
    );
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {schema.description && (
          <p className="text-xs text-gray-500 mt-0.5">{schema.description}</p>
        )}
        <input
          id={id}
          type="number"
          className={baseInput}
          value={String(value ?? '')}
          min={schema.minimum}
          max={schema.maximum}
          onChange={(e) => onChange(Number(e.target.value))}
          required={required}
        />
      </div>
    );
  }

  if (schema.format === 'textarea') {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {schema.description && (
          <p className="text-xs text-gray-500 mt-0.5">{schema.description}</p>
        )}
        <textarea
          id={id}
          rows={4}
          className={`${baseInput} resize-y`}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={schema.minLength}
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {schema.description && (
        <p className="text-xs text-gray-500 mt-0.5">{schema.description}</p>
      )}
      <input
        id={id}
        type="text"
        className={baseInput}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={schema.minLength}
      />
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function DynamicIntakeForm({ schema, onSubmit, loading = false }: DynamicIntakeFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setSectionValue(sectionKey: string, fieldKey: string, value: unknown) {
    setValues((prev) => ({
      ...prev,
      [sectionKey]: {
        ...((prev[sectionKey] as Record<string, unknown>) ?? {}),
        [fieldKey]: value,
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  const topRequired = new Set(schema.required ?? []);

  // Postgres JSONB returns object keys in alphabetical order, not insertion order.
  // Re-sort: required fields first (in their declared order), then the rest.
  const requiredOrder = schema.required ?? [];
  const allKeys = Object.keys(schema.properties);
  const sortedKeys = [
    ...requiredOrder.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !requiredOrder.includes(k)),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sortedKeys.map((key) => {
        const prop = schema.properties[key];
        if (isSection(prop)) {
          const sectionRequired = new Set(prop.required ?? []);
          const sectionValues = (values[key] as Record<string, unknown>) ?? {};
          return (
            <fieldset key={key} className="border border-gray-200 rounded-lg p-4 space-y-4">
              {prop.title && (
                <legend className="text-sm font-semibold text-gray-800 px-1">{prop.title}</legend>
              )}
              {Object.entries(prop.properties).map(([fk, fp]) => (
                <Field
                  key={fk}
                  fieldKey={fk}
                  schema={fp as JSONSchemaProperty}
                  value={sectionValues[fk]}
                  onChange={(v) => setSectionValue(key, fk, v)}
                  required={sectionRequired.has(fk)}
                />
              ))}
            </fieldset>
          );
        }

        return (
          <Field
            key={key}
            fieldKey={key}
            schema={prop as JSONSchemaProperty}
            value={values[key]}
            onChange={(v) => setValue(key, v)}
            required={topRequired.has(key)}
          />
        );
      })}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors text-sm"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? 'Generating SOW…' : 'Generate SOW'}
      </button>
    </form>
  );
}
