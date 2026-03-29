"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  History,
  PencilLine,
  Plus,
  Rocket,
  Save,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import type { AdminRankingEntry, AdminRankingSection, AdminRankingWorkspace } from "@/lib/admin-preview";

type TabKey = "published" | "draft" | "versions" | "create";
type FeedbackTone = "success" | "error";

type AdminRankingsManagerProps = {
  workspace: AdminRankingWorkspace;
};

type EditableItemState = {
  id: string;
  title: string;
  query: string;
  score: string;
  displayTime: string;
  sourceUrl: string;
  hidden: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "versions", label: "Versions" },
  { key: "create", label: "Create" },
];

const statusClassName: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  generated: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

const feedbackClassName: Record<FeedbackTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
};

const createEditableItem = (item: AdminRankingEntry): EditableItemState => ({
  id: item.id,
  title: item.title,
  query: item.query,
  score: String(item.score),
  displayTime: item.displayTime || "",
  sourceUrl: item.sourceUrl || "",
  hidden: Boolean(item.hidden),
});

const isPersistedId = (value: string) => /^\d+$/.test(value);

const requestJson = async (url: string, init: RequestInit) => {
  const response = await fetch(url, init);
  const json = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(json.message || "Request failed.");
  }

  return json;
};

export function AdminRankingsManager({ workspace }: AdminRankingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>("draft");
  const [activeSection, setActiveSection] = useState<AdminRankingSection["key"]>("monthly");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(workspace.draft.id);
  const [editingItem, setEditingItem] = useState<EditableItemState | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [createName, setCreateName] = useState(`Manual ${workspace.currentPublished.name} Draft`);
  const [createYear, setCreateYear] = useState(String(workspace.versions[0]?.year || new Date().getFullYear()));
  const [createMonth, setCreateMonth] = useState(String(workspace.versions[0]?.month || new Date().getMonth() + 1));

  const draftSections = workspace.draft.sections;
  const sectionMap = useMemo(
    () => Object.fromEntries(draftSections.map((section) => [section.key, section])),
    [draftSections],
  ) as Record<AdminRankingSection["key"], AdminRankingSection>;
  const activeSectionData = sectionMap[activeSection] || draftSections[0];
  const selectedVersion =
    workspace.versions.find((version) => version.id === selectedVersionId) || workspace.versions[0];
  const latestAiVersion =
    workspace.versions.find((version) => version.sourceType === "ai") || null;
  const canEditDraft = isPersistedId(workspace.draft.id);
  const canClonePublished = isPersistedId(workspace.currentPublished.id);

  useEffect(() => {
    if (!activeSectionData && draftSections[0]) {
      setActiveSection(draftSections[0].key);
    }
  }, [activeSectionData, draftSections]);

  useEffect(() => {
    setSelectedVersionId((current) =>
      workspace.versions.some((version) => version.id === current) ? current : workspace.draft.id,
    );
  }, [workspace.draft.id, workspace.versions]);

  const refreshWorkspace = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runMutation = async (actionKey: string, action: () => Promise<void>) => {
    setBusyAction(actionKey);
    setFeedback(null);

    try {
      await action();
      refreshWorkspace();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Request failed.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleClone = async (versionId: string) => {
    await runMutation(`clone-${versionId}`, async () => {
      await requestJson("/api/admin/rankings/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          versionId: Number(versionId),
        }),
      });

      setActiveTab("draft");
      setFeedback({
        tone: "success",
        text: "Version cloned into a new draft.",
      });
    });
  };

  const handlePublish = async (versionId: string) => {
    await runMutation(`publish-${versionId}`, async () => {
      await requestJson("/api/admin/rankings/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          versionId: Number(versionId),
        }),
      });

      setActiveTab("published");
      setFeedback({
        tone: "success",
        text: "Published version synced to the live rankings dataset.",
      });
    });
  };

  const handleAddItem = async () => {
    await runMutation(`add-item-${activeSection}`, async () => {
      await requestJson("/api/admin/rankings/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          versionId: Number(workspace.draft.id),
          listKey: activeSection,
        }),
      });

      setFeedback({
        tone: "success",
        text: `Added a new item to ${activeSectionData?.title || activeSection}.`,
      });
    });
  };

  const handleCreateDraft = async () => {
    const name = createName.trim();
    const year = Number(createYear);
    const month = Number(createMonth);

    if (!name) {
      setFeedback({ tone: "error", text: "Enter a version name first." });
      return;
    }

    await runMutation("create-draft", async () => {
      await requestJson("/api/admin/rankings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          year,
          month,
        }),
      });

      setActiveTab("draft");
      setFeedback({
        tone: "success",
        text: "Created a new manual draft.",
      });
    });
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;

    const title = editingItem.title.trim();
    const query = editingItem.query.trim();
    const score = Number(editingItem.score);

    if (!title || !query) {
      setFeedback({ tone: "error", text: "Title and query are required." });
      return;
    }
    if (!Number.isFinite(score)) {
      setFeedback({ tone: "error", text: "Score must be a valid number." });
      return;
    }

    await runMutation(`save-item-${editingItem.id}`, async () => {
      await requestJson("/api/admin/rankings/item", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: Number(editingItem.id),
          title,
          query,
          score,
          displayTime: editingItem.displayTime.trim(),
          sourceUrl: editingItem.sourceUrl.trim(),
          hidden: editingItem.hidden,
        }),
      });

      setEditingItem(null);
      setFeedback({
        tone: "success",
        text: "Draft item updated.",
      });
    });
  };

  const handleMoveItem = async (itemId: string, direction: "up" | "down") => {
    await runMutation(`move-${itemId}-${direction}`, async () => {
      const result = (await requestJson("/api/admin/rankings/item", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: Number(itemId),
          direction,
        }),
      })) as { moved?: boolean };

      setFeedback({
        tone: "success",
        text: result.moved
          ? `Item moved ${direction}.`
          : `Item is already at the ${direction === "up" ? "top" : "bottom"}.`,
      });
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    await runMutation(`delete-${itemId}`, async () => {
      await requestJson("/api/admin/rankings/item", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: Number(itemId),
        }),
      });

      setEditingItem((current) => (current?.id === itemId ? null : current));
      setFeedback({
        tone: "success",
        text: "Draft item deleted.",
      });
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Workspace</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{workspace.draft.name}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              The console now writes draft edits into SQLite and can publish the chosen version back to the live JSON dataset used by the public rankings page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {feedback ? (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${feedbackClassName[feedback.tone]}`}>
            {feedback.text}
          </div>
        ) : null}
      </section>

      <AnimatePresence mode="wait">
        {activeTab === "published" ? (
          <motion.section
            key="published"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]"
          >
            <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Live State</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{workspace.currentPublished.name}</h3>
              <div className="mt-6 space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                <div>Generated at: {workspace.currentPublished.generatedAt}</div>
                <div>Published at: {workspace.currentPublished.publishedAt}</div>
                <div>Operator: {workspace.currentPublished.operator}</div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/rankings"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
                >
                  <Eye className="h-4 w-4" />
                  Preview Live Board
                </Link>
                <button
                  type="button"
                  onClick={() => void handleClone(workspace.currentPublished.id)}
                  disabled={!canClonePublished || Boolean(busyAction) || isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200"
                >
                  <Copy className="h-4 w-4" />
                  Clone to Draft
                </button>
              </div>
            </article>

            <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Display Structure</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {workspace.draft.sections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/55"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-neutral-900 dark:text-white">{section.title}</div>
                      {section.key === "bili_rank" ? <Tv className="h-4 w-4 text-neutral-500" /> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{section.description}</p>
                    <div className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">{section.items.length} draft items</div>
                  </div>
                ))}
              </div>
            </article>
          </motion.section>
        ) : null}

        {activeTab === "draft" && activeSectionData ? (
          <motion.section
            key="draft"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"
          >
            <aside className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Ranking Groups</p>
              <div className="mt-4 space-y-2">
                {draftSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full rounded-[22px] px-4 py-4 text-left transition-colors ${
                      activeSection === section.key
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    <div className="text-sm font-semibold">{section.title}</div>
                    <div className={`mt-1 text-xs leading-5 ${activeSection === section.key ? "opacity-80" : "text-neutral-500 dark:text-neutral-400"}`}>
                      {section.description}
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Draft Editor</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{activeSectionData.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{activeSectionData.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAddItem()}
                    disabled={!canEditDraft || Boolean(busyAction) || isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePublish(workspace.draft.id)}
                    disabled={!canEditDraft || Boolean(busyAction) || isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                  >
                    <Rocket className="h-4 w-4" />
                    Publish Draft
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-neutral-200 dark:border-neutral-800">
                <div className="grid grid-cols-[1.2fr_0.55fr_0.8fr_0.55fr_auto] gap-3 bg-neutral-50/90 px-5 py-3 text-xs uppercase tracking-[0.22em] text-neutral-500 dark:bg-neutral-900/70 dark:text-neutral-400">
                  <span>Item</span>
                  <span>Score</span>
                  <span>Query</span>
                  <span>Flags</span>
                  <span>Action</span>
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {activeSectionData.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1.2fr_0.55fr_0.8fr_0.55fr_auto] gap-3 px-5 py-4 text-sm text-neutral-700 dark:text-neutral-200"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-neutral-900 dark:text-white">{item.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[item.status]}`}>
                            {item.status === "published" ? "Live" : item.status === "draft" ? "Edited" : "Raw AI"}
                          </span>
                          {item.hidden ? (
                            <span className="inline-flex rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                              Hidden
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="font-semibold">{item.score.toFixed(1)}</div>
                      <div className="truncate text-neutral-500 dark:text-neutral-400">{item.query}</div>
                      <div className="text-xs uppercase tracking-[0.22em] text-neutral-400">{item.sourceType || "-"}</div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleMoveItem(item.id, "up")}
                          disabled={!isPersistedId(item.id) || Boolean(busyAction) || isPending}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold disabled:opacity-60 dark:border-neutral-800"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMoveItem(item.id, "down")}
                          disabled={!isPersistedId(item.id) || Boolean(busyAction) || isPending}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold disabled:opacity-60 dark:border-neutral-800"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(createEditableItem(item))}
                          disabled={!isPersistedId(item.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold disabled:opacity-60 dark:border-neutral-800"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(item.id)}
                          disabled={!isPersistedId(item.id) || Boolean(busyAction) || isPending}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-60 dark:border-red-500/25 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </motion.section>
        ) : null}

        {activeTab === "versions" ? (
          <motion.section
            key="versions"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"
          >
            <section className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5" />
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Versions and Runs</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    Each AI run, clone, and manual board is versioned. Publishing a version updates SQLite and writes the live JSON dataset for the public page.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {workspace.versions.map((version) => (
                  <div
                    key={version.id}
                    className={`rounded-[24px] border p-5 ${
                      selectedVersionId === version.id
                        ? "border-neutral-900 bg-neutral-100/90 dark:border-white dark:bg-neutral-900/80"
                        : "border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/55"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-neutral-900 dark:text-white">{version.name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            {version.source}
                          </span>
                          <span className="rounded-full bg-neutral-200 px-2.5 py-1 font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            {version.status}
                          </span>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                        <Clock3 className="h-4 w-4" />
                        {version.updatedAt}
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleClone(version.id)}
                        disabled={!isPersistedId(version.id) || Boolean(busyAction) || isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200"
                      >
                        <Copy className="h-4 w-4" />
                        Clone to Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionId(version.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePublish(version.id)}
                        disabled={!isPersistedId(version.id) || Boolean(busyAction) || isPending}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Publish This Version
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Version Details</p>
              {selectedVersion ? (
                <div className="mt-4 space-y-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  <div>
                    <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{selectedVersion.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {selectedVersion.source}
                      </span>
                      <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {selectedVersion.status}
                      </span>
                    </div>
                  </div>
                  <div>Period: {selectedVersion.year}-{String(selectedVersion.month).padStart(2, "0")}</div>
                  <div>Generated at: {selectedVersion.generatedAt || "-"}</div>
                  <div>Published at: {selectedVersion.publishedAt || "-"}</div>
                  <div>Operator: {selectedVersion.operator || "system"}</div>
                </div>
              ) : null}
            </aside>
          </motion.section>
        ) : null}

        {activeTab === "create" ? (
          <motion.section
            key="create"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-5 xl:grid-cols-2"
          >
            <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Create From Scratch</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                Use this for event boards, special themes, or a fully manual workflow when AI should not be used.
              </p>
              <div className="mt-6 grid gap-4">
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  placeholder="Version name, e.g. Summer 2026 Warmup"
                />
                <input
                  value={createYear}
                  onChange={(event) => setCreateYear(event.target.value)}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  placeholder="Year, e.g. 2026"
                />
                <input
                  value={createMonth}
                  onChange={(event) => setCreateMonth(event.target.value)}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  placeholder="Month, e.g. 7"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleCreateDraft()}
                disabled={Boolean(busyAction) || isPending}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                <Plus className="h-4 w-4" />
                Create Empty Draft
              </button>
            </article>

            <article className="rounded-[28px] border border-neutral-200/80 bg-white/88 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/84">
              <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Create From AI Output</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                Copy an AI version into a draft, review it, then publish it.
              </p>
              <div className="mt-6 rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/55">
                {latestAiVersion ? (
                  <>
                    <div className="text-base font-semibold text-neutral-900 dark:text-white">{latestAiVersion.name}</div>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      Generated at {latestAiVersion.generatedAt}. Cloning it will create a new editable draft and will not change the live version.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleClone(latestAiVersion.id)}
                      disabled={!isPersistedId(latestAiVersion.id) || Boolean(busyAction) || isPending}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <Copy className="h-4 w-4" />
                      Clone Into Draft
                    </button>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    No AI-generated version is available yet. Run the ranking sync first, then return here to clone it into a draft.
                  </p>
                )}
              </div>
            </article>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 px-4 py-6"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mx-auto max-w-2xl rounded-[32px] border border-neutral-200/80 bg-white/96 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/94"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Edit Draft Item</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{editingItem.title || "Draft Item"}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Title</label>
                  <input
                    value={editingItem.title}
                    onChange={(event) =>
                      setEditingItem((current) => (current ? { ...current, title: event.target.value } : current))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Query</label>
                  <input
                    value={editingItem.query}
                    onChange={(event) =>
                      setEditingItem((current) => (current ? { ...current, query: event.target.value } : current))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Score</label>
                  <input
                    value={editingItem.score}
                    onChange={(event) =>
                      setEditingItem((current) => (current ? { ...current, score: event.target.value } : current))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Display Time</label>
                  <input
                    value={editingItem.displayTime}
                    onChange={(event) =>
                      setEditingItem((current) => (current ? { ...current, displayTime: event.target.value } : current))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                    placeholder="Optional"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Source URL</label>
                  <input
                    value={editingItem.sourceUrl}
                    onChange={(event) =>
                      setEditingItem((current) => (current ? { ...current, sourceUrl: event.target.value } : current))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/55">
                <input
                  type="checkbox"
                  checked={editingItem.hidden}
                  onChange={(event) =>
                    setEditingItem((current) => (current ? { ...current, hidden: event.target.checked } : current))
                  }
                />
                Hide this item from the public live dataset after publish
              </label>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteItem(editingItem.id)}
                  disabled={!isPersistedId(editingItem.id) || Boolean(busyAction) || isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-60 dark:border-red-500/25 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveItem()}
                  disabled={!editingItem || !isPersistedId(editingItem.id) || Boolean(busyAction) || isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  <Save className="h-4 w-4" />
                  Save Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
