import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { cloneRankingVersionToDraft } from "@/lib/admin-rankings";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    versionId?: number | string;
  };

  const versionId = Number(payload.versionId);
  if (!Number.isInteger(versionId) || versionId <= 0) {
    return NextResponse.json({ message: "Version id is required" }, { status: 400 });
  }

  try {
    const draftVersionId = await cloneRankingVersionToDraft({
      versionId,
      createdByEmail: currentUser.email,
    });

    return NextResponse.json({
      ok: true,
      versionId: draftVersionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clone version";
    return NextResponse.json({ message }, { status: 500 });
  }
}
