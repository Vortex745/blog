import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

export interface AuthUser {
    id: number;
    email: string;
    username: string;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Optional: Verify user still exists in DB
        // const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        // return user;

        // For performance, trusting the token payload might be enough if expiration is short
        if (decoded && decoded.userId) {
            return {
                id: decoded.userId,
                email: decoded.email,
                username: decoded.username
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

export function signToken(user: { id: number; email: string; username: string }) {
    return jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}
