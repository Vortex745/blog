import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                post: {
                    select: { userId: true }
                }
            }
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        // Check permissions: either the comment author OR the post author OR admin can delete
        const isCommentAuthor = comment.userId === user.id;
        const isPostAuthor = comment.post.userId === user.id;
        const isAdminUser = user.role === 'admin';

        if (!isCommentAuthor && !isPostAuthor && !isAdminUser) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.comment.delete({
            where: { id: commentId }
        });

        return NextResponse.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
