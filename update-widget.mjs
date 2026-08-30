// Calculate time until exactly 9:00 PM UTC (12:00 AM local)
const targetTime = new Date();
targetTime.setUTCHours(21, 0, 0, 0); // Sets target to exactly 21:00:00.000 UTC

const timeToWait = targetTime.getTime() - Date.now();

if (timeToWait > 0) {
  console.log(`Waiting ${Math.floor(timeToWait / 1000)} seconds for exact midnight strike...`);
  // Pauses the script execution until the target time
  await new Promise(resolve => setTimeout(resolve, timeToWait)); 
}

console.log("Striking midnight. Executing Discord update...");
// Place your existing axios/Discord patch request immediately below this

const REQUIRED_VARIABLES = [
  "DISCORD_APP_ID",
  "DISCORD_USER_ID",
  "DISCORD_BOT_TOKEN",
];

for (const variableName of REQUIRED_VARIABLES) {
  const value = process.env[variableName];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${variableName}`,
    );
  }
}

const DISCORD_APP_ID = process.env.DISCORD_APP_ID.trim();
const DISCORD_USER_ID = process.env.DISCORD_USER_ID.trim();
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN.trim();

const NITRO_START_DATE =
  process.env.NITRO_START_DATE?.trim() || "2026-03-15";

const WIDGET_TIME_ZONE =
  process.env.WIDGET_TIME_ZONE?.trim() || "Asia/Qatar";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Parse a YYYY-MM-DD date without allowing JavaScript's automatic
 * date correction to silently accept invalid dates.
 */
function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(
      `NITRO_START_DATE must use YYYY-MM-DD. Received: ${value}`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const timestamp = Date.UTC(year, month - 1, day);
  const verificationDate = new Date(timestamp);

  const isValid =
    verificationDate.getUTCFullYear() === year &&
    verificationDate.getUTCMonth() === month - 1 &&
    verificationDate.getUTCDate() === day;

  if (!isValid) {
    throw new Error(`Invalid NITRO_START_DATE: ${value}`);
  }

  return {
    year,
    month,
    day,
    timestamp,
  };
}

/**
 * Get today's calendar date in the configured timezone.
 */
function getTodayInTimeZone(timeZone) {
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

  return {
    year,
    month,
    day,
    timestamp: Date.UTC(year, month - 1, day),
  };
}

function differenceInDays(startTimestamp, endTimestamp) {
  return Math.floor(
    (endTimestamp - startTimestamp) / MILLISECONDS_PER_DAY,
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date.timestamp));
}

function pluralize(number, singular, plural = `${singular}s`) {
  return number === 1 ? singular : plural;
}

/**
 * Calculate the next Nitro anniversary and lifetime progress.
 */
function calculateWidgetValues() {
  const startDate = parseDateOnly(NITRO_START_DATE);
  const today = getTodayInTimeZone(WIDGET_TIME_ZONE);

  if (today.timestamp < startDate.timestamp) {
    throw new Error(
      `Nitro start date ${NITRO_START_DATE} is in the future.`,
    );
  }

  const anniversaryThisYear = Date.UTC(
    today.year,
    startDate.month - 1,
    startDate.day,
  );

  let completedYears = today.year - startDate.year;

  if (today.timestamp < anniversaryThisYear) {
    completedYears -= 1;
  }

  completedYears = Math.max(0, completedYears);

  const targetYears = completedYears + 1;

  const targetDateTimestamp = Date.UTC(
    startDate.year + targetYears,
    startDate.month - 1,
    startDate.day,
  );

  const elapsedDays = differenceInDays(
    startDate.timestamp,
    today.timestamp,
  );

  const totalDaysToTarget = differenceInDays(
    startDate.timestamp,
    targetDateTimestamp,
  );

  const remainingDays = Math.max(
    0,
    differenceInDays(today.timestamp, targetDateTimestamp),
  );

  const approximateYears = elapsedDays / 365.2425;

  return {
    anniversary_title: `${targetYears} Year Nitro Anniversary`,

    since_text: `Since ${formatDate(startDate)}`,

    years_text:
      `${approximateYears.toFixed(1)} Years since touching grass`,

    progress_title:
      `Road to ${targetYears} ` +
      `${pluralize(targetYears, "Year")} of Nitro!`,

    days_remaining_text:
      `${remainingDays.toLocaleString("en-US")} ` +
      `${pluralize(remainingDays, "Day")} Remaining`,

    progress_current: elapsedDays,

    progress_max: totalDaysToTarget,
  };
}

function createTextField(name, value) {
  return {
    type: 1,
    name,
    value: String(value),
  };
}

function createNumberField(name, value) {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value for ${name}`);
  }

  return {
    type: 2,
    name,
    value,
  };
}

async function updateDiscordWidget() {
  const values = calculateWidgetValues();

  const dynamicFields = [
    createTextField(
      "anniversary_title",
      values.anniversary_title,
    ),

    createTextField(
      "since_text",
      values.since_text,
    ),

    createTextField(
      "years_text",
      values.years_text,
    ),

    createTextField(
      "progress_title",
      values.progress_title,
    ),

    createTextField(
      "days_remaining_text",
      values.days_remaining_text,
    ),

    createNumberField(
      "progress_current",
      values.progress_current,
    ),

    createNumberField(
      "progress_max",
      values.progress_max,
    ),
  ];

  const payload = {
    username: "nitro-anniversary",
    data: {
      dynamic: dynamicFields,
    },
  };

  const endpoint =
    `https://discord.com/api/v9/applications/${DISCORD_APP_ID}` +
    `/users/${DISCORD_USER_ID}/identities/0/profile`;

  const response = await fetch(endpoint, {
    method: "PATCH",

    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "DiscordBot " +
        "(https://github.com/discord/discord-api-docs, 1.0.0)",
    },

    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord widget update failed: HTTP ${response.status}` +
      (responseBody
        ? `\nResponse: ${responseBody.slice(0, 1_000)}`
        : ""),
    );
  }

  console.log("Nitro widget updated successfully.");

  console.log(
    JSON.stringify(
      {
        timezone: WIDGET_TIME_ZONE,
        anniversary: values.anniversary_title,
        since: values.since_text,
        years: values.years_text,
        progress:
          `${values.progress_current}/${values.progress_max}`,
        remaining: values.days_remaining_text,
      },
      null,
      2,
    ),
  );
}

updateDiscordWidget().catch((error) => {
  console.error(
    error instanceof Error ? error.message : String(error),
  );

  process.exitCode = 1;
});
