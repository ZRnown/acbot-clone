import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "acbot-secret-key-change-in-production";

/**
 * Edge-safe JWT verification using Web Crypto API.
 * Verifies the HMAC-SHA256 signature (compatible with jsonwebtoken's HS256).
 */
async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to check algorithm
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf-8")
    );
    if (header.alg !== "HS256") return false;

    // Decode payload to check expiry
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;
    if (!payload.id) return false;

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // The signed data is header.payload
    const signedData = encoder.encode(`${headerB64}.${payloadB64}`);

    // Decode the signature from base64url
    const signature = Buffer.from(signatureB64, "base64url");

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      signedData
    );

    return isValid;
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
    pathname.startsWith("/api/")
  ) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const valid = await verifyTokenEdge(token);
    if (!valid) {
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
