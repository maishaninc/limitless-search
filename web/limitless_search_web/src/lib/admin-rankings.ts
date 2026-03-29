import "server-only";

import { promises as fs } from "fs";
import path from "path";
import type { AdminRankingSection, AdminRankingWorkspace } from "@/lib/admin-preview";
import { getAdminRankingWorkspace as getFallbackWorkspace } from "@/lib/admin-preview";
import { allRows, mutate, queryFirstRow, queryRows, queryScalar, runStatement, toNumber, toStringValue } from "@/lib/admin-db";
import { getRankingDataFile, readRankingDataset, type RankingDataset, type RankingItem, type RankingKey, type RankingTitles } from "@/lib/rankings";

type VersionStatus = "published" | "draft" | "generated";
type VersionSource = "ai" | "manual" | "clone";

type VersionRow = {
  id: number;
  name: string;
  source_type: VersionSource;
  status: VersionStatus;
  year: number;
  month: number;
  generated_at: string;
  updated_at: string;
  published_at: string | null;
  created_by_email: string | null;
  notes: string | null;
};

type RankingItemPatch = {
  title: string;
  query: string;
  score: number;
  displayTime?: string;
  sourceUrl?: string;
  hidden?: boolean;
};

type RankingMoveDirection = "up" | "down";

const rankingOrder: RankingKey[] = ["yearly", "monthly", "daily", "bili_rank"];

const nowIso = () => new Date().toISOString();

const normalizeScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
};

const toVersionStatus = (value: string): VersionStatus =>
  value === "published" || value === "draft" ? value : "generated";

const toVersionSource = (value: string): VersionSource =>
  value === "manual" || value === "clone" ? value : "ai";

const mapVersionRow = (row: Record<string, unknown>): VersionRow => ({
  id: toNumber(row.id),
  name: toStringValue(row.name),
  source_type: toVersionSource(toStringValue(row.source_type)),
  status: toVersionStatus(toStringValue(row.status)),
  year: toNumber(row.year),
  month: toNumber(row.month),
  generated_at: toStringValue(row.generated_at),
  updated_at: toStringValue(row.updated_at),
  published_at: row.published_at ? toStringValue(row.published_at) : null,
  created_by_email: row.created_by_email ? toStringValue(row.created_by_email) : null,
  notes: row.notes ? toStringValue(row.notes) : null,
});

const mapSourceLabel = (sourceType: VersionSource) => {
  switch (sourceType) {
    case "manual":
      return "Handmade" as const;
    case "clone":
      return "AI Clone" as const;
    default:
      return "AI Generated" as const;
  }
};

const mapStatusLabel = (status: VersionStatus) => {
  switch (status) {
    case "published":
      return "Published" as const;
    case "draft":
      return "Draft" as const;
    default:
      return "Pending" as const;
  }
};

const getSectionTitle = (key: RankingKey) => {
  switch (key) {
    case "yearly":
      return "Yearly Upcoming";
    case "monthly":
      return "Monthly Seasonal";
    case "daily":
      return "Daily Hot";
    case "bili_rank":
      return "Bilibili Board";
  }
};

const getSectionDescription = (key: RankingKey) => {
  switch (key) {
    case "yearly":
      return "Focus on high-attention upcoming titles and allow manual correction.";
    case "monthly":
      return "Focus on current-month airing titles and allow manual fine tuning.";
    case "daily":
      return "Keep only released or currently airing titles and allow manual cleanup.";
    case "bili_rank":
      return "Auto-fetched results that can be hidden or supplemented manually.";
  }
};

const parseTitles = (value: unknown, query: string, fallbackTitle?: string): RankingTitles => {
  const fallback = fallbackTitle || query;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as Partial<RankingTitles>;
      return {
        "zh-CN": parsed["zh-CN"] || fallback,
        "zh-TW": parsed["zh-TW"] || parsed["zh-CN"] || fallback,
        en: parsed.en || fallback,
        ja: parsed.ja || fallback,
        ru: parsed.ru || fallback,
        fr: parsed.fr || fallback,
      };
    } catch {
      // Fall through to generic fallback.
    }
  }

  return {
    "zh-CN": fallback,
    "zh-TW": fallback,
    en: fallback,
    ja: fallback,
    ru: fallback,
    fr: fallback,
  };
};

