import { z } from 'zod';

type JSONSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
};

type JSONSchemaObject = {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  title?: string;
  description?: string;
};

function buildFieldSchema(prop: JSONSchemaProperty): z.ZodTypeAny {
  switch (prop.type) {
    case 'string':
      if (prop.enum && prop.enum.length > 0) {
        const [first, ...rest] = prop.enum as [string, ...string[]];
        return z.enum([first, ...rest]);
      }
      return z.string().min(1, 'This field is required');

    case 'number':
    case 'integer':
      return z.union([z.number(), z.string().transform(Number)]);

    case 'boolean':
      return z.boolean();

    case 'array': {
      const itemSchema = prop.items ? buildFieldSchema(prop.items) : z.unknown();
      return z.array(itemSchema);
    }

    default:
      return z.unknown();
  }
}

export function buildZodSchemaFromJSONSchema(schema: JSONSchemaObject): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  const required = new Set(schema.required ?? []);

  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    let fieldSchema = buildFieldSchema(prop);
    if (!required.has(key)) {
      fieldSchema = fieldSchema.optional() as z.ZodTypeAny;
    }
    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

export type ValidationResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export function validateIntakeData(schemaJson: unknown, data: unknown): ValidationResult {
  try {
    const jsonSchema = schemaJson as JSONSchemaObject;
    if (jsonSchema.type !== 'object') {
      return { success: false, error: 'Template intake schema must be a JSON Schema object' };
    }

    const zodSchema = buildZodSchemaFromJSONSchema(jsonSchema);
    const result = zodSchema.safeParse(data);

    if (!result.success) {
      const messages = result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
      );
      return { success: false, error: messages.join('; ') };
    }

    return { success: true, data: result.data as Record<string, unknown> };
  } catch {
    return { success: false, error: 'Intake schema configuration is invalid' };
  }
}
