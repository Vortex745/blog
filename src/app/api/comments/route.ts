import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createCommentSchema = z.object({
    post_id: z.number({ required_error: "Post ID is required", invalid_type_error: "Post ID must be a number" }),
    content: z.string({ required_error: "Content is required" }).min(1, "Content is required").max(300, "Content must be 300 characters or less"),
});

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const postIdParam = searchParams.get('post_id');

    if (!postIdParam) {
        return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const postId = parseInt(postIdParam);
    if (isNaN(postId)) {
        return NextResponse.json({ error: 'Invalid Post ID' }, { status: 400 });
    }

    try {
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const comments = await prisma.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error(error);
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
        const validation = createCommentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { post_id, content } = validation.data;

        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: post_id }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId: post_id,
                userId: user.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
