import "server-only";

import type { NextRequest } from "next/server";

export type CaptchaProvider = "turnstile" | "hcaptcha" | "none";

export type CaptchaConfig = {
  provider: CaptchaProvider;
  siteKey: string;
  siteKeyPresent: boolean;
};

export const getCaptchaConfig = (): CaptchaConfig => {
  const rawProvider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "none").toLowerCase();
  const provider: CaptchaProvider =
    rawProvider === "turnstile" || rawProvider === "hcaptcha" ? rawProvider : "none";

  const siteKey =
    provider === "turnstile"
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
      : provider === "hcaptcha"
        ? process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""
        : "";

  return {
    provider,
    siteKey,
    siteKeyPresent: provider === "none" ? true : Boolean(siteKey),
  };
};

export const verifyCaptchaToken = async (
  request: NextRequest,
  token?: string | null,
) => {
  const config = getCaptchaConfig();
  if (config.provider === "none") {
    return { ok: true as const };
  }

  if (!token) {
    return { ok: false as const, message: "Captcha token missing" };
  }

  const verifyUrl =
    config.provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://hcaptcha.com/siteverify";

  const secret =
    config.provider === "turnstile"
      ? process.env.TURNSTILE_SECRET_KEY
      : process.env.HCAPTCHA_SECRET_KEY;

  if (!secret) {
    return { ok: false as const, message: "Captcha secret not configured" };
  }

  const remoteIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("cf-connecting-ip") ||
    undefined;

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    success?: boolean;
    ["error-codes"]?: string[];
  };

  if (!json?.success) {
    return {
      ok: false as const,
      message: "Captcha validation failed",
      detail: json?.["error-codes"] || [],
    };
  }

  return { ok: true as const };
};
