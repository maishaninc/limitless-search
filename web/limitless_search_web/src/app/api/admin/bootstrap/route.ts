import { NextResponse } from "next/server";
import { getAdminBootstrapData } from "@/lib/admin-service";

export async function GET() {
  const bootstrap = await getAdminBootstrapData();
  return NextResponse.json(bootstrap);
}
