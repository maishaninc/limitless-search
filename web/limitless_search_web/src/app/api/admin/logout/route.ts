import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, deleteAdminSession } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await deleteAdminSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
