"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, LayoutDashboard, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

type AdminShellProps = {
  title: string;
  description: string;
  currentUserEmail?: string;
  children: ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/rankings", label: "AI Rankings", icon: BarChart3 },
];

export function AdminShell({ title, description, currentUserEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col rounded-[28px] border border-neutral-200/80 bg-white/88 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
      <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-neutral-900 dark:text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Admin</div>
          <div className="text-lg font-black tracking-tight">FreeAnime Console</div>
        </div>
      </Link>

      <div className="mt-8 text-xs uppercase tracking-[0.28em] text-neutral-400">Navigation</div>
      <nav className="mt-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="text-sm font-semibold">Current Stage</div>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          Draft editing, manual creation, cloning, publishing, and admin route protection now run through SQLite-backed admin APIs.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_transparent_42%),linear-gradient(180deg,#f5f5f4_0%,#ffffff_45%,#f5f5f4_100%)] px-4 py-5 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.07),_transparent_32%),linear-gradient(180deg,#050505_0%,#0a0a0a_45%,#050505_100%)]">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <div className="space-y-5">
          <header className="flex items-center justify-between rounded-[28px] border border-neutral-200/80 bg-white/88 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Admin Console</p>
                <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{title}</h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUserEmail ? (
                <div className="hidden text-right md:block">
                  <div className="text-xs uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Current Admin</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">{currentUserEmail}</div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 text-neutral-700 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="hidden md:block">
                <AdminLogoutButton />
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 px-4 py-5 lg:hidden"
          >
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="flex h-full max-w-sm flex-col"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
