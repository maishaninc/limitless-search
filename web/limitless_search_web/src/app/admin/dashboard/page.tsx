import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminDashboardData } from "@/lib/admin-service";

export const metadata: Metadata = {
  title: "Admin Overview",
  description: "Limitless Search admin overview page.",
};

export default async function AdminDashboardPage() {
  const currentUser = await requireAdminUser();
  const preview = await getAdminDashboardData();

  return (
    <AdminShell
      title="Admin Overview"
      description="Review ranking versions, activity, and the publish workflow from one place."
      currentUserEmail={currentUser.email}
    >
      <AdminDashboard preview={preview} />
    </AdminShell>
  );
}
