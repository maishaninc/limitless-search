import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
