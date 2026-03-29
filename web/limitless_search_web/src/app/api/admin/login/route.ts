import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, authenticateAdmin, getAdminUserCount } from "@/lib/admin-auth";
import { verifyCaptchaToken } from "@/lib/captcha";

const cookieOptions = (expiresAt: string) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: new Date(expiresAt),
});

export async function POST(request: NextRequest) {
  const adminUserCount = await getAdminUserCount();
  if (adminUserCount === 0) {
    return NextResponse.json({ message: "Admin setup required" }, { status: 409 });
  }

  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    captchaToken?: string;
  };

  const email = payload.email?.trim() || "";
  const password = payload.password || "";

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const captcha = await verifyCaptchaToken(request, payload.captchaToken);
  if (!captcha.ok) {
    return NextResponse.json(
      { message: captcha.message, detail: "detail" in captcha ? captcha.detail : [] },
      { status: 400 },
    );
  }

  try {
    const result = await authenticateAdmin(email, password, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("cf-connecting-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      ok: true,
      user: result.user,
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, result.session.token, cookieOptions(result.session.expiresAt));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ message }, { status: 401 });
  }
}