const encodeTitles = (titles: Partial<RankingTitles> | undefined, fallbackTitle: string) =>
  JSON.stringify({
    "zh-CN": titles?.["zh-CN"] || fallbackTitle,
    "zh-TW": titles?.["zh-TW"] || titles?.["zh-CN"] || fallbackTitle,
    en: titles?.en || fallbackTitle,
    ja: titles?.ja || fallbackTitle,
    ru: titles?.ru || fallbackTitle,
    fr: titles?.fr || fallbackTitle,
  });

const resolveItemTitle = (row: Record<string, unknown>) => {
  const directTitle = toStringValue(row.title);
  if (directTitle) return directTitle;
  return parseTitles(row.titles_json, toStringValue(row.query), directTitle)["zh-CN"];
};

const getVersionRows = async () => {
  const rows = await allRows(
    `
    SELECT id, name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes
    FROM ranking_versions
    ORDER BY updated_at DESC, id DESC
    `,
  );

  return rows.map(mapVersionRow);
};

const getVersionRowById = async (versionId: number) => {
  const rows = await allRows(
    `
    SELECT id, name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes
    FROM ranking_versions
    WHERE id = ?
    LIMIT 1
    `,
    [versionId],
  );

  return rows[0] ? mapVersionRow(rows[0]) : null;
};

