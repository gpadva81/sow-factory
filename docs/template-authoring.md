# Template Authoring Guide

This document explains how to create SOW templates that work with the SOW Factory merge engine.

---

## Overview

SOW Factory uses **docxtemplater** to merge structured data into Word `.docx` templates.
Templates live in SharePoint; the app fetches them, populates placeholders, and uploads the result.

The merge engine passes a data object with both **scalar** and **loop** fields.
Use the placeholder syntax below in your Word document.

---

## Placeholder Syntax

docxtemplater uses single-brace tags by default:

| Type | Template syntax | Example value |
|------|----------------|---------------|
| Scalar string | `{project_title}` | `Cloud Migration SOW` |
| Scalar number | `{pricing_amount}` | `48000` |
| Loop start | `{#items}` | — |
| Loop end | `{/items}` | — |
| Loop item field | `{text}` or `{name}` | depends on array |

> **Word tip:** Type the entire tag in one run. If Word splits `{project_title}` across
> multiple XML runs (common after autocorrect), the tag won't be recognised.
> Use a plain-text content control or paste as unformatted text.

---

## Available Placeholders

### Scalars (use anywhere in the document)

| Placeholder | Description |
|-------------|-------------|
| `{project_title}` | Full project title |
| `{client_name}` | Client organisation name |
| `{overview}` | 2–4 sentence project overview |
| `{pricing_model}` | `fixed`, `tm`, or `retainer` |
| `{pricing_amount}` | Numeric amount (no currency symbol) |
| `{pricing_currency}` | Currency code e.g. `USD` |
| `{pricing_notes}` | Payment terms / notes |

### Loop Arrays

Use loop tags to render bullet lists. Place the loop tags in separate paragraphs.

#### Objectives, Scope, Assumptions, Terms
```
{#objectives}
{text}
{/objectives}
```
Each item exposes a single `{text}` field.

#### Deliverables
```
{#deliverables}
{name}
{description}
Acceptance Criteria: {acceptance_criteria}
{/deliverables}
```

#### Timeline
```
{#timeline}
{milestone}: {eta}
{/timeline}
```

#### Roles & Responsibilities (nested loop)
```
{#roles_responsibilities}
Role: {role}
{#responsibilities}
  - {text}
{/responsibilities}
{/roles_responsibilities}
```

#### Risks
```
{#risks}
Risk: {risk}
Mitigation: {mitigation}
{/risks}
```

---

## Creating a Template in Word

1. Open Word and design your letterhead, section headings, and layout.
2. Insert the placeholders above in the appropriate locations.
3. Save as `.docx` (not `.doc`).
4. Upload to the designated SharePoint library.
5. Copy the **driveItem ID** from Graph Explorer or the SharePoint file URL.
6. Register the template in the SOW Factory admin UI with that driveItem ID.

### Getting the driveItem ID

In SharePoint, select the file → **… → Details** → copy the **Item identifier** from the properties pane.

Alternatively via Graph Explorer:
```
GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/root/children
```
The `id` field on each item is the driveItem ID.

---

## Generating the Sample Template

Run the included script to produce `docs/sample-sow-template.docx`:

```bash
node scripts/gen-sample-template.js
```

This creates a plain functional template with all placeholders. Upload it to SharePoint
and use it as a starting point for branded versions.

---

## Intake Schema

Each template has an **Intake Schema** (JSON Schema) that drives the form shown to users.
The schema must be a `type: object` with `properties`.

### Supported field types

| JSON Schema type | Rendered as |
|-----------------|-------------|
| `string` | Text input |
| `string` with `format: "textarea"` | Multi-line textarea |
| `string` with `enum: [...]` | Dropdown / select |
| `number` / `integer` | Number input |
| `boolean` | Checkbox |
| `object` (nested) | Fieldset / section group |

### Example schema

```json
{
  "type": "object",
  "title": "Project Details",
  "required": ["client_name", "project_type", "description"],
  "properties": {
    "client_name": {
      "type": "string",
      "title": "Client Name"
    },
    "project_type": {
      "type": "string",
      "title": "Project Type",
      "enum": ["Implementation", "Migration", "Assessment", "Support"]
    },
    "budget_usd": {
      "type": "number",
      "title": "Budget (USD)"
    },
    "description": {
      "type": "string",
      "title": "Project Description",
      "format": "textarea",
      "description": "Goals, current state, and desired outcomes"
    },
    "billing": {
      "type": "object",
      "title": "Billing Preferences",
      "properties": {
        "model": {
          "type": "string",
          "enum": ["fixed", "tm", "retainer"],
          "title": "Billing Model"
        },
        "payment_terms": {
          "type": "string",
          "title": "Payment Terms",
          "enum": ["Net 30", "Net 45", "Net 60", "50% upfront"]
        }
      }
    }
  }
}
```
