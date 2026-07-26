# Nitro Widget Auto-Updater

Updates a Discord Profile Widget once daily.

## Exact Discord User Data fields

- `anniversary_title` — String
- `since_text` — String
- `years_text` — String
- `progress_title` — String
- `days_remaining_text` — String
- `progress_current` — Number
- `progress_max` — Number

Images such as `hero_image` and `progress_icon` can keep using Application Asset fallbacks.

## Required GitHub Actions secrets

Open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `DISCORD_APP_ID`
- `DISCORD_USER_ID`
- `DISCORD_BOT_TOKEN`

Never commit the bot token into a file.

## Current configuration

- Nitro start date: `2026-03-15`
- Timezone: `Asia/Qatar`
- Daily update: 00:17 Qatar time

Edit `.github/workflows/daily-update.yml` if either value is wrong.

## Test

Open **Actions → Update Nitro Widget → Run workflow**.

A successful log says `Nitro widget updated successfully.`

If Discord returns HTTP 403 with `Missing required OAuth2 scope`, authorize this Discord application with `openid` and `sdk.social_layer`.
