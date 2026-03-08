import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { detectPreferredLanguage, languageToLocale } from "@/lib/i18n";

const siteUrl = "https://search.freeanime.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Limitless Search | 无限搜索",
    template: "%s | Limitless Search",
  },
  description:
    "Limitless Search（无限搜索）- 免费搜索动漫与网盘资源，无需登录，快速聚合多平台结果。",
  keywords: [
    "Limitless Search",
    "无限搜索",
    "免费搜索动漫",
    "搜索动漫",
    "免费动漫",
    "无需登录",
    "动漫搜索",
    "网盘搜索",
    "anime search",
    "free anime search",
    "anime resources",
    "anime streaming search",
    "netdisk search",
    "アニメ検索",
    "無料アニメ",
    "бесплатный поиск аниме",
    "recherche anime gratuite",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      "zh-TW": "/",
      en: "/",
      ja: "/",
      ru: "/",
      fr: "/",
    },
  },
  openGraph: {
    title: "Limitless Search | 无限搜索",
    description:
      "免费搜索动漫与网盘资源，无需登录，快速聚合多平台结果。",
    url: siteUrl,
    siteName: "Limitless Search",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Limitless Search | 无限搜索",
    description:
      "免费搜索动漫与网盘资源，无需登录，快速聚合多平台结果。",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "theme-color": "#ffffff",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const htmlLang = languageToLocale(detectPreferredLanguage(requestHeaders.get("accept-language")));

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Limitless Search",
              alternateName: "无限搜索",
              url: siteUrl,
              description:
                "免费搜索动漫与网盘资源，无需登录，快速聚合多平台结果。",
              sameAs: ["https://github.com/maishaninc/limitless-search"],
              inLanguage: ["zh-CN", "zh-TW", "en", "ja", "ru", "fr"],
            }),
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
