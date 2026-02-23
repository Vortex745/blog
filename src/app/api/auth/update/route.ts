import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';


export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }



        const userId = user.id;

        const body = await req.json();
        const { username, avatar, tagline } = body;

        // Validation
        if (!username || username.trim().length < 2) {
            return NextResponse.json({ error: '用户名至少需要2个字符' }, { status: 400 });
        }

        // Check if username exists (excluding current user)
        const existingUser = await prisma.user.findFirst({
            where: {
                username: username,
                id: { not: userId }
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: '用户名已被占用' }, { status: 400 });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                avatar,
                tagline
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                tagline: true,
                role: true
            }
        });

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
