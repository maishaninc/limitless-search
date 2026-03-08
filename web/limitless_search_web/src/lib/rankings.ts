import { promises as fs } from "fs";
import path from "path";
import { rankingsEnabled } from "@/lib/rankings-config";

export type RankingLocale = "zh-CN" | "zh-TW" | "en" | "ja" | "ru" | "fr";
export type RankingKey = "yearly" | "monthly" | "daily";

export type RankingTitles = Record<RankingLocale, string>;

export type RankingItem = {
  id: string;
  query: string;
  score: number;
  titles: RankingTitles;
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

const localeList: RankingLocale[] = ["zh-CN", "zh-TW", "en", "ja", "ru", "fr"];
let generationPromise: Promise<RankingDataset> | null = null;
let lastGenerationFailureAt = 0;

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

  return items.map((item) => `/?q=${encodeURIComponent(item.query)}&auto=1`);
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
    logRankings("pipeline", "skip auto-generation due to cooldown", {
      cooldownMs,
      nextTryInMs: cooldownMs - (Date.now() - lastGenerationFailureAt),
    });
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
    "Output MUST be valid JSON object only. No markdown, no code block, no explanation.",
    "Use EXACT output format:",
    '{"items":[{"query":"Title A","score":88.5},{"query":"Title B","score":76}]}',
    `Generate at least ${minItems} items for ${label}.`,
    `Current year is ${year}, current month is ${month}.`,
    "Only include anime titles. Exclude live action, games, adult content, illegal content, unrelated topics.",
    "query must be a concise search-friendly anime title string.",
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

const fillRankingList = async (key: RankingKey, year: number, month: number, minItems: number) => {
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

const generateRawList = async (key: RankingKey, year: number, month: number, minItems: number) => {
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

  logRankings("pipeline", "generation started", { year, month, minItems });

  try {
    const [yearlyItems, monthlyItems, dailyItems] = await Promise.all([
      fillRankingList("yearly", year, month, minItems),
      fillRankingList("monthly", year, month, minItems),
      fillRankingList("daily", year, month, minItems),
    ]);

    logRankings("pipeline", "raw lists generated", {
      yearly: yearlyItems.length,
      monthly: monthlyItems.length,
      daily: dailyItems.length,
    });

    const rawLists = {
      yearly: yearlyItems,
      monthly: monthlyItems,
      daily: dailyItems,
    } satisfies Record<RankingKey, Array<{ query: string; score: number }>>;

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
    ) as Record<RankingKey, Array<{ query: string; score: number }>>;

    const baseScoreMap = Object.values(filteredLists)
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
    const buildBucket = (key: RankingKey): RankingBucket => {
      const items = filteredLists[key]
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

          return {
            id: toId(item.query),
            query: item.query,
            score: normalizeScore(score),
            titles,
          } satisfies RankingItem;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, targetItemCount(minItems));

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
      },
    } satisfies RankingDataset;

    logRankings("pipeline", "generation finished", {
      yearly: dataset.rankings.yearly.total,
      monthly: dataset.rankings.monthly.total,
      daily: dataset.rankings.daily.total,
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
    throw error;
  }
};

export const generateAndStoreRankings = async () => {
  const dataset = await generateRankings();
  await writeRankingDataset(dataset);
  return dataset;
};
