import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

const SetupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** POST /api/setup – creates the first admin account. Locked after first user exists. */
export async function POST(req: NextRequest) {
  // Guard: only allow if no users exist yet
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return NextResponse.json(
      { error: 'Setup is already complete. Sign in at /login.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: hashed,
      role: 'ADMIN',
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

/** GET /api/setup – returns whether setup is needed */
export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({ setupRequired: userCount === 0 });
}
