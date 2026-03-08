import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://backend:8888";

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : {};
  } catch {
    return { message: input };
  }
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const provider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "none").toLowerCase();

    if (provider === "turnstile" || provider === "hcaptcha") {
      const tokenFromHeader = request.headers.get("x-captcha-token");
      const tokenFromBody =
        typeof payload?.captchaToken === "string"
          ? payload.captchaToken
          : typeof payload?.captcha_token === "string"
            ? payload.captcha_token
            : undefined;
      const token = tokenFromHeader || tokenFromBody;

      if (!token) {
        return NextResponse.json({ message: "Captcha token missing" }, { status: 400 });
      }

      const remoteIp =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("cf-connecting-ip") ||
        undefined;

      const verifyUrl =
        provider === "turnstile"
          ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
          : "https://hcaptcha.com/siteverify";

      const secret =
        provider === "turnstile"
          ? process.env.TURNSTILE_SECRET_KEY
          : process.env.HCAPTCHA_SECRET_KEY;

      if (!secret) {
        return NextResponse.json({ message: "Captcha secret not configured" }, { status: 400 });
      }

      const form = new URLSearchParams();
      form.append("secret", secret);
      form.append("response", token);
      if (remoteIp) form.append("remoteip", remoteIp);

      const verifyResp = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      const verifyJson = await verifyResp.json();
      if (!verifyJson?.success) {
        return NextResponse.json(
          { message: "Captcha validation failed", detail: verifyJson?.["error-codes"] },
          { status: 400 },
        );
      }
    }

    const upstream = await fetch(`${UPSTREAM_BASE}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const responseBody = await upstream.text();

    const isJson = contentType.includes("application/json");

    if (!upstream.ok) {
      if (isJson) {
        return NextResponse.json(safeJsonParse(responseBody), {
          status: upstream.status,
        });
      }
      return new NextResponse(responseBody || "Upstream error", {
        status: upstream.status,
      });
    }

    if (isJson) {
      return NextResponse.json(safeJsonParse(responseBody), {
        status: upstream.status,
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        "X-Debug-Version": "local-config-v1"
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach backend";
    return NextResponse.json(
      {
        message,
      },
      { status: 502 },
    );
  }
}
