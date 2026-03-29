"use client";

import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
    window.location.href = "/admin";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}
