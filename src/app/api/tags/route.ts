import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const tagSchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name must be 20 characters or less"),
});

export async function GET() {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { id: 'asc' },
            include: {
                _count: {
                    select: { posts: true }
                }
            }
        });
        return NextResponse.json(tags);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validation = tagSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { name } = validation.data;

        const existing = await prisma.tag.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
        }

        const tag = await prisma.tag.create({
            data: { name }
        });

        return NextResponse.json(tag, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
