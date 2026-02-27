# SOW Factory – How to Use

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Docker + Docker Compose | any recent |
| pnpm / npm / yarn | any |

---

## 1. Initial Setup

### Clone & install

```bash
git clone <your-repo-url> sow-factory
cd sow-factory
npm install
```

### Copy and fill in environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. For a local dev run with no Azure, set:
```
MOCK_SHAREPOINT=true
```
This lets you run the full generate flow without SharePoint credentials.
The app will return a mock URL instead of a real SharePoint link.

**You still need a real `OPENAI_API_KEY`** for LLM generation.

---

## 2. Start the Database

```bash
docker compose up -d
```

Postgres will be available on `localhost:5432`.

---

## 3. Run Prisma Migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables and generates the Prisma Client.

To open Prisma Studio (database browser):

```bash
npx prisma studio
```

---

## 4. Start the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 5. Configure Azure AD (Production)

### App Registration

1. In Azure Portal → **Azure Active Directory** → **App registrations** → **New registration**
2. Name: `SOW Factory`
3. Supported account types: single-tenant (your org)
4. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (dev)

### API Permissions

Add these **Application** permissions (not Delegated) for Graph API:

| Permission | Why |
|------------|-----|
| `Sites.Selected` | Read/write to specific SharePoint site only |
| `Files.ReadWrite.All` (scoped) | Upload generated DOCX |

> **Least privilege**: Use `Sites.Selected` and grant access only to the specific site
> via the Graph API or SharePoint admin centre.

Grant admin consent after adding permissions.

### Client Secret

Generate a client secret → copy to `AZURE_CLIENT_SECRET`.

### Granting Sites.Selected access

After adding the `Sites.Selected` permission, you must explicitly grant access to a site:

```http
POST https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
Content-Type: application/json

{
  "roles": ["write"],
  "grantedToIdentities": [{
    "application": {
      "id": "{AZURE_CLIENT_ID}",
      "displayName": "SOW Factory"
    }
  }]
}
```

### NextAuth Secret

```bash
openssl rand -base64 32
# paste into NEXTAUTH_SECRET
```

---

## 6. Admin: Create Your First Template

1. Sign in at `/login`
2. Go to **Templates** → **+ New Template**
3. Fill in:
   - **Template Name** – e.g. "Fixed-Price Services"
   - **SharePoint Site ID** – from Graph Explorer
   - **Drive ID** – from Graph Explorer
   - **Template File ID** – driveItem ID of your `.docx` template
   - **Output Folder ID** – driveItem ID of the folder for generated SOWs
   - **Intake Schema** – paste your JSON Schema (see `docs/template-authoring.md`)

### Promoting a user to Admin

Use Prisma Studio or a direct SQL query:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@company.com';
```

---

## 7. Generating a SOW

1. Go to **Templates** and select a template
2. Fill in the intake form
3. Click **Generate SOW**
4. The app will:
   - Validate your inputs
   - Call the OpenAI API to generate structured SOW content
   - Merge the content into the Word template
   - Upload the result to SharePoint
   - Return a link to the generated document
5. You'll be redirected to the SOW detail page

---

## 8. Audit Log

All generation events, SharePoint uploads, and external API calls are logged to the `Log` table.

View logs via Prisma Studio or:

```sql
SELECT * FROM "Log" ORDER BY "createdAt" DESC LIMIT 50;
```

---

## 9. Phase 2: Autotask Integration

The Autotask module is scaffolded at `/api/autotask/contracts`.

To enable it:
1. Set `AUTOTASK_BASE_URL`, `AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, `AUTOTASK_INTEGRATION_CODE` in `.env`
2. Hit `GET /api/autotask/contracts?accountId=<id>` (admin only)
3. Extend `lib/autotask/metrics.ts` to feed contract data into LLM prompts

---

## Project Structure

```
sow-factory/
├── app/                   # Next.js App Router (UI + API routes)
│   ├── api/               # Route handlers
│   ├── (auth)/login/      # Login page
│   └── (protected)/       # Authenticated pages
├── components/            # Shared React components
│   └── forms/             # DynamicIntakeForm renderer
├── lib/                   # Server-side services
│   ├── auth/              # NextAuth config
│   ├── audit/             # Audit logger
│   ├── autotask/          # Autotask REST client (Phase 2)
│   ├── db/                # Prisma client singleton
│   ├── docx/              # docxtemplater merge engine
│   ├── graph/             # Microsoft Graph / SharePoint client
│   ├── llm/               # LLM provider interface + OpenAI impl
│   └── validation/        # JSON Schema → Zod intake validator
├── prisma/                # Schema + migrations
├── docs/                  # This file + template authoring guide
└── scripts/               # Utility scripts
```
