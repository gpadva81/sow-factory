import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const perPage = 20;

  // Admins can see all SOWs; members see only their own
  const where =
    session.user.role === 'ADMIN'
      ? {}
      : { createdById: session.user.id };

  const [sows, total] = await Promise.all([
    prisma.sOW.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.sOW.count({ where }),
  ]);

  return NextResponse.json({ sows, total, page, perPage });
}
