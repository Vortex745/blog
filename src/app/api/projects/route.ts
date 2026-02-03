import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createProjectSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    techStack: z.string().optional(),
    repoUrl: z.string().optional(),
    demoUrl: z.string().optional(),
    cover: z.string().optional(),
    projectType: z.enum(['web', 'mobile', 'desktop', 'cli', 'library', 'game', 'other']).default('web'),
    isPinned: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const isPinned = searchParams.get('isPinned');
    const projectType = searchParams.get('projectType');

    const where: any = {};

    if (isPinned === 'true') {
        where.isPinned = true;
    }

    if (projectType && projectType !== 'all') {
        where.projectType = projectType;
    }

    try {
        const projects = await prisma.project.findMany({
            where,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                author: { select: { id: true, username: true } }
            }
        });

        return NextResponse.json({ data: projects });
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
        const validation = createProjectSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                ...validation.data,
                userId: user.id
            }
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