const copyVersionIntoDraft = (
  db: Parameters<Parameters<typeof mutate>[0]>[0],
  sourceVersion: VersionRow,
  options: {
    name: string;
    sourceType: VersionSource;
    createdByEmail?: string | null;
    notes?: string | null;
  },
) => {
  const timestamp = nowIso();

  runStatement(
    db,
    `
    INSERT INTO ranking_versions
      (name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes)
    VALUES (?, ?, 'draft', ?, ?, ?, ?, NULL, ?, ?)
    `,
    [
      options.name,
      options.sourceType,
      sourceVersion.year,
      sourceVersion.month,
      sourceVersion.generated_at,
      timestamp,
      options.createdByEmail || sourceVersion.created_by_email || null,
      options.notes || null,
    ],
  );

  const draftVersionId = toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));
  const listRows = queryRows(db, "SELECT * FROM ranking_lists WHERE version_id = ? ORDER BY id ASC", [sourceVersion.id]);

  listRows.forEach((listRow) => {
    runStatement(
      db,
      "INSERT INTO ranking_lists (version_id, list_key, total) VALUES (?, ?, ?)",
      [draftVersionId, toStringValue(listRow.list_key), toNumber(listRow.total)],
    );
    const newListId = toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));

    const itemRows = queryRows(
      db,
      "SELECT * FROM ranking_items WHERE list_id = ? ORDER BY position ASC, id ASC",
      [toNumber(listRow.id)],
    );

    itemRows.forEach((itemRow) => {
      runStatement(
        db,
        `
        INSERT INTO ranking_items
          (list_id, position, query, title, score, display_time, source_url, hidden, source_type, titles_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          newListId,
          toNumber(itemRow.position),
          toStringValue(itemRow.query),
          toStringValue(itemRow.title),
          toNumber(itemRow.score),
          itemRow.display_time ? toStringValue(itemRow.display_time) : null,
          itemRow.source_url ? toStringValue(itemRow.source_url) : null,
          toNumber(itemRow.hidden),
          toStringValue(itemRow.source_type),
          toStringValue(itemRow.titles_json),
        ],
      );
    });
  });

  return draftVersionId;
};

const buildSections = (
  version: VersionRow,
  listRows: Array<Record<string, unknown>>,
  itemRows: Array<Record<string, unknown>>,
) => {
  const sectionMap = new Map<RankingKey, AdminRankingSection>();

  for (const key of rankingOrder) {
    sectionMap.set(key, {
      key,
      title: getSectionTitle(key),
      description: getSectionDescription(key),
      items: [],
    });
  }

  for (const listRow of listRows) {
    const key = toStringValue(listRow.list_key) as RankingKey;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        key,
        title: getSectionTitle(key),
        description: getSectionDescription(key),
        items: [],
      });
    }
  }

  for (const itemRow of itemRows) {
    const key = toStringValue(itemRow.list_key) as RankingKey;
    const section = sectionMap.get(key);
    if (!section) continue;

    section.items.push({
      id: String(toNumber(itemRow.id)),
      title: resolveItemTitle(itemRow),
      score: toNumber(itemRow.score),
      query: toStringValue(itemRow.query),
      displayTime: itemRow.display_time ? toStringValue(itemRow.display_time) : undefined,
      sourceUrl: itemRow.source_url ? toStringValue(itemRow.source_url) : undefined,
      hidden: toNumber(itemRow.hidden) === 1,
      sourceType: toStringValue(itemRow.source_type),
      status:
        version.status === "published"
          ? "published"
          : version.status === "draft"
            ? "draft"
            : "generated",
    });
  }

  return rankingOrder.map((key) => sectionMap.get(key) as AdminRankingSection);
};

const createDatasetFromVersion = async (versionId: number): Promise<RankingDataset> => {
  const version = await getVersionRowById(versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  const itemRows = await allRows(
    `
    SELECT i.*, l.list_key
    FROM ranking_items i
    INNER JOIN ranking_lists l ON l.id = i.list_id
    WHERE l.version_id = ?
    ORDER BY l.id ASC, i.position ASC, i.id ASC
    `,
    [versionId],
  );

  const rankings = {} as RankingDataset["rankings"];

  for (const key of rankingOrder) {
    const rowsForList = itemRows.filter(
      (row) => toStringValue(row.list_key) === key && toNumber(row.hidden) === 0,
    );
    const items: RankingItem[] = rowsForList.map((row) => ({
      id: String(toNumber(row.id)),
      query: toStringValue(row.query),
      score: normalizeScore(toNumber(row.score)),
      titles: parseTitles(row.titles_json, toStringValue(row.query), resolveItemTitle(row)),
      displayTime: row.display_time ? toStringValue(row.display_time) : undefined,
      sourceUrl: row.source_url ? toStringValue(row.source_url) : undefined,
    }));

    rankings[key] = {
      key,
      generatedAt: version.generated_at,
      total: items.length,
      items,
    };
  }

  return {
    generatedAt: version.generated_at,
    year: version.year,
    month: version.month,
    rankings,
  };
};

const persistPublishedDataset = async (dataset: RankingDataset) => {
  const filePath = getRankingDataFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), "utf8");
};

const getCurrentPublishedVersion = async () => {
  const rows = await allRows(
    `
    SELECT id, name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes
    FROM ranking_versions
    WHERE status = 'published'
    ORDER BY published_at DESC, updated_at DESC
    LIMIT 1
    `,
  );

  return rows[0] ? mapVersionRow(rows[0]) : null;
};

const recountListTotal = (
  db: Parameters<Parameters<typeof mutate>[0]>[0],
  listId: number,
) => {
  const count = toNumber(
    queryScalar(db, "SELECT COUNT(*) AS count FROM ranking_items WHERE list_id = ?", [listId]),
  );
  runStatement(db, "UPDATE ranking_lists SET total = ? WHERE id = ?", [count, listId]);
};

const reindexListPositions = (
  db: Parameters<Parameters<typeof mutate>[0]>[0],
  listId: number,
) => {
  const itemRows = queryRows(
    db,
    "SELECT id FROM ranking_items WHERE list_id = ? ORDER BY position ASC, id ASC",
    [listId],
  );

  itemRows.forEach((row, index) => {
    runStatement(db, "UPDATE ranking_items SET position = ? WHERE id = ?", [index + 1, toNumber(row.id)]);
  });
};

const touchVersion = (
  db: Parameters<Parameters<typeof mutate>[0]>[0],
  versionId: number,
) => {
  runStatement(db, "UPDATE ranking_versions SET updated_at = ? WHERE id = ?", [nowIso(), versionId]);
};

const insertVersionFromDataset = (
  dataset: RankingDataset,
  options: {
    name: string;
    sourceType: VersionSource;
    status: VersionStatus;
    createdByEmail?: string | null;
    publishedAt?: string | null;
    notes?: string | null;
  },
) =>
  mutate((db) => {
    const generatedAt = dataset.generatedAt || nowIso();
    const updatedAt = nowIso();

    runStatement(
      db,
      `
      INSERT INTO ranking_versions
        (name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        options.name,
        options.sourceType,
        options.status,
        dataset.year,
        dataset.month,
        generatedAt,
        updatedAt,
        options.publishedAt || null,
        options.createdByEmail || null,
        options.notes || null,
      ],
    );

    const versionId = toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));

    (Object.entries(dataset.rankings) as Array<[RankingKey, RankingDataset["rankings"][RankingKey]]>).forEach(
      ([key, bucket]) => {
        runStatement(
          db,
          "INSERT INTO ranking_lists (version_id, list_key, total) VALUES (?, ?, ?)",
          [versionId, key, bucket.total],
        );

        const listId = toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));

        bucket.items.forEach((item, index) => {
          runStatement(
            db,
            `
            INSERT INTO ranking_items
              (list_id, position, query, title, score, display_time, source_url, hidden, source_type, titles_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              listId,
              index + 1,
              item.query,
              item.titles["zh-CN"] || item.query,
              item.score,
              item.displayTime || null,
              item.sourceUrl || null,
              0,
              key === "bili_rank" ? "bilibili" : options.sourceType,
              encodeTitles(item.titles, item.titles["zh-CN"] || item.query),
            ],
          );
        });
      },
    );

    return versionId;
  });

export const ensureRankingWorkspaceSeeded = async () => {
  const versionCountRows = await allRows("SELECT COUNT(*) AS count FROM ranking_versions");
  const versionCount = toNumber(versionCountRows[0]?.count);

  if (versionCount === 0) {
    const dataset = await readRankingDataset();
    if (dataset) {
      await insertVersionFromDataset(dataset, {
        name: `${dataset.year}-${String(dataset.month).padStart(2, "0")} imported live version`,
        sourceType: "ai",
        status: "published",
        publishedAt: nowIso(),
      });
    }
  }

  const draftCountRows = await allRows(
    "SELECT COUNT(*) AS count FROM ranking_versions WHERE status = 'draft'",
  );
  const draftCount = toNumber(draftCountRows[0]?.count);

  if (draftCount === 0) {
    const publishedRows = await allRows(
      `
      SELECT id, name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes
      FROM ranking_versions
      WHERE status = 'published'
      ORDER BY published_at DESC, updated_at DESC
      LIMIT 1
      `,
    );

    const published = publishedRows[0] ? mapVersionRow(publishedRows[0]) : null;
    if (!published) return;

    await mutate((db) => {
      copyVersionIntoDraft(db, published, {
        name: `${published.name} Draft`,
        sourceType: "clone",
        notes: "Auto-cloned from the current published version",
      });
    });
  }
};

export const createManualRankingDraft = async (input: {
  name: string;
  year: number;
  month: number;
  createdByEmail?: string | null;
}) =>
  mutate((db) => {
    const timestamp = nowIso();

    runStatement(
      db,
      `
      INSERT INTO ranking_versions
        (name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes)
      VALUES (?, 'manual', 'draft', ?, ?, ?, ?, NULL, ?, ?)
      `,
      [
        input.name,
        input.year,
        input.month,
        timestamp,
        timestamp,
        input.createdByEmail || null,
        "Created manually from admin console",
      ],
    );

    const versionId = toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));

    rankingOrder.forEach((key) => {
      runStatement(
        db,
        "INSERT INTO ranking_lists (version_id, list_key, total) VALUES (?, ?, 0)",
        [versionId, key],
      );
    });

    return versionId;
  });

export const importGeneratedRankingDataset = async (
  dataset: RankingDataset,
  options?: { createdByEmail?: string | null },
) => {
  const existingRows = await allRows(
    `
    SELECT id
    FROM ranking_versions
    WHERE source_type = 'ai' AND generated_at = ? AND year = ? AND month = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [dataset.generatedAt, dataset.year, dataset.month],
  );

  if (existingRows[0]) {
    return toNumber(existingRows[0].id);
  }

  return insertVersionFromDataset(dataset, {
    name: `AI Run ${dataset.generatedAt.replace("T", " ").replace(/\.\d+Z?$/, "")}`,
    sourceType: "ai",
    status: "generated",
    createdByEmail: options?.createdByEmail || null,
    notes: "Imported from AI sync pipeline",
  });
};

export const cloneRankingVersionToDraft = async (input: {
  versionId: number;
  createdByEmail?: string | null;
}) =>
  mutate((db) => {
    const row = queryFirstRow(
      db,
      `
      SELECT id, name, source_type, status, year, month, generated_at, updated_at, published_at, created_by_email, notes
      FROM ranking_versions
      WHERE id = ?
      LIMIT 1
      `,
      [input.versionId],
    );

    if (!row) {
      throw new Error("Version not found");
    }

    const sourceVersion = mapVersionRow(row);
    return copyVersionIntoDraft(db, sourceVersion, {
      name: `${sourceVersion.name} Draft`,
      sourceType: sourceVersion.source_type === "manual" ? "manual" : "clone",
      createdByEmail: input.createdByEmail || sourceVersion.created_by_email,
      notes: `Cloned from version #${sourceVersion.id}`,
    });
  });

export const createRankingItem = async (input: {
  versionId: number;
  listKey: RankingKey;
}) =>
  mutate((db) => {
    const versionRow = queryFirstRow(
      db,
      "SELECT id, status FROM ranking_versions WHERE id = ? LIMIT 1",
      [input.versionId],
    );

    if (!versionRow) {
      throw new Error("Draft version not found");
    }
    if (toStringValue(versionRow.status) !== "draft") {
      throw new Error("Only draft versions can be edited");
    }

    const listRow = queryFirstRow(
      db,
      "SELECT id FROM ranking_lists WHERE version_id = ? AND list_key = ? LIMIT 1",
      [input.versionId, input.listKey],
    );

    if (!listRow) {
      throw new Error("Ranking group not found");
    }

    const listId = toNumber(listRow.id);
    const nextPosition =
      toNumber(queryScalar(db, "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM ranking_items WHERE list_id = ?", [listId])) || 1;
    const title = "New Ranking Item";

    runStatement(
      db,
      `
      INSERT INTO ranking_items
        (list_id, position, query, title, score, display_time, source_url, hidden, source_type, titles_json)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, 'manual', ?)
      `,
      [listId, nextPosition, title, title, 50, encodeTitles(undefined, title)],
    );

    recountListTotal(db, listId);
    touchVersion(db, input.versionId);

    return toNumber(queryScalar(db, "SELECT last_insert_rowid() AS id"));
  });

export const updateRankingItem = async (input: {
  itemId: number;
  patch: RankingItemPatch;
}) =>
  mutate((db) => {
    const row = queryFirstRow(
      db,
      `
      SELECT i.id, i.list_id, i.titles_json, l.version_id, v.status
      FROM ranking_items i
      INNER JOIN ranking_lists l ON l.id = i.list_id
      INNER JOIN ranking_versions v ON v.id = l.version_id
      WHERE i.id = ?
      LIMIT 1
      `,
      [input.itemId],
    );

    if (!row) {
      throw new Error("Ranking item not found");
    }
    if (toStringValue(row.status) !== "draft") {
      throw new Error("Only draft items can be edited");
    }

    const versionId = toNumber(row.version_id);
    const listId = toNumber(row.list_id);
    const currentTitles = parseTitles(row.titles_json, input.patch.query, input.patch.title);

    runStatement(
      db,
      `
      UPDATE ranking_items
      SET
        title = ?,
        query = ?,
        score = ?,
        display_time = ?,
        source_url = ?,
        hidden = ?,
        titles_json = ?
      WHERE id = ?
      `,
      [
        input.patch.title,
        input.patch.query,
        normalizeScore(input.patch.score),
        input.patch.displayTime || null,
        input.patch.sourceUrl || null,
        input.patch.hidden ? 1 : 0,
        encodeTitles(
          {
            ...currentTitles,
            "zh-CN": input.patch.title,
          },
          input.patch.title,
        ),
        input.itemId,
      ],
    );

    recountListTotal(db, listId);
    reindexListPositions(db, listId);
    touchVersion(db, versionId);
  });

export const moveRankingItem = async (input: {
  itemId: number;
  direction: RankingMoveDirection;
}) =>
  mutate((db) => {
    const currentRow = queryFirstRow(
      db,
      `
      SELECT i.id, i.list_id, i.position, l.version_id, v.status
      FROM ranking_items i
      INNER JOIN ranking_lists l ON l.id = i.list_id
      INNER JOIN ranking_versions v ON v.id = l.version_id
      WHERE i.id = ?
      LIMIT 1
      `,
      [input.itemId],
    );

    if (!currentRow) {
      throw new Error("Ranking item not found");
    }
    if (toStringValue(currentRow.status) !== "draft") {
      throw new Error("Only draft items can be reordered");
    }

    const listId = toNumber(currentRow.list_id);
    const versionId = toNumber(currentRow.version_id);
    const currentPosition = toNumber(currentRow.position);
    const operator = input.direction === "up" ? "<" : ">";
    const order = input.direction === "up" ? "DESC" : "ASC";
    const neighborRow = queryFirstRow(
      db,
      `
      SELECT id, position
      FROM ranking_items
      WHERE list_id = ? AND position ${operator} ?
      ORDER BY position ${order}, id ${order}
      LIMIT 1
      `,
      [listId, currentPosition],
    );

    if (!neighborRow) {
      return false;
    }

    const neighborId = toNumber(neighborRow.id);
    const neighborPosition = toNumber(neighborRow.position);

    runStatement(db, "UPDATE ranking_items SET position = -1 WHERE id = ?", [input.itemId]);
    runStatement(db, "UPDATE ranking_items SET position = ? WHERE id = ?", [currentPosition, neighborId]);
    runStatement(db, "UPDATE ranking_items SET position = ? WHERE id = ?", [neighborPosition, input.itemId]);

    reindexListPositions(db, listId);
    touchVersion(db, versionId);
    return true;
  });

export const deleteRankingItem = async (input: { itemId: number }) =>
  mutate((db) => {
    const currentRow = queryFirstRow(
      db,
      `
      SELECT i.id, i.list_id, l.version_id, v.status
      FROM ranking_items i
      INNER JOIN ranking_lists l ON l.id = i.list_id
      INNER JOIN ranking_versions v ON v.id = l.version_id
      WHERE i.id = ?
      LIMIT 1
      `,
      [input.itemId],
    );

    if (!currentRow) {
      throw new Error("Ranking item not found");
    }
    if (toStringValue(currentRow.status) !== "draft") {
      throw new Error("Only draft items can be deleted");
    }

    const listId = toNumber(currentRow.list_id);
    const versionId = toNumber(currentRow.version_id);

    runStatement(db, "DELETE FROM ranking_items WHERE id = ?", [input.itemId]);
    reindexListPositions(db, listId);
    recountListTotal(db, listId);
    touchVersion(db, versionId);
  });

export const publishRankingVersion = async (input: {
  versionId: number;
  operatorEmail?: string | null;
}) => {
  await mutate((db) => {
    const row = queryFirstRow(
      db,
      "SELECT id FROM ranking_versions WHERE id = ? LIMIT 1",
      [input.versionId],
    );

    if (!row) {
      throw new Error("Version not found");
    }

    const publishedAt = nowIso();

    runStatement(
      db,
      "UPDATE ranking_versions SET status = 'generated', published_at = NULL, updated_at = ? WHERE status = 'published' AND id <> ?",
      [publishedAt, input.versionId],
    );
    runStatement(
      db,
      "UPDATE ranking_versions SET status = 'published', published_at = ?, updated_at = ?, created_by_email = COALESCE(?, created_by_email) WHERE id = ?",
      [publishedAt, publishedAt, input.operatorEmail || null, input.versionId],
    );
  });

  const dataset = await createDatasetFromVersion(input.versionId);
  await persistPublishedDataset(dataset);
};

export const restorePublishedRankingDataset = async () => {
  const published = await getCurrentPublishedVersion();
  if (!published) {
    return false;
  }

  const dataset = await createDatasetFromVersion(published.id);
  await persistPublishedDataset(dataset);
  return true;
};

export const getAdminRankingWorkspaceData = async (): Promise<AdminRankingWorkspace> => {
  await ensureRankingWorkspaceSeeded();

  const versions = await getVersionRows();
  if (versions.length === 0) {
    return getFallbackWorkspace();
  }

  const published = versions.find((version) => version.status === "published") || versions[0];
  const draft = versions.find((version) => version.status === "draft") || published;

  const [listRows, itemRows] = await Promise.all([
    allRows("SELECT * FROM ranking_lists WHERE version_id = ? ORDER BY id ASC", [draft.id]),
    allRows(
      `
      SELECT i.*, l.list_key
      FROM ranking_items i
      INNER JOIN ranking_lists l ON l.id = i.list_id
      WHERE l.version_id = ?
      ORDER BY l.id ASC, i.position ASC, i.id ASC
      `,
      [draft.id],
    ),
  ]);

  return {
    currentPublished: {
      id: String(published.id),
      name: published.name,
      generatedAt: published.generated_at,
      publishedAt: published.published_at || published.updated_at,
      operator: published.created_by_email || "system",
    },
    draft: {
      id: String(draft.id),
      name: draft.name,
      updatedAt: draft.updated_at,
      sections: buildSections(draft, listRows, itemRows),
    },
    versions: versions.map((version) => ({
      id: String(version.id),
      name: version.name,
      source: mapSourceLabel(version.source_type),
      status: mapStatusLabel(version.status),
      updatedAt: version.updated_at,
      sourceType: version.source_type,
      statusCode: version.status,
      year: version.year,
      month: version.month,
      generatedAt: version.generated_at,
      publishedAt: version.published_at,
      operator: version.created_by_email,
    })),
  };
};
