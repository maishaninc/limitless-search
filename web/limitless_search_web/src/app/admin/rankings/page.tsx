import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin-auth";
import { AdminRankingsManager } from "@/components/admin/admin-rankings-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminRankingWorkspace } from "@/lib/admin-service";

export const metadata: Metadata = {
  title: "AI Ranking Management",
  description: "Manage AI ranking versions, drafts, publishing, and creation flow.",
};

export default async function AdminRankingsPage() {
  const currentUser = await requireAdminUser();
  const workspace = await getAdminRankingWorkspace();

  return (
    <AdminShell
      title="AI Rankings"
      description="Edit drafts, inspect AI runs, and prepare publish actions backed by SQLite."
      currentUserEmail={currentUser.email}
    >
      <AdminRankingsManager workspace={workspace} />
    </AdminShell>
  );
}
