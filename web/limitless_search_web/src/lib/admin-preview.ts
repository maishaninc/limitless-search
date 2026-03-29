export type CaptchaProvider = "turnstile" | "hcaptcha" | "none";

export type AdminBootstrapState = {
  setupRequired: boolean;
  captchaProvider: CaptchaProvider;
  siteKeyPresent: boolean;
  siteKey?: string;
  helperText: string;
};

export type AdminSummaryCard = {
  label: string;
  value: string;
  hint: string;
};

export type AdminActivity = {
  title: string;
  time: string;
  detail: string;
};

export type AdminDashboardPreview = {
  summary: AdminSummaryCard[];
  activities: AdminActivity[];
};

export type AdminRankingEntry = {
  id: string;
  title: string;
  score: number;
  query: string;
  displayTime?: string;
  sourceUrl?: string;
  hidden?: boolean;
  sourceType?: string;
  status: "published" | "draft" | "generated";
};

export type AdminRankingSection = {
  key: "yearly" | "monthly" | "daily" | "bili_rank";
  title: string;
  description: string;
  items: AdminRankingEntry[];
};

export type AdminRankingVersion = {
  id: string;
  name: string;
  source: "AI Generated" | "Handmade" | "AI Clone";
  status: "Published" | "Draft" | "Pending";
  updatedAt: string;
  sourceType: "ai" | "manual" | "clone";
  statusCode: "published" | "draft" | "generated";
  year: number;
  month: number;
  generatedAt?: string;
  publishedAt?: string | null;
  operator?: string | null;
};

export type AdminRankingWorkspace = {
  currentPublished: {
    id: string;
    name: string;
    generatedAt: string;
    publishedAt: string;
    operator: string;
  };
  draft: {
    id: string;
    name: string;
    updatedAt: string;
    sections: AdminRankingSection[];
  };
  versions: AdminRankingVersion[];
};

const resolveCaptchaProvider = (): CaptchaProvider => {
  const provider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "none").toLowerCase();
  if (provider === "turnstile" || provider === "hcaptcha") {
    return provider;
  }
  return "none";
};

export const getAdminBootstrapPreview = (): AdminBootstrapState => {
  const captchaProvider = resolveCaptchaProvider();
  const siteKeyPresent =
    captchaProvider === "turnstile"
      ? Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
      : captchaProvider === "hcaptcha"
        ? Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY)
        : true;

  const helperText =
    captchaProvider === "none"
      ? "Captcha is disabled. Login and first-time setup can submit directly."
      : siteKeyPresent
        ? `The login page uses ${captchaProvider}. Users must pass verification before continuing.`
        : `${captchaProvider} is enabled but the site key is missing. Update docker-compose.yml before using admin auth.`;

  return {
    setupRequired: true,
    captchaProvider,
    siteKeyPresent,
    siteKey:
      captchaProvider === "turnstile"
        ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
        : captchaProvider === "hcaptcha"
          ? process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""
          : "",
    helperText,
  };
};

export const getAdminDashboardPreview = (): AdminDashboardPreview => ({
  summary: [
    {
      label: "Current Live Version",
      value: "Spring 2026 Board",
      hint: "Published. The public /rankings page reads this version.",
    },
    {
      label: "Latest AI Run",
      value: "Today 03:00",
      hint: "New runs stay pending review and do not overwrite live data.",
    },
    {
      label: "Drafts",
      value: "2",
      hint: "Includes one AI clone and one manual draft.",
    },
    {
      label: "Admin State",
      value: "SQLite Connected",
      hint: "Admin auth, sessions, drafts, and published ranking versions persist in SQLite.",
    },
  ],
  activities: [
    {
      title: "Monthly draft updated",
      time: "10 minutes ago",
      detail: "Added Lazarus and raised Mobile Suit Gundam GQuuuuuuX.",
    },
    {
      title: "AI generation finished",
      time: "Today 03:08",
      detail: "Generated four ranking groups and fetched the Bilibili board successfully.",
    },
    {
      title: "Live version published",
      time: "Yesterday 21:32",
      detail: "Published by admin@freeanime.org, replacing the previous 2026-03-14 draft.",
    },
  ],
});

