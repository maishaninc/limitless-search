import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreRankings, rankingsEnabled } from "@/lib/rankings";

export const dynamic = "force-dynamic";

const isAuthorized = (request: NextRequest) => {
  const expected = process.env.AI_RANKINGS_SYNC_TOKEN || "";
  if (!expected) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const header = request.headers.get("x-rankings-token") || "";
  return bearer === expected || header === expected;
};

export async function POST(request: NextRequest) {
  if (!rankingsEnabled()) {
    return NextResponse.json({ message: "Rankings feature disabled" }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const dataset = await generateAndStoreRankings();
    return NextResponse.json({ ok: true, generatedAt: dataset.generatedAt, totals: Object.fromEntries(Object.entries(dataset.rankings).map(([key, value]) => [key, value.total])) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync rankings";
    return NextResponse.json({ message }, { status: 500 });
  }
}
