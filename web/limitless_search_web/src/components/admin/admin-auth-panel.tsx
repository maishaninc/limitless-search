"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { AdminBootstrapState } from "@/lib/admin-preview";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
    hcaptcha?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  }
}

type AdminAuthPanelProps = {
  bootstrap: AdminBootstrapState;
};

type AuthMode = "setup" | "login";

const loadCaptchaScript = (provider: AdminBootstrapState["captchaProvider"]) =>
  new Promise<void>((resolve, reject) => {
    if (provider === "none") {
      resolve();
      return;
    }

    const scriptId = provider === "turnstile" ? "admin-turnstile-script" : "admin-hcaptcha-script";
    const existing = document.getElementById(scriptId);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src =
      provider === "turnstile"
        ? "https://challenges.cloudflare.com/turnstile/v0/api.js"
        : "https://js.hcaptcha.com/1/api.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load captcha script"));
    document.body.appendChild(script);
  });

export function AdminAuthPanel({ bootstrap }: AdminAuthPanelProps) {
  const initialMode: AuthMode = bootstrap.setupRequired ? "setup" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(bootstrap.captchaProvider === "none");
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);

  const copy = useMemo(
    () =>
      mode === "setup"
        ? {
            eyebrow: "First Setup",
            title: "Create Admin Account",
            description: "Admin email, password hash, and session data are stored in SQLite. After setup succeeds, the page redirects directly into the console.",
            submit: "Create Admin",
          }
        : {
            eyebrow: "Admin Login",
            title: "Open Ranking Console",
            description: "This login page follows the captcha mode from docker-compose.yml. Verification must pass before submitting email and password.",
            submit: "Sign In",
          },
    [mode],
  );

  const captchaLabel =
    bootstrap.captchaProvider === "none"
      ? "Captcha disabled"
      : bootstrap.siteKeyPresent
        ? `${bootstrap.captchaProvider} enabled`
        : `${bootstrap.captchaProvider} missing site key`;

  useEffect(() => {
    let cancelled = false;

    const renderCaptcha = async () => {
      if (
        bootstrap.captchaProvider === "none" ||
        !bootstrap.siteKeyPresent ||
        !bootstrap.siteKey ||
        !captchaContainerRef.current
      ) {
        setCaptchaReady(bootstrap.captchaProvider === "none");
        return;
      }

      setCaptchaReady(false);
      setCaptchaToken(null);

      try {
        await loadCaptchaScript(bootstrap.captchaProvider);
        if (cancelled || !captchaContainerRef.current) return;

        captchaContainerRef.current.innerHTML = "";

        if (bootstrap.captchaProvider === "turnstile" && window.turnstile) {
          window.turnstile.render(captchaContainerRef.current, {
            sitekey: bootstrap.siteKey,
            callback: (token: string) => {
              setCaptchaToken(token);
              setCaptchaReady(true);
            },
            "expired-callback": () => {
              setCaptchaToken(null);
              setCaptchaReady(false);
            },
            "error-callback": () => {
              setCaptchaToken(null);
              setCaptchaReady(false);
              setError("Captcha failed to load. Refresh and try again.");
            },
          });
        } else if (bootstrap.captchaProvider === "hcaptcha" && window.hcaptcha) {
          window.hcaptcha.render(captchaContainerRef.current, {
            sitekey: bootstrap.siteKey,
            callback: (token: string) => {
              setCaptchaToken(token);
              setCaptchaReady(true);
            },
            "expired-callback": () => {
              setCaptchaToken(null);
              setCaptchaReady(false);
            },
            "error-callback": () => {
              setCaptchaToken(null);
              setCaptchaReady(false);
              setError("Captcha failed to load. Refresh and try again.");
            },
          });
        }
      } catch (captchaError) {
        if (!cancelled) {
          setError(captchaError instanceof Error ? captchaError.message : "Captcha script failed to load.");
        }
      }
    };

    renderCaptcha();

    return () => {
      cancelled = true;
    };
  }, [bootstrap.captchaProvider, bootstrap.siteKey, bootstrap.siteKeyPresent, mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Enter admin email and password.");
      return;
    }

    if (mode === "setup") {
      if (!confirmPassword) {
        setError("Repeat the password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    if (bootstrap.captchaProvider !== "none" && !captchaToken) {
      setError("Complete captcha verification first.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "setup" ? "/api/admin/setup" : "/api/admin/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          confirmPassword: mode === "setup" ? confirmPassword : undefined,
          captchaToken,
        }),
      });

      const json = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(json.message || "Request failed.");
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_transparent_45%),linear-gradient(180deg,#f5f5f4_0%,#ffffff_45%,#f5f5f4_100%)] px-4 py-10 text-neutral-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(180deg,#050505_0%,#0a0a0a_45%,#050505_100%)] dark:text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-[32px] border border-neutral-200/80 bg-white/85 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/80"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-1.5 text-xs uppercase tracking-[0.28em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
            <Sparkles className="h-4 w-4" />
            Admin Console
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">{copy.eyebrow}</p>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">{copy.title}</h1>
            <p className="max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300">{copy.description}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <ShieldCheck className="h-5 w-5" />
                Login Security
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                Current captcha state: {captchaLabel}. If enabled, both setup and login require a valid verification token.
              </p>
            </div>
            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <KeyRound className="h-5 w-5" />
                Storage Model
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                Admin email, password hash, sessions, and ranking versions are designed to persist in SQLite.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50/70 p-5 text-sm leading-6 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
              <p>{bootstrap.helperText}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
            {!bootstrap.setupRequired && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-full px-4 py-2.5 font-semibold transition-colors ${
                  mode === "login"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
                }`}
              >
                Sign In
              </button>
            )}
            {bootstrap.setupRequired && (
              <button
                type="button"
                onClick={() => setMode("setup")}
                className="rounded-full bg-black px-4 py-2.5 font-semibold text-white dark:bg-white dark:text-black"
              >
                First Setup
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="rounded-[32px] border border-neutral-200/80 bg-white/90 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/82"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@freeanime.org"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
            </div>

            {mode === "setup" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Repeat Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />
              </div>
            )}

            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-sm font-semibold">Captcha Area</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                This uses the same third-party captcha mode as the homepage. If captcha is enabled, a valid token is required before submit.
              </p>
              <div className="mt-4 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
                {bootstrap.captchaProvider === "none" ? (
                  "No captcha required"
                ) : !bootstrap.siteKeyPresent ? (
                  "Site key missing. Captcha cannot render."
                ) : (
                  <div className="flex w-full flex-col items-center gap-3">
                    <div ref={captchaContainerRef} className="min-h-[78px] w-full flex justify-center" />
                    {!captchaReady && (
                      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-neutral-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading captcha
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {copy.submit}
              </button>

              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-5 py-3.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600"
              >
                Back Home
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
