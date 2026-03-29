import { promises as fs } from "fs";
import path from "path";
import { rankingsEnabled } from "@/lib/rankings-config";

export type RankingLocale = "zh-CN" | "zh-TW" | "en" | "ja" | "ru" | "fr";
export type RankingKey = "yearly" | "monthly" | "daily" | "bili_rank";
type AiRankingKey = "yearly" | "monthly" | "daily";

export type RankingTitles = Record<RankingLocale, string>;

export type RankingItem = {
  id: string;
  query: string;
  score: number;
  titles: RankingTitles;
  displayTime?: string;
  sourceUrl?: string;
};

export type RankingBucket = {
  key: RankingKey;
  generatedAt: string;
  total: number;
  items: RankingItem[];
};

export type RankingDataset = {
  generatedAt: string;
  year: number;
  month: number;
  rankings: Record<RankingKey, RankingBucket>;
};

type AiGeneratedItem = {
  query?: string;
  score?: number;
};

type AiGeneratedList = {
  items?: AiGeneratedItem[];
};

type ModerationResult = {
  blocked?: string[];
};

type ScoreResult = {
  items?: Array<{
    query?: string;
    score?: number;
  }>;
};

type TranslationResult = {
  items?: Array<{
    query?: string;
    titles?: Partial<RankingTitles>;
  }>;
};

type VerificationResult = {
  items?: AiGeneratedItem[];
  removed?: string[];
  reason?: string;
};

const localeList: RankingLocale[] = ["zh-CN", "zh-TW", "en", "ja", "ru", "fr"];
let generationPromise: Promise<RankingDataset> | null = null;
let lastGenerationFailureAt = 0;
let lastCooldownLogAt = 0;

const normalizeScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
};

const toId = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-") || "anime";

const uniqueByQuery = (items: RankingItem[]) => {
  const map = new Map<string, RankingItem>();

  for (const item of items) {
    const key = item.query.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
};

const getRuntimeDate = (date = new Date(), timeZone = process.env.AI_RANKINGS_TIMEZONE || "Asia/Shanghai") => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
};

export const getRankingDataFile = () => {
  const baseDir = process.env.AI_RANKINGS_DATA_DIR || path.join(process.cwd(), "data", "rankings");
  return path.join(baseDir, "latest.json");
};

export const getRankingLandingUrls = (dataset: RankingDataset) => {
  const items = uniqueByQuery(
    Object.values(dataset.rankings).flatMap((bucket) => bucket.items),
  );

  return items.map((item) => `/?q=${encodeURIComponent(item.query)}`);
};

export const readRankingDataset = async (): Promise<RankingDataset | null> => {
  try {
    const content = await fs.readFile(getRankingDataFile(), "utf8");
    return JSON.parse(content) as RankingDataset;
  } catch {
    return null;
  }
};

export const ensureRankingDataset = async (): Promise<RankingDataset | null> => {
  const existing = await readRankingDataset();
  if (existing) return existing;

  if (generationPromise) {
    try {
      return await generationPromise;
    } catch {
      return null;
    }
  }

  const cooldownMs = Math.max(
    0,
    Number(process.env.AI_RANKINGS_RETRY_COOLDOWN_MS || 300000),
  );

  if (lastGenerationFailureAt > 0 && Date.now() - lastGenerationFailureAt < cooldownMs) {
    const now = Date.now();
    if (now - lastCooldownLogAt >= 30000) {
      lastCooldownLogAt = now;
      logRankings("pipeline", "skip auto-generation due to cooldown", {
        cooldownMs,
        nextTryInMs: cooldownMs - (now - lastGenerationFailureAt),
      });
    }
    return null;
  }

  generationPromise = (async () => {
    try {
      const dataset = await generateAndStoreRankings();
      lastGenerationFailureAt = 0;
      return dataset;
    } catch (error) {
      lastGenerationFailureAt = Date.now();
      logRankingsError("pipeline", error, {
        reason: "ensureRankingDataset failed",
      });
      throw error;
    } finally {
      generationPromise = null;
    }
  })();

  try {
    return await generationPromise;
  } catch {
    return null;
  }
};

