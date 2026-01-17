import { NextRequest, NextResponse } from "next/server";

const AI_ENABLED = (process.env.NEXT_PUBLIC_AI_SUGGEST_ENABLED ?? "true").toLowerCase() !== "false";
const CAPTCHA_PROVIDER = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "none").toLowerCase();

const AI_BASE = process.env.AI_SUGGEST_BASE_URL?.replace(/\/$/, "") || "";
const AI_MODEL = process.env.AI_SUGGEST_MODEL || "";
const AI_API_KEY = process.env.AI_SUGGEST_API_KEY || "";
const CUSTOM_PROMPT = process.env.AI_SUGGEST_PROMPT || "";

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : null;
  } catch (err) {
    return null;
  }
};

const buildPrompt = (language: string) => {
  if (CUSTOM_PROMPT.trim()) return CUSTOM_PROMPT;
  return [
    "You are an anime title resolver.",
    "Input may be long, translated, aliased, or misspelled (often Chinese). Infer the official/original release title; prefer Japanese official title if it exists, otherwise the official English/Romanized title.",
    "Output strict JSON only with keys: best_query (string), alternates (array, up to 3 strings), reason (string, <= 25 chars), original_language (string).",
    "best_query must be an exact official title (no descriptions).",
    "alternates should include concise aliases/root franchise names (max 3).",
    `All text must be in site language: ${language}.`
  ].join(" ");
};

type SuggestBody = {
  query?: string;
  language?: string;
  resultCount?: number;
  captchaToken?: string;
  captcha_token?: string;
};

type AiSuggestion = {
  best_query?: string;
  alternates?: string[];
  reason?: string;
  original_language?: string;
  raw?: unknown;
};

export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ message: "AI suggestion is disabled" }, { status: 403 });
  }

  if (!AI_BASE || !AI_API_KEY || !AI_MODEL) {
    return NextResponse.json(
      { message: "AI configuration missing (base url / api key / model)" },
      { status: 400 },
    );
  }

  let body: SuggestBody = {};
  try {
    body = (await request.json()) as SuggestBody;
  } catch (error) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.query || "").toString().trim();
  const language = (body.language || "en").toString();
  const resultCount = Number(body.resultCount ?? 0);

  if (!query) {
    return NextResponse.json({ message: "Missing query" }, { status: 400 });
  }


  const userPrompt = `User search query: "${query}". Current site language: ${language}. Current search results: ${resultCount}. Return JSON with best_query, alternates, reason, original_language. If unsure, output the most likely official title.`;

  const upstreamPayload = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: buildPrompt(language) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  };

  const upstream = await fetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(upstreamPayload),
  });

  const contentType = upstream.headers.get("content-type") || "";
  const text = await upstream.text();

  if (!upstream.ok) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(safeJsonParse(text) || { message: text || "Upstream error" }, {
        status: upstream.status,
      });
    }
    return new NextResponse(text || "Upstream error", { status: upstream.status });
  }

  let suggestion: AiSuggestion | null = null;
  const parsed = safeJsonParse(text) as any;
  const rawContent: string | undefined = parsed?.choices?.[0]?.message?.content || text;

  if (rawContent) {
    const jsonCandidate = safeJsonParse(rawContent);
    if (jsonCandidate && typeof jsonCandidate === "object") {
      suggestion = { ...(jsonCandidate as AiSuggestion), raw: rawContent };
    } else if (typeof rawContent === "string") {
      suggestion = { best_query: rawContent.trim(), raw: rawContent };
    }
  }

  return NextResponse.json({ suggestion: suggestion ?? { raw: text } });
}
