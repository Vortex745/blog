import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPostSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    summary: z.string().optional(),
    cover: z.string().optional(),
    status: z.enum(['draft', 'published']).default('draft'),
    type: z.enum(['note', 'project', 'life', 'pitfall']).default('note'),
    category_ids: z.array(z.number()).optional(),
    tag_ids: z.array(z.number()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }



        const body = await req.json();
        const validation = createPostSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { category_ids, tag_ids, ...data } = validation.data;

        const post = await prisma.post.create({
            data: {
                ...data,
                userId: user.id,
                categories: category_ids ? {
                    create: category_ids.map(id => ({
                        category: { connect: { id } }
                    }))
                } : undefined,
                tags: tag_ids ? {
                    create: tag_ids.map(id => ({
                        tag: { connect: { id } }
                    }))
                } : undefined,
            },
        });

        return NextResponse.json(post, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const type = searchParams.get('type');

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (keyword) {
        where.title = { contains: keyword, mode: 'insensitive' };
    }

    if (category) {
        where.categories = {
            some: {
                category: {
                    name: category
                }
            }
        };
    }

    if (type) {
        where.type = type;
    }

    try {
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { id: true, username: true, avatar: true } },
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } }
                }
            }),
            prisma.post.count({ where })
        ]);

        return NextResponse.json({ data: posts, total, page, pageSize });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
