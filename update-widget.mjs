const REQUIRED = ["DISCORD_APP_ID", "DISCORD_USER_ID", "DISCORD_BOT_TOKEN"];

for (const key of REQUIRED) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const APP_ID = process.env.DISCORD_APP_ID.trim();
const USER_ID = process.env.DISCORD_USER_ID.trim();
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN.trim();
const START_DATE = (process.env.NITRO_START_DATE || "2026-03-15").trim();
const TIME_ZONE = (process.env.WIDGET_TIME_ZONE || "Asia/Qatar").trim();

const DAY_MS = 86_400_000;

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`NITRO_START_DATE must use YYYY-MM-DD, received: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid NITRO_START_DATE: ${value}`);
  }

  return { year, month, day, timestamp };
}

function currentDateInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return { year, month, day, timestamp: Date.UTC(year, month - 1, day) };
}

function daysBetween(startTimestamp, endTimestamp) {
  return Math.floor((endTimestamp - startTimestamp) / DAY_MS);
}

function formatStartDate(start) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(start.timestamp));
}

function plural(value, singular, pluralForm = `${singular}s`) {
  return value === 1 ? singular : pluralForm;
}

function buildValues() {
  const start = parseDateOnly(START_DATE);
  const today = currentDateInTimeZone(TIME_ZONE);

  if (today.timestamp < start.timestamp) {
    throw new Error(`Nitro start date ${START_DATE} is after today's date in ${TIME_ZONE}.`);
  }

  const anniversaryThisYear = Date.UTC(today.year, start.month - 1, start.day);
  let completedYears = today.year - start.year;
  if (today.timestamp < anniversaryThisYear) completedYears -= 1;
  completedYears = Math.max(0, completedYears);

  const targetYears = completedYears + 1;
  const targetTimestamp = Date.UTC(start.year + targetYears, start.month - 1, start.day);
  const elapsedDays = daysBetween(start.timestamp, today.timestamp);
  const totalTargetDays = daysBetween(start.timestamp, targetTimestamp);
  const remainingDays = Math.max(0, daysBetween(today.timestamp, targetTimestamp));
  const elapsedYears = elapsedDays / 365.2425;

  return {
    anniversary_title: `${targetYears} Year Nitro Anniversary`,
    since_text: `Since ${formatStartDate(start)}`,
    years_text: `${elapsedYears.toFixed(1)} Years since touching grass`,
    progress_title: `Road to ${targetYears} ${plural(targetYears, "Year")} of Nitro!`,
    days_remaining_text: `${remainingDays.toLocaleString("en-US")} ${plural(remainingDays, "Day")} Remaining`,
    progress_current: elapsedDays,
    progress_max: totalTargetDays,
  };
}

function textField(name, value) {
  return { type: 1, name, value: String(value) };
}

function numberField(name, value) {
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric value for ${name}`);
  return { type: 2, name, value };
}

async function updateWidget() {
  const values = buildValues();
  const payload = {
    username: "nitro-anniversary",
    data: {
      dynamic: [
        textField("anniversary_title", values.anniversary_title),
        textField("since_text", values.since_text),
        textField("years_text", values.years_text),
        textField("progress_title", values.progress_title),
        textField("days_remaining_text", values.days_remaining_text),
        numberField("progress_current", values.progress_current),
        numberField("progress_max", values.progress_max),
      ],
    },
  };

  const endpoint = `https://discord.com/api/v9/applications/${APP_ID}/users/${USER_ID}/identities/0/profile`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const safeBody = responseText.slice(0, 500);
    throw new Error(`Discord update failed: HTTP ${response.status}${safeBody ? ` | ${safeBody}` : ""}`);
  }

  console.log("Nitro widget updated successfully.");
  console.log(JSON.stringify({
    dateTimeZone: TIME_ZONE,
    anniversary: values.anniversary_title,
    progress: `${values.progress_current}/${values.progress_max}`,
    remaining: values.days_remaining_text,
  }, null, 2));
}

updateWidget().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
