import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { createRankingItem, deleteRankingItem, moveRankingItem, updateRankingItem } from "@/lib/admin-rankings";
import type { RankingKey } from "@/lib/rankings";

const rankingKeys: RankingKey[] = ["yearly", "monthly", "daily", "bili_rank"];

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    versionId?: number | string;
    listKey?: string;
  };

  const versionId = Number(payload.versionId);
  const listKey = payload.listKey as RankingKey | undefined;

  if (!Number.isInteger(versionId) || versionId <= 0) {
    return NextResponse.json({ message: "Draft version id is required" }, { status: 400 });
  }
  if (!listKey || !rankingKeys.includes(listKey)) {
    return NextResponse.json({ message: "Ranking group is invalid" }, { status: 400 });
  }

  try {
    const itemId = await createRankingItem({
      versionId,
      listKey,
    });

    return NextResponse.json({
      ok: true,
      itemId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create item";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    itemId?: number | string;
    title?: string;
    query?: string;
    score?: number | string;
    displayTime?: string;
    sourceUrl?: string;
    hidden?: boolean;
  };

  const itemId = Number(payload.itemId);
  const title = payload.title?.trim() || "";
  const query = payload.query?.trim() || "";
  const score = Number(payload.score);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ message: "Item id is required" }, { status: 400 });
  }
  if (!title || !query) {
    return NextResponse.json({ message: "Title and query are required" }, { status: 400 });
  }
  if (!Number.isFinite(score)) {
    return NextResponse.json({ message: "Score must be a valid number" }, { status: 400 });
  }

  try {
    await updateRankingItem({
      itemId,
      patch: {
        title,
        query,
        score,
        displayTime: payload.displayTime?.trim() || undefined,
        sourceUrl: payload.sourceUrl?.trim() || undefined,
        hidden: Boolean(payload.hidden),
      },
    });

    return NextResponse.json({
      ok: true,
      itemId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    itemId?: number | string;
  };

  const itemId = Number(payload.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ message: "Item id is required" }, { status: 400 });
  }

  try {
    await deleteRankingItem({ itemId });
    return NextResponse.json({
      ok: true,
      itemId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete item";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const currentUser = await getCurrentAdminUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    itemId?: number | string;
    direction?: string;
  };

  const itemId = Number(payload.itemId);
  const direction = payload.direction === "down" ? "down" : payload.direction === "up" ? "up" : null;

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ message: "Item id is required" }, { status: 400 });
  }
  if (!direction) {
    return NextResponse.json({ message: "Direction must be up or down" }, { status: 400 });
  }

  try {
    const moved = await moveRankingItem({
      itemId,
      direction,
    });

    return NextResponse.json({
      ok: true,
      itemId,
      moved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder item";
    return NextResponse.json({ message }, { status: 500 });
  }
}
