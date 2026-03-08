import type { MetadataRoute } from "next";
import { getRankingLandingUrls, readRankingDataset } from "@/lib/rankings";
import { rankingsEnabled } from "@/lib/rankings-config";

const siteUrl = "https://search.freeanime.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  if (!rankingsEnabled()) {
    return entries;
  }

  const dataset = await readRankingDataset();
  if (!dataset) {
    return entries;
  }

  entries.push({
    url: `${siteUrl}/rankings`,
    changeFrequency: "daily",
    priority: 0.8,
    lastModified: dataset.generatedAt,
  });

  for (const url of getRankingLandingUrls(dataset)) {
    entries.push({
      url: `${siteUrl}${url}`,
      changeFrequency: "daily",
      priority: 0.7,
      lastModified: dataset.generatedAt,
    });
  }

  return entries;
}
