import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const posts = await prisma.post.findMany({
            where: { status: 'published' },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by Year -> Month
        const grouped: Record<string, Record<string, typeof posts>> = {};

        posts.forEach(post => {
            const date = new Date(post.createdAt);
            const year = date.getFullYear().toString();
            // Get month with leading zero (01-12)
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            if (!grouped[year]) {
                grouped[year] = {};
            }
            if (!grouped[year][month]) {
                grouped[year][month] = [];
            }
            grouped[year][month].push(post);
        });

        return NextResponse.json(grouped);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
