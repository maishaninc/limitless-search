const port = process.env.PORT || "3200";
const enabled = (process.env.AI_RANKINGS_ENABLED || "false").toLowerCase() === "true";
const runAt = process.env.AI_RANKINGS_RUN_AT || "03:00";
const timeZone = process.env.AI_RANKINGS_TIMEZONE || "Asia/Shanghai";
const runOnStartup = (process.env.AI_RANKINGS_RUN_ON_STARTUP || "false").toLowerCase() === "true";
const token = process.env.AI_RANKINGS_SYNC_TOKEN || "";
let lastRunKey = "";

const currentClock = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeKey: `${parts.hour}:${parts.minute}`,
  };
};

const triggerSync = async (reason) => {
  if (!token) {
    console.warn("[rankings] skipped sync: AI_RANKINGS_SYNC_TOKEN missing");
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/rankings/sync`, {
      method: "POST",
      headers: {
        "x-rankings-token": token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[rankings] sync failed (${response.status}): ${text}`);
      return;
    }
    console.log(`[rankings] sync success (${reason}): ${text}`);
  } catch (error) {
    console.error("[rankings] sync error", error);
  }
};

require("./server.js");

if (enabled) {
  if (runOnStartup) {
    setTimeout(() => {
      triggerSync("startup");
    }, 15000);
  }

  setInterval(() => {
    const { dateKey, timeKey } = currentClock();
    if (timeKey !== runAt || lastRunKey === dateKey) {
      return;
    }

    lastRunKey = dateKey;
    triggerSync("schedule");
  }, 30000);
}
