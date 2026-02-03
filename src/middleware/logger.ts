import { NextRequest, NextResponse } from 'next/server';

export function logger(req: NextRequest) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    return NextResponse.next();
}
