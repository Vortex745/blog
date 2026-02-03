import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';

// Get About info (Public or specified user)
// Query param: username (optional, if NOT provided, try to get current user or default)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    try {
        let user;
        if (username) {
            user = await prisma.user.findUnique({ where: { username } });
        } else {
            // If no username, try to get the first user (Site Owner) or authenticated user
            // For a personal blog, usually we want the "Owner's" about page.
            // Let's assume the first user created is the owner for simplicity, 
            // or we might require a username.
            // Let's fallback to returning the first user if exists.
            user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
        }

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const about = await prisma.about.findUnique({
            where: { userId: user.id },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                        avatar: true,
                        // Add other fields if User model has them (e.g. social links)
                    }
                }
            }
        });

        // Even if no about record, we might want to return user info so the frontend can show "No bio yet"
        if (!about) {
            return NextResponse.json({
                content: '',
                user: {
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        }

        return NextResponse.json(about);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Update About info (Protected)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Restrict About page updates to Admin only
        if (!isAdmin(user.username)) {
            return NextResponse.json({ error: 'Permission denied: View only mode' }, { status: 403 });
        }

        const body = await req.json();
        const { content } = body;

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const about = await prisma.about.upsert({
            where: { userId: user.id },
            update: { content },
            create: {
                userId: user.id,
                content
            }
        });

        return NextResponse.json(about);
    } catch (error) {
        console.error("Error updating about:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
