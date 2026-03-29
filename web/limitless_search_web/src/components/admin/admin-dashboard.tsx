import { ArrowRight, Clock3, FileStack, Sparkles } from "lucide-react";
import type { AdminDashboardPreview } from "@/lib/admin-preview";

type AdminDashboardProps = {
  preview: AdminDashboardPreview;
};

export function AdminDashboard({ preview }: AdminDashboardProps) {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {preview.summary.map((item) => (
          <article
            key={item.label}
            className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">{item.label}</p>
            <div className="mt-3 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{item.value}</div>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Admin Workflow</h2>
            </div>
            <div className="hidden rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 md:inline-flex">
              Versioned Control
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {preview.activities.map((activity) => (
              <div
                key={`${activity.title}-${activity.time}`}
                className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-neutral-900 dark:text-white">{activity.title}</div>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{activity.detail}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.22em] text-neutral-400">
                    <Clock3 className="h-4 w-4" />
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-5">
          <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs uppercase tracking-[0.24em] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <Sparkles className="h-4 w-4" />
              Suggested Flow
            </div>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              <li>1. AI creates a new version and never overwrites the live one directly.</li>
              <li>2. An admin clones it into a draft and edits order, score, and titles.</li>
              <li>3. Publishing switches the public `/rankings` page to the approved version.</li>
            </ol>
          </article>

          <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
            <div className="flex items-center gap-3">
              <FileStack className="h-5 w-5" />
              <h3 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">Next Integration</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              <li>Admin setup and session storage in SQLite.</li>
              <li>Protected mutations for ranking drafts.</li>
              <li>Save, publish, rollback, and version comparison.</li>
            </ul>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              The layout is ready for backend actions
              <ArrowRight className="h-4 w-4" />
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
