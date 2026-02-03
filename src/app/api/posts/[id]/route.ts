import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updatePostSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    summary: z.string().optional(),
    cover: z.string().optional(),
    status: z.enum(['draft', 'published']).optional(),
    category_ids: z.array(z.number()).optional(),
    tag_ids: z.array(z.number()).optional(),
    type: z.string().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const post = await prisma.post.update({
            where: { id: postId },
            data: { views: { increment: 1 } },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                categories: { include: { category: true } },
                tags: { include: { tag: true } }
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id);

    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existingPost = await prisma.post.findUnique({ where: { id: postId } });
        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (existingPost.userId !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You can only edit your own posts' }, { status: 403 });
        }

        const body = await req.json();
        const validation = updatePostSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { category_ids, tag_ids, ...data } = validation.data;

        // Transaction to update relations if needed
        const updatedPost = await prisma.$transaction(async (tx) => {
            if (category_ids) {
                await tx.postCategory.deleteMany({ where: { postId } });
                await tx.postCategory.createMany({
                    data: category_ids.map(cid => ({ postId, categoryId: cid }))
                });
            }

            if (tag_ids) {
                await tx.postTag.deleteMany({ where: { postId } });
                await tx.postTag.createMany({
                    data: tag_ids.map(tid => ({ postId, tagId: tid }))
                });
            }

            return await tx.post.update({
                where: { id: postId },
                data
            });
        });

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const postId = parseInt(id);

    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existingPost = await prisma.post.findUnique({ where: { id: postId } });
        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (existingPost.userId !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You can only delete your own posts' }, { status: 403 });
        }

        await prisma.postCategory.deleteMany({ where: { postId } });
        await prisma.postTag.deleteMany({ where: { postId } });
        await prisma.comment.deleteMany({ where: { postId } });

        await prisma.post.delete({ where: { id: postId } });

        return NextResponse.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