export const getAdminRankingWorkspace = (): AdminRankingWorkspace => ({
  currentPublished: {
    id: "v20260315-published",
    name: "Spring 2026 Live",
    generatedAt: "2026-03-15 03:08",
    publishedAt: "2026-03-15 09:20",
    operator: "admin@freeanime.org",
  },
  draft: {
    id: "v20260315-draft",
    name: "Spring 2026 Review Draft",
    updatedAt: "2026-03-15 10:18",
    sections: [
      {
        key: "yearly",
        title: "Yearly Upcoming",
        description: "Focuses on high-attention upcoming titles and can be manually corrected.",
        items: [
          { id: "y1", title: "Chainsaw Man Reze Arc", score: 94.6, query: "Chainsaw Man Reze Arc", status: "draft", sourceType: "clone" },
          { id: "y2", title: "Demon Slayer Infinity Castle", score: 93.9, query: "Demon Slayer Infinity Castle", status: "draft", sourceType: "clone" },
          { id: "y3", title: "Bocchi the Rock Season 2", score: 90.8, query: "Bocchi the Rock Season 2", status: "generated", sourceType: "ai" },
        ],
      },
      {
        key: "monthly",
        title: "Monthly Seasonal",
        description: "Focuses on current-month airing shows and allows manual fine tuning.",
        items: [
          { id: "m1", title: "Mobile Suit Gundam GQuuuuuuX", score: 91.4, query: "Mobile Suit Gundam GQuuuuuuX", status: "draft", sourceType: "clone" },
          { id: "m2", title: "Lazarus", score: 89.2, query: "Lazarus", status: "published", sourceType: "clone" },
          { id: "m3", title: "Apocalypse Hotel", score: 86.7, query: "Apocalypse Hotel", status: "generated", sourceType: "ai" },
        ],
      },
      {
        key: "daily",
        title: "Daily Hot",
        description: "Keeps only released or currently airing titles and supports manual cleanup.",
        items: [
          { id: "d1", title: "The Apothecary Diaries Season 2", score: 92.8, query: "The Apothecary Diaries Season 2", status: "published", sourceType: "clone" },
          { id: "d2", title: "Solo Leveling Season 2", score: 90.5, query: "Solo Leveling Season 2", status: "draft", sourceType: "clone" },
          { id: "d3", title: "BanG Dream! Ave Mujica", score: 88.3, query: "BanG Dream! Ave Mujica", status: "generated", sourceType: "ai" },
        ],
      },
      {
        key: "bili_rank",
        title: "Bilibili Board",
        description: "Auto-fetched results that can be hidden or supplemented manually.",
        items: [
          { id: "b1", title: "Ling Cage Season 2", score: 98.0, query: "Ling Cage Season 2", status: "generated", sourceType: "ai" },
          { id: "b2", title: "A Record of a Mortal's Journey", score: 94.2, query: "A Record of a Mortal's Journey", status: "generated", sourceType: "ai" },
          { id: "b3", title: "Tales of Herding Gods", score: 90.4, query: "Tales of Herding Gods", status: "generated", sourceType: "ai" },
        ],
      },
    ],
  },
  versions: [
    { id: "v20260315-published", name: "Spring 2026 Live", source: "AI Clone", status: "Published", updatedAt: "2026-03-15 09:20", sourceType: "clone", statusCode: "published", year: 2026, month: 3, generatedAt: "2026-03-15 03:08", publishedAt: "2026-03-15 09:20", operator: "admin@freeanime.org" },
    { id: "v20260315-draft", name: "Spring 2026 Review Draft", source: "AI Clone", status: "Draft", updatedAt: "2026-03-15 10:18", sourceType: "clone", statusCode: "draft", year: 2026, month: 3, generatedAt: "2026-03-15 03:08", operator: "admin@freeanime.org" },
    { id: "v20260315-ai", name: "AI Run 2026-03-15 03:08", source: "AI Generated", status: "Pending", updatedAt: "2026-03-15 03:08", sourceType: "ai", statusCode: "generated", year: 2026, month: 3, generatedAt: "2026-03-15 03:08" },
    { id: "v20260314-manual", name: "Manual Monthly Experiment", source: "Handmade", status: "Draft", updatedAt: "2026-03-14 18:46", sourceType: "manual", statusCode: "draft", year: 2026, month: 3, generatedAt: "2026-03-14 18:46", operator: "admin@freeanime.org" },
  ],
});
