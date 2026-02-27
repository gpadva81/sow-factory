import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── Demo users ─────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('demo1234!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@demo.com',
      password,
      role: 'MEMBER',
    },
  });

  // ── Demo template ──────────────────────────────────────────────────────────
  // Uses placeholder SharePoint IDs – works because MOCK_SHAREPOINT=true
  await prisma.template.upsert({
    where: { id: 'demo-template-001' },
    update: {},
    create: {
      id: 'demo-template-001',
      name: 'Professional Services — Fixed Price',
      description:
        'Standard fixed-price SOW for implementation, migration, or consulting engagements.',
      sharepointFileId: 'mock-template-file-id',
      sharepointSiteId: 'mock-site-id',
      sharepointDriveId: 'mock-drive-id',
      outputFolderId: 'mock-output-folder-id',
      createdById: admin.id,
      intakeSchemaJson: {
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
            enum: ['Implementation', 'Migration', 'Assessment', 'Security Audit', 'Managed Services'],
          },
          project_description: {
            type: 'string',
            title: 'Project Description',
            format: 'textarea',
            description:
              'Describe the project goals, current state, and what needs to be delivered.',
          },
          budget_usd: {
            type: 'number',
            title: 'Budget (USD)',
            description: 'Estimated total project budget',
          },
          timeline_weeks: {
            type: 'number',
            title: 'Timeline (weeks)',
            description: 'Expected project duration in weeks',
          },
          billing_model: {
            type: 'string',
            title: 'Billing Model',
            enum: ['fixed', 'tm', 'retainer'],
          },
          include_training: {
            type: 'boolean',
            title: 'Include End-User Training',
            description: 'Should user training be included in scope?',
          },
          special_requirements: {
            type: 'string',
            title: 'Special Requirements',
            format: 'textarea',
            description: 'Compliance, security, or other special requirements (optional)',
          },
        },
      },
    },
  });

  console.log('✓ Demo admin:  admin@demo.com  /  demo1234!');
  console.log('✓ Demo user:   user@demo.com   /  demo1234!');
  console.log('✓ Demo template seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
