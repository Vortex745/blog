import { NextResponse } from 'next/server';

export async function login(req: Request) {
    return NextResponse.json({ message: 'Login controller' });
}

export async function register(req: Request) {
    return NextResponse.json({ message: 'Register controller' });
}
