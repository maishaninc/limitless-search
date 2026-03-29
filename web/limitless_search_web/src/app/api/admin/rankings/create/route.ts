import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { createManualRankingDraft } from "@/lib/admin-rankings";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    name?: string;
    year?: number | string;
    month?: number | string;
  };

  const name = payload.name?.trim() || "";
  const year = Number(payload.year);
  const month = Number(payload.month);

  if (!name) {
    return NextResponse.json({ message: "Version name is required" }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ message: "Year must be a valid integer" }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ message: "Month must be between 1 and 12" }, { status: 400 });
  }

  try {
    const versionId = await createManualRankingDraft({
      name,
      year,
      month,
      createdByEmail: currentUser.email,
    });

    return NextResponse.json({
      ok: true,
      versionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create draft";
    return NextResponse.json({ message }, { status: 500 });
  }
}
