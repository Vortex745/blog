import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

export interface AuthUser {
    id: number;
    email: string;
    username: string;
    role?: string;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (decoded && decoded.userId) {
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId }
            });

            if (user) {
                return {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                };
            }
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
