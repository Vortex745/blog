import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const categorySchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name must be 20 characters or less"),
});

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { id: 'asc' },
            include: {
                _count: {
                    select: { posts: true }
                }
            }
        });
        return NextResponse.json(categories);
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
        const validation = categorySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { name } = validation.data;

        const existing = await prisma.category.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
        }

        const category = await prisma.category.create({
            data: { name }
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