const writeRankingDataset = async (dataset: RankingDataset) => {
  const filePath = getRankingDataFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), "utf8");
};

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : null;
  } catch {
    return null;
  }
};

const extractBalancedJson = (input: string) => {
  const start = input.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
};

const tryParseAiObject = (raw: string) => {
  const direct = safeJsonParse(raw);
  if (direct && typeof direct === "object") {
    return direct as Record<string, unknown>;
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const fromFence = safeJsonParse(fenced.trim());
    if (fromFence && typeof fromFence === "object") {
      return fromFence as Record<string, unknown>;
    }
  }

  const balanced = extractBalancedJson(raw);
  if (balanced) {
    const fromBalanced = safeJsonParse(balanced.trim());
    if (fromBalanced && typeof fromBalanced === "object") {
      return fromBalanced as Record<string, unknown>;
    }
  }

  return null;
};

const getAiConfig = () => ({
  baseUrl: (process.env.AI_RANKINGS_BASE_URL || process.env.AI_SUGGEST_BASE_URL || "").replace(/\/$/, ""),
  model: process.env.AI_RANKINGS_MODEL || process.env.AI_SUGGEST_MODEL || "",
  apiKey: process.env.AI_RANKINGS_API_KEY || process.env.AI_SUGGEST_API_KEY || "",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logRankings = (stage: string, message: string, extra?: Record<string, unknown>) => {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[rankings][${stage}] ${message}${payload}`);
};

const logRankingsError = (stage: string, error: unknown, extra?: Record<string, unknown>) => {
  const message = error instanceof Error ? error.message : String(error);
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.error(`[rankings][${stage}] ${message}${payload}`);
};

const callAiJson = async <T>(systemPrompt: string, userPrompt: string): Promise<T> => {
  const { baseUrl, model, apiKey } = getAiConfig();
  if (!baseUrl || !model || !apiKey) {
    throw new Error("AI rankings configuration missing");
  }

  let lastError: Error | null = null;
  const promptPreview = systemPrompt.slice(0, 80);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      logRankings("ai-request", "attempt started", {
        attempt,
        maxAttempts: 3,
        model,
        baseUrl,
        promptPreview,
      });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        cache: "no-store",
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `AI rankings request failed on attempt ${attempt}`);
      }

      const parsed = tryParseAiObject(text) as any;
      const content = parsed?.choices?.[0]?.message?.content ?? parsed ?? text;
      const json =
        typeof content === "string"
          ? tryParseAiObject(content)
          : content && typeof content === "object"
            ? content
            : null;

      if (json && typeof json === "object" && "error" in json) {
        throw new Error(JSON.stringify((json as { error?: unknown }).error));
      }

      if (!json || typeof json !== "object") {
        throw new Error(
          `AI rankings returned invalid JSON on attempt ${attempt}. raw=${text.slice(0, 280)}`,
        );
      }

      logRankings("ai-request", "attempt succeeded", {
        attempt,
        maxAttempts: 3,
        model,
      });

      return json as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI rankings request failed");
      logRankingsError("ai-request", lastError, {
        attempt,
        maxAttempts: 3,
        model,
        willRetry: attempt < 3,
      });

      if (attempt < 3) {
        await sleep(attempt * 1200);
      }
    }
  }

  logRankingsError("ai-request", lastError || new Error("AI rankings request failed after 3 attempts"), {
    attempt: 3,
    maxAttempts: 3,
    model,
    finalFailure: true,
  });

  throw lastError || new Error("AI rankings request failed after 3 attempts");
};

const defaultListPrompt = (label: string, minItems: number, year: number, month: number) =>
  [
    "You are an anime ranking researcher.",
    "Focus on Japanese anime first and Mainland Chinese animation second.",
    "Prioritize reliable platform signals from Bilibili, Bangumi, AniList, MyAnimeList, Niconico, X/Twitter trends, and major streaming discussions.",
    "Output MUST be valid JSON object only. No markdown, no code block, no explanation.",
    "Use EXACT output format:",
    '{"items":[{"query":"Title A","score":88.5},{"query":"Title B","score":76}]}',
    `Generate at least ${minItems} items for ${label}.`,
    `Current year is ${year}, current month is ${month}.`,
    "Only include anime titles. Exclude live action, games, adult content, illegal content, unrelated topics.",
    "query must be Simplified Chinese anime title whenever possible.",
    "For daily hot ranking, only include titles that are already released/airing/currently watchable. Do NOT include unreleased future-only titles.",
    "score must be numeric (0-100).",
    "Do not use placeholders like string/number in JSON values.",
  ].join(" ");

const defaultModerationPrompt =
  [
    "You are a safety and compliance reviewer.",
    "Output MUST be valid JSON object only.",
    "Use EXACT output format:",
    '{"blocked":["example title"]} or {"blocked":[]}',
    "Block titles that are illegal, pornographic, hateful, violent-extremist, scam-like, or clearly unrelated to anime.",
  ].join(" ");

const defaultTranslationPrompt =
  [
    "You are a multilingual anime title translator.",
    "Output MUST be valid JSON object only.",
    "Use EXACT output format:",
    '{"items":[{"query":"title","titles":{"zh-CN":"...","zh-TW":"...","en":"...","ja":"...","ru":"...","fr":"..."}}]}',
    "zh-CN must be the preferred primary title used for search query when available.",
    "Translate naturally and keep official names where appropriate.",
  ].join(" ");

const defaultScorePrompt =
  [
    "You are an anime ranking score normalizer.",
    "Output MUST be valid JSON object only.",
    "Use EXACT output format:",
    '{"items":[{"query":"title","score":85.2}]}',
    "Normalize duplicated or cross-list titles so the same title has one consistent final score from 0 to 100.",
  ].join(" ");

const defaultVerifyPrompt =
  [
    "You are an anime ranking quality verifier.",
    "Output MUST be valid JSON object only.",
    "Use EXACT output format:",
    '{"items":[{"query":"title","score":80}],"removed":["title x"]}',
    "Rules:",
    "1) Keep only real anime titles.",
    "2) Remove unrelated, duplicated, or low-confidence items.",
    "3) For daily hot ranking: remove titles not released/airing yet.",
    "4) Prefer Simplified Chinese title in query field when possible.",
    "5) Preserve numeric score in 0-100 range.",
  ].join(" ");

const strictJsonContract = [
  "GLOBAL OUTPUT CONTRACT:",
  "1) Return exactly one JSON object.",
  "2) Do NOT return markdown, code fences, comments, or explanation.",
  "3) Do NOT include trailing commas.",
  "4) All keys and string values must use double quotes.",
  "5) If uncertain, still return a valid JSON object with best effort values.",
].join(" ");

const withStrictContract = (purpose: string, prompt: string) =>
  [
    `TASK: ${purpose}.`,
    strictJsonContract,
    prompt,
  ].join(" ");

const getPrompt = (name: string, fallback: string, purpose: string) => {
  const custom = process.env[name]?.trim();
  return withStrictContract(purpose, custom || fallback);
};

const targetItemCount = (minItems: number) => Math.max(20, minItems);

const toBiliScore = (value: number, max: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return normalizeScore((value / max) * 100);
};

const decodeEscapedText = (value: string) => {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value;
  }
};

const mapRankItem = (query: string, score: number, extra?: Partial<RankingItem>): RankingItem => ({
  id: toId(query),
  query,
  score: normalizeScore(score),
  titles: {
    "zh-CN": query,
    "zh-TW": query,
    en: query,
    ja: query,
    ru: query,
    fr: query,
  },
  ...extra,
});

const fetchBiliRankings = async (minItems: number) => {
  const rankUrl = process.env.AI_RANKINGS_BILIBILI_RANK_URL || "https://api.bilibili.com/x/web-interface/ranking/v2?rid=13&type=all";
  const rankRegionFallbackUrl =
    process.env.AI_RANKINGS_BILIBILI_RANK_REGION_URL ||
    "https://api.bilibili.com/x/web-interface/ranking/region?rid=13&day=3&original=0";
  const rankPageUrl =
    process.env.AI_RANKINGS_BILIBILI_RANK_PAGE_URL ||
    "https://www.bilibili.com/v/popular/rank/anime";
  const userAgent =
    process.env.AI_RANKINGS_BILIBILI_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

  const [rankResp, rankRegionResp, rankPageResp] = await Promise.all([
    fetch(rankUrl, {
      headers: {
        "user-agent": userAgent,
        referer: "https://www.bilibili.com/v/popular/rank/anime",
      },
      cache: "no-store",
    }),
    fetch(rankRegionFallbackUrl, {
      headers: {
        "user-agent": userAgent,
        referer: "https://www.bilibili.com/v/popular/rank/anime",
      },
      cache: "no-store",
    }),
    fetch(rankPageUrl, {
      headers: {
        "user-agent": userAgent,
      },
      cache: "no-store",
    }),
  ]);

  const rankJson = rankResp.ok ? ((await rankResp.json()) as any) : null;
  const rankRegionJson = rankRegionResp.ok ? ((await rankRegionResp.json()) as any) : null;
  const rankPageHtml = rankPageResp.ok ? await rankPageResp.text() : "";

  const parseTitlesFromHtml = (html: string, pattern: RegExp, limit = 200) => {
    const titles: string[] = [];
    let match: RegExpExecArray | null = null;

    while ((match = pattern.exec(html)) && titles.length < limit) {
      const raw = (match[1] || "").trim();
      if (!raw) continue;
      const title = decodeEscapedText(raw).trim();
      if (!title || title.length < 2) continue;
      titles.push(title);
    }

    return titles;
  };

  const collectObjects = (input: unknown, max = 4000) => {
    const queue: unknown[] = [input];
    const out: Record<string, unknown>[] = [];

    while (queue.length && out.length < max) {
      const current = queue.shift();
      if (!current) continue;
      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }
      if (typeof current === "object") {
        const record = current as Record<string, unknown>;
        out.push(record);
        queue.push(...Object.values(record));
      }
    }

    return out;
  };

  const extractTitleItems = (
    source: unknown,
    scoreFrom: (entry: Record<string, unknown>, index: number) => number,
    url: string,
    withTime = false,
  ) => {
    const objects = collectObjects(source);
    const result: RankingItem[] = [];

    for (let i = 0; i < objects.length; i += 1) {
      const entry = objects[i];
      const title =
        (entry.title as string) ||
        (entry.season_title as string) ||
        (entry.square_cover_title as string) ||
        (entry.name as string) ||
        "";
      const query = `${title}`.trim();
      if (!query || query.length < 2) continue;

      const displayTime =
        `${entry.pub_time || entry.pub_index_show || entry.pub_index || entry.date || ""}`.trim();

      result.push(
        mapRankItem(query, scoreFrom(entry, i), {
          sourceUrl: (entry.url as string) || (entry.share_url as string) || url,
          ...(withTime && displayTime ? { displayTime } : {}),
        }),
      );
    }

    return result;
  };

  const parsePageItems = (html: string) => {
    const initialState =
      html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\//)?.[1] ||
      html.match(/__INITIAL_STATE__=(\{[\s\S]*?\});/)?.[1];

    const state = initialState ? safeJsonParse(initialState) : null;
    const list =
      (state as any)?.rankData?.list ||
      (state as any)?.rankList ||
      (state as any)?.store?.rank?.list ||
      [];
    return Array.isArray(list) ? list : [];
  };

  const rankItems = [
    ...extractTitleItems(
      rankJson?.data?.list || rankJson?.data || [],
      (entry) => Number((entry.stat as { view?: unknown } | undefined)?.view || entry.play || 0),
      "https://www.bilibili.com/v/popular/rank/anime",
    ),
    ...extractTitleItems(
      rankRegionJson?.data?.list || rankRegionJson?.data || [],
      (entry) => Number((entry.stat as { view?: unknown } | undefined)?.view || entry.play || 0),
      "https://www.bilibili.com/v/popular/rank/anime",
    ),
    ...extractTitleItems(parsePageItems(rankPageHtml), (_entry, idx) => 200 - idx, "https://www.bilibili.com/v/popular/rank/anime"),
  ];

  const rankTitlesFromPage = parseTitlesFromHtml(rankPageHtml, /"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, 120)
    .map((title, idx) => mapRankItem(title, toBiliScore(120 - idx, 120), { sourceUrl: "https://www.bilibili.com/v/popular/rank/anime" }));

  if (rankItems.length === 0) {
    logRankings("bilibili", "rank source empty", {
      rankStatus: rankResp.status,
      rankRegionStatus: rankRegionResp.status,
      rankPageStatus: rankPageResp.status,
    });
  }

  const rankMerged = [...rankItems, ...rankTitlesFromPage];

  const dedup = (items: RankingItem[]) => {
    const map = new Map<string, RankingItem>();
    for (const item of items) {
      const key = item.query.trim().toLowerCase();
      const current = map.get(key);
      if (!current || item.score > current.score) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  };

  const rank = dedup(rankMerged);

  logRankings("bilibili", "fetched ranking sources", {
    rank: rank.length,
    rankApiOk: rankResp.ok,
  });

  return {
    rank,
  };
};

const mergeCandidateItems = (
  current: Array<{ query: string; score: number }>,
  incoming: AiGeneratedItem[],
  limit: number,
) => {
  const map = new Map<string, { query: string; score: number }>();

  for (const item of current) {
    const query = item.query.trim();
    if (!query) continue;
    map.set(query.toLowerCase(), { query, score: normalizeScore(item.score) });
  }

  for (const item of incoming) {
    const query = (item.query || "").trim();
    if (!query) continue;

    const key = query.toLowerCase();
    const nextScore = normalizeScore(Number(item.score ?? 0));
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { query, score: nextScore });
      continue;
    }

    if (nextScore > existing.score) {
      map.set(key, { query: existing.query, score: nextScore });
    }
  }

  return Array.from(map.values()).slice(0, limit);
};

const fillRankingList = async (key: AiRankingKey, year: number, month: number, minItems: number) => {
  const limit = targetItemCount(minItems);
  let items = sanitizeGeneratedItems((await generateRawList(key, year, month, limit)).items || [], limit);
  const maxAttempts = 4;

  for (let attempt = 1; attempt < maxAttempts && items.length < limit; attempt += 1) {
    const missing = limit - items.length;
    const existingQueries = items.map((item) => item.query);
    const label =
      key === "yearly"
        ? `${year} upcoming anime ranking`
        : key === "monthly"
          ? `${month} monthly seasonal anime ranking`
          : "today anime hot ranking";

    const refillPrompt = getPrompt(
      key === "yearly"
        ? "AI_RANKINGS_PROMPT_YEARLY"
        : key === "monthly"
          ? "AI_RANKINGS_PROMPT_MONTHLY"
          : "AI_RANKINGS_PROMPT_DAILY",
      defaultListPrompt(label, limit, year, month),
      `ranking list refill for ${label}`,
    );

    const refill = await callAiJson<AiGeneratedList>(
      refillPrompt,
      JSON.stringify({
        year,
        month,
        minItems: limit,
        label,
        refillOnly: true,
        missing,
        exclude: existingQueries,
        instruction:
          "Return valid JSON only. Return only new anime titles not present in exclude. Do not repeat existing titles. Keep returning enough new anime to reach target count.",
      }),
    );

    items = mergeCandidateItems(items, refill.items || [], limit);
  }

  return items.slice(0, limit);
};

const generateRawList = async (key: AiRankingKey, year: number, month: number, minItems: number) => {
  const label =
    key === "yearly"
      ? `${year} upcoming anime ranking`
      : key === "monthly"
        ? `${month} monthly seasonal anime ranking`
        : "today anime hot ranking";

  const systemPrompt = getPrompt(
    key === "yearly"
      ? "AI_RANKINGS_PROMPT_YEARLY"
      : key === "monthly"
        ? "AI_RANKINGS_PROMPT_MONTHLY"
        : "AI_RANKINGS_PROMPT_DAILY",
    defaultListPrompt(label, minItems, year, month),
    `ranking list generation for ${label}`,
  );

  const userPrompt = JSON.stringify({ year, month, minItems, label });
  return callAiJson<AiGeneratedList>(systemPrompt, userPrompt);
};

const verifyRankingList = async (
  key: AiRankingKey,
  items: Array<{ query: string; score: number }>,
  year: number,
  month: number,
) => {
  const systemPrompt = getPrompt(
    "AI_RANKINGS_PROMPT_VERIFY",
    defaultVerifyPrompt,
    `ranking verification for ${key}`,
  );

  const verification = await callAiJson<VerificationResult>(
    systemPrompt,
    JSON.stringify({
      rankingType: key,
      year,
      month,
      candidates: items,
      constraints:
        key === "daily"
          ? "daily list must only include released or airing anime"
          : key === "monthly"
            ? "monthly list should focus on current month seasonal anime"
            : "yearly list should focus on current-year anticipated titles",
    }),
  );

  return sanitizeGeneratedItems(verification.items || [], items.length || 20);
};

const ensureVerifiedList = async (
  key: AiRankingKey,
  initialItems: Array<{ query: string; score: number }>,
  year: number,
  month: number,
  minItems: number,
) => {
  const required = targetItemCount(minItems);
  let verified = await verifyRankingList(key, initialItems, year, month);

  for (let round = 1; round <= 2 && verified.length < required; round += 1) {
    const fallbackItems = await fillRankingList(key, year, month, required + round * 8);
    const merged = mergeCandidateItems(verified, fallbackItems, required + round * 12);
    verified = await verifyRankingList(key, merged, year, month);
  }

  return verified.slice(0, required);
};

const replenishAfterModeration = async (
  key: AiRankingKey,
  currentItems: Array<{ query: string; score: number }>,
  blocked: Set<string>,
  year: number,
  month: number,
  minItems: number,
) => {
  const required = targetItemCount(minItems);
  let items = currentItems;

  for (let round = 1; round <= 3 && items.length < required; round += 1) {
    const target = required + round * 12;
    const refill = await fillRankingList(key, year, month, target);
    const merged = mergeCandidateItems(
      items,
      refill.map((entry) => ({ query: entry.query, score: entry.score })),
      target,
    );

    const verified = await verifyRankingList(key, merged, year, month);
    items = verified.filter((item) => !blocked.has(item.query.trim().toLowerCase()));
  }

  return items.slice(0, required);
};

const moderateQueries = async (queries: string[]) => {
  const systemPrompt = getPrompt(
    "AI_RANKINGS_PROMPT_MODERATION",
    defaultModerationPrompt,
    "ranking moderation",
  );
  const result = await callAiJson<ModerationResult>(systemPrompt, JSON.stringify({ queries }));
  return new Set((result.blocked || []).map((entry) => entry.trim().toLowerCase()));
};

const unifyScores = async (queries: string[], scoreMap: Record<string, number>) => {
  const systemPrompt = getPrompt(
    "AI_RANKINGS_PROMPT_SCORE",
    defaultScorePrompt,
    "ranking score normalization",
  );
  const result = await callAiJson<ScoreResult>(systemPrompt, JSON.stringify({ items: queries.map((query) => ({ query, score: scoreMap[query] ?? 0 })) }));
  const next = new Map<string, number>();

  for (const item of result.items || []) {
    const query = (item.query || "").trim();
    if (!query) continue;
    next.set(query, normalizeScore(Number(item.score ?? 0)));
  }

  return next;
};

const translateQueries = async (queries: string[]) => {
  const systemPrompt = getPrompt(
    "AI_RANKINGS_PROMPT_TRANSLATE",
    defaultTranslationPrompt,
    "ranking title translation",
  );
  const result = await callAiJson<TranslationResult>(systemPrompt, JSON.stringify({ queries, locales: localeList }));
  const next = new Map<string, RankingTitles>();

  for (const item of result.items || []) {
    const query = (item.query || "").trim();
    if (!query) continue;
    next.set(query, {
      "zh-CN": item.titles?.["zh-CN"] || query,
      "zh-TW": item.titles?.["zh-TW"] || item.titles?.["zh-CN"] || query,
      en: item.titles?.en || query,
      ja: item.titles?.ja || query,
      ru: item.titles?.ru || query,
      fr: item.titles?.fr || query,
    });
  }

  return next;
};

const sanitizeGeneratedItems = (items: AiGeneratedItem[], minItems: number) => {
  const map = new Map<string, { query: string; score: number }>();

  for (const item of items) {
    const query = (item.query || "").trim();
    if (!query) continue;
    if (!map.has(query)) {
      map.set(query, { query, score: normalizeScore(Number(item.score ?? 0)) });
    }
  }

  return Array.from(map.values()).slice(0, targetItemCount(minItems));
};

export const generateRankings = async () => {
  const minItems = targetItemCount(Number(process.env.AI_RANKINGS_MIN_ITEMS || 20));
  const { year, month } = getRuntimeDate();
  const seedItems = Math.max(minItems * 2, minItems + 20);

  logRankings("pipeline", "generation started", { year, month, minItems });

  try {
    const [yearlyItems, monthlyItems, dailyItems] = await Promise.all([
      fillRankingList("yearly", year, month, seedItems),
      fillRankingList("monthly", year, month, seedItems),
      fillRankingList("daily", year, month, seedItems),
    ]);

    logRankings("pipeline", "raw lists generated", {
      yearly: yearlyItems.length,
      monthly: monthlyItems.length,
      daily: dailyItems.length,
    });

    const [yearlyVerified, monthlyVerified, dailyVerified] = await Promise.all([
      ensureVerifiedList("yearly", yearlyItems, year, month, minItems),
      ensureVerifiedList("monthly", monthlyItems, year, month, minItems),
      ensureVerifiedList("daily", dailyItems, year, month, minItems),
    ]);

    const rawLists = {
      yearly: yearlyVerified,
      monthly: monthlyVerified,
      daily: dailyVerified,
    } satisfies Record<AiRankingKey, Array<{ query: string; score: number }>>;

    let biliData: { rank: RankingItem[] } = {
      rank: [],
    };

    try {
      biliData = await fetchBiliRankings(minItems);
    } catch (error) {
      logRankingsError("pipeline", error, {
        reason: "bilibili fetch failed; continue with AI rankings",
      });
    }

    const allQueries = Array.from(new Set(Object.values(rawLists).flatMap((list) => list.map((item) => item.query))));
    const blocked = await moderateQueries(allQueries);
    logRankings("pipeline", "moderation completed", {
      totalQueries: allQueries.length,
      blocked: blocked.size,
    });

    const filteredLists = Object.fromEntries(
      Object.entries(rawLists).map(([key, items]) => [
        key,
        items.filter((item) => !blocked.has(item.query.trim().toLowerCase())),
      ]),
    ) as Record<AiRankingKey, Array<{ query: string; score: number }>>;

    const [yearlyFilled, monthlyFilled, dailyFilled] = await Promise.all([
      replenishAfterModeration("yearly", filteredLists.yearly, blocked, year, month, minItems),
      replenishAfterModeration("monthly", filteredLists.monthly, blocked, year, month, minItems),
      replenishAfterModeration("daily", filteredLists.daily, blocked, year, month, minItems),
    ]);

    const normalizedLists = {
      yearly: yearlyFilled,
      monthly: monthlyFilled,
      daily: dailyFilled,
    } satisfies Record<AiRankingKey, Array<{ query: string; score: number }>>;

    const baseScoreMap = Object.values(normalizedLists)
      .flat()
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.query] = Math.max(acc[item.query] ?? 0, item.score);
        return acc;
      }, {});

    const uniqueQueries = Object.keys(baseScoreMap);
    const [normalizedScores, translations] = await Promise.all([
      unifyScores(uniqueQueries, baseScoreMap),
      translateQueries(uniqueQueries),
    ]);
    logRankings("pipeline", "score normalization and translation completed", {
      uniqueQueries: uniqueQueries.length,
      normalizedScores: normalizedScores.size,
      translations: translations.size,
    });

    const generatedAt = new Date().toISOString();
    const buildBucket = (key: AiRankingKey): RankingBucket => {
      const candidates = normalizedLists[key]
        .map((item) => {
          const score = normalizedScores.get(item.query) ?? item.score;
          const titles = translations.get(item.query) || {
            "zh-CN": item.query,
            "zh-TW": item.query,
            en: item.query,
            ja: item.query,
            ru: item.query,
            fr: item.query,
          };

          const primaryQuery = (titles["zh-CN"] || item.query).trim();

          return {
            id: toId(primaryQuery),
            query: primaryQuery,
            score: normalizeScore(score),
            titles,
          } satisfies RankingItem;
        })
        .sort((a, b) => b.score - a.score);

      const dedupMap = new Map<string, RankingItem>();
      for (const item of candidates) {
        const dedupKey = item.query.trim().toLowerCase();
        const current = dedupMap.get(dedupKey);
        if (!current || item.score > current.score) {
          dedupMap.set(dedupKey, item);
        }
      }

      const items = Array.from(dedupMap.values()).slice(0, targetItemCount(minItems));

      return {
        key,
        generatedAt,
        total: items.length,
        items,
      };
    };

    const dataset = {
      generatedAt,
      year,
      month,
      rankings: {
        yearly: buildBucket("yearly"),
        monthly: buildBucket("monthly"),
        daily: buildBucket("daily"),
        bili_rank: {
          key: "bili_rank",
          generatedAt,
          total: biliData.rank.length,
          items: biliData.rank,
        },
      },
    } satisfies RankingDataset;

    logRankings("pipeline", "generation finished", {
      yearly: dataset.rankings.yearly.total,
      monthly: dataset.rankings.monthly.total,
      daily: dataset.rankings.daily.total,
      biliRank: dataset.rankings.bili_rank.total,
      generatedAt,
    });

    return dataset;
  } catch (error) {
    logRankingsError("pipeline", error, {
      year,
      month,
      minItems,
      reason: "rankings generation failed",
    });

    let biliData: { rank: RankingItem[] } = {
      rank: [],
    };

    try {
      biliData = await fetchBiliRankings(minItems);
    } catch (biliError) {
      logRankingsError("pipeline", biliError, {
        reason: "bilibili fallback fetch failed",
      });
    }

    const generatedAt = new Date().toISOString();
    const fallback = {
      generatedAt,
      year,
      month,
      rankings: {
        yearly: { key: "yearly", generatedAt, total: 0, items: [] },
        monthly: { key: "monthly", generatedAt, total: 0, items: [] },
        daily: { key: "daily", generatedAt, total: 0, items: [] },
        bili_rank: { key: "bili_rank", generatedAt, total: biliData.rank.length, items: biliData.rank },
      },
    } satisfies RankingDataset;

    return fallback;
  }
};

export const generateAndStoreRankings = async () => {
  const dataset = await generateRankings();
  await writeRankingDataset(dataset);
  return dataset;
};
