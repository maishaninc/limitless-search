import "server-only";

import type { AdminBootstrapState, AdminDashboardPreview } from "@/lib/admin-preview";
import { getAdminDashboardPreview } from "@/lib/admin-preview";
import { getCurrentAdminUser, getAdminUserCount } from "@/lib/admin-auth";
import { getAdminRankingWorkspaceData } from "@/lib/admin-rankings";
import { getCaptchaConfig } from "@/lib/captcha";

export const getAdminBootstrapData = async (): Promise<AdminBootstrapState> => {
  const config = getCaptchaConfig();
  const adminUserCount = await getAdminUserCount();

  const helperText =
    config.provider === "none"
      ? "Captcha is disabled. Login and setup can submit directly."
      : config.siteKeyPresent
        ? `The login page uses ${config.provider}. Verification must pass before continuing.`
        : `${config.provider} is enabled but the site key is missing. Update docker-compose.yml before using admin auth.`;

  return {
    setupRequired: adminUserCount === 0,
    captchaProvider: config.provider,
    siteKeyPresent: config.siteKeyPresent,
    siteKey: config.siteKey,
    helperText,
  };
};

export const getAdminDashboardData = async (): Promise<AdminDashboardPreview> => {
  const preview = getAdminDashboardPreview();
  const currentUser = await getCurrentAdminUser();
  const workspace = await getAdminRankingWorkspaceData();
  const latestGenerated =
    workspace.versions.find((version) => version.sourceType === "ai" && version.statusCode === "generated") ||
    null;
  const draftCount = workspace.versions.filter((version) => version.statusCode === "draft").length;

  const summary = [...preview.summary];
  summary[0] = {
    label: "Current Live Version",
    value: workspace.currentPublished.name,
    hint: `Published at ${workspace.currentPublished.publishedAt}.`,
  };
  summary[1] = latestGenerated
    ? {
        label: "Latest AI Run",
        value: latestGenerated.generatedAt || latestGenerated.updatedAt,
        hint: "AI runs are stored as pending versions until an admin clones or publishes them.",
      }
    : {
        label: "Latest AI Run",
        value: "No AI run yet",
        hint: "Run the ranking sync to import the next AI-generated version.",
      };
  summary[2] = {
    label: "Drafts",
    value: String(draftCount),
    hint: "Includes all editable manual drafts and cloned review drafts.",
  };

  if (!currentUser) {
    return {
      ...preview,
      summary,
    };
  }

  summary[3] = {
    label: "Current Admin",
    value: currentUser.email,
    hint: currentUser.lastLoginAt
      ? `Last login ${currentUser.lastLoginAt}`
      : "Recent login time will appear after the first successful session.",
  };

  return {
    ...preview,
    summary,
  };
};

export const getAdminRankingWorkspace = async () => getAdminRankingWorkspaceData();
