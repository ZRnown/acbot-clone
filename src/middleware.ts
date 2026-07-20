import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "acbot-secret-key-change-in-production";

function verifyTokenEdge(token: string): boolean {
  try {
    // Simple JWT structure check without jwt library (Edge-safe)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;

    return !!payload.id;
  } catch {
    return false;
  }
}

const PUBLIC_PATHS = ["/", "/login", "/register"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API routes
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Check auth for protected routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/bots") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/api/")
  ) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!verifyTokenEdge(token)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "登录已过期" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
