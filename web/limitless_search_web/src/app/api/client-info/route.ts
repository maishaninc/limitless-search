import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("cf-connecting-ip") ||
    "";

  const country =
    request.headers.get("x-country") ||
    request.headers.get("x-geo-country") ||
    request.headers.get("cf-ipcountry") ||
    "";

  return NextResponse.json({
    ip: ip || "unknown",
    country: country || "unknown",
  });
}
