import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware - skip authentication for now
// We'll add proper auth after fixing the Edge Runtime issues
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
