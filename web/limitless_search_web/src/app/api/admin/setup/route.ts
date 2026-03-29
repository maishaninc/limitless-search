import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSession, createAdminUser, getAdminUserCount } from "@/lib/admin-auth";
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
  if (adminUserCount > 0) {
    return NextResponse.json({ message: "Admin already initialized" }, { status: 409 });
  }

  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    confirmPassword?: string;
    captchaToken?: string;
  };

  const email = payload.email?.trim() || "";
  const password = payload.password || "";
  const confirmPassword = payload.confirmPassword || "";

  if (!email || !password || !confirmPassword) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
  }

  const captcha = await verifyCaptchaToken(request, payload.captchaToken);
  if (!captcha.ok) {
    return NextResponse.json(
      { message: captcha.message, detail: "detail" in captcha ? captcha.detail : [] },
      { status: 400 },
    );
  }

  try {
    const user = await createAdminUser(email, password);
    const session = await createAdminSession(user.id, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("cf-connecting-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      ok: true,
      user,
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, session.token, cookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize admin";
    return NextResponse.json({ message }, { status: 500 });
  }
}
