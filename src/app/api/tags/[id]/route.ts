import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const tagSchema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name must be 20 characters or less"),
});

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const tagId = parseInt(id);

    if (isNaN(tagId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

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

        const existingTag = await prisma.tag.findUnique({
            where: { id: tagId }
        });

        if (!existingTag) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        if (existingTag.name !== name) {
            const duplicate = await prisma.tag.findUnique({
                where: { name }
            });
            if (duplicate) {
                return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
            }
        }

        const updatedTag = await prisma.tag.update({
            where: { id: tagId },
            data: { name }
        });

        return NextResponse.json(updatedTag);
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
    const tagId = parseInt(id);

    if (isNaN(tagId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const existingTag = await prisma.tag.findUnique({
            where: { id: tagId }
        });

        if (!existingTag) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        // Attempt to delete
        // Note: This will fail if there are related posts (foreign key constraint)
        // We catch the P2003 error to give a friendly message
        await prisma.tag.delete({
            where: { id: tagId }
        });

        return NextResponse.json({ message: 'Tag deleted successfully' });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({
                error: 'Cannot delete tag because it is used by one or more posts.'
            }, { status: 409 });
        }
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
