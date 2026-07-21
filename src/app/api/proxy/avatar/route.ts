import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["img.kookapp.cn", "www.kookapp.cn"]);

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("missing url", { status: 400 });
  let url: URL;
  try { url = new URL(rawUrl); } catch { return new NextResponse("invalid url", { status: 400 }); }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return new NextResponse("blocked host", { status: 403 });
  }
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) return new NextResponse("upstream image unavailable", { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
