# chowbot

Version: 0.4.0

Publisher: ChowIndustries

Discord bot for doing different things

## Release Notes

[Invenchecker](#invenchecker)

## Quick Start

```bash
# 1. Create a .env and fill in TOKEN, CLIENT_ID and ADMIN_TOKEN
cp .env.example .env

# 2. Create the host directories and the external network docker-compose.yml expects
sudo mkdir -p /opt/data/chowbot /var/log/chowbot
docker network create invenchecker

# 3. Start the app
docker compose up --build
```

The app runs on port **33002**.

## Configuration

### Database — managed by the bot

`data/chowbot.db` is a SQLite database, created and migrated automatically on startup. It holds:

- karma from reactions and `/etiquette`, and the weekly leaderboard snapshots
- each server's clear and leaderboard channel lists, managed by `/clearchannel` and `/leaderboardchannel`
- invenchecker account links, managed by `/invenchecker account register`
- the leaderboard's Discord username cache. Entries expire after 12 hours, and `POST /admin/clearstate` clears it

Earlier versions kept the channel lists in `data/serverConfig.json`, the invenchecker links in `data/userConfig.json` and the username cache in `data/sessionState.json`. They are imported into the database once, on the first start after upgrading, and the files are no longer used after that.

---

### applicationConfig.json — managed manually

`data/applicationConfig.json` is edited by hand and loaded at startup. Changes take effect immediately after `POST /admin/reloadconfig`, with no restart needed.

```json
{
  "emojiUpvoteId": "<applicationEmojiId>",
  "emojiDownvoteId": "<applicationEmojiId>",
  "domainList": ["youtube.com"],
  "statuses": [{ "name": "something", "type": "Watching" }]
}
```

| Field             | Type               | Description                                                                                                         |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `emojiUpvoteId`   | `string`           | Application emoji ID for upvote reactions                                                                           |
| `emojiDownvoteId` | `string`           | Application emoji ID for downvote reactions                                                                         |
| `domainList`      | `string[]`         | Domains that trigger karma reactions on message post/edit                                                           |
| `statuses`        | `{ name, type }[]` | Bot status rotation (cycles daily). `type` is a Discord `ActivityType` name e.g. `Watching`, `Playing`, `Listening` |

Emoji IDs are validated against the bot's application emojis on startup. If either is invalid, karma reactions are disabled entirely until the config is fixed and reloaded.

## Discord Commands

All commands except `/invenchecker` can only be used in a server.

After changing a command's options, deploy the commands again (see [API Endpoints](#api-endpoints)).

### Utility

| Command   | Description                                         | Permission    |
| --------- | --------------------------------------------------- | ------------- |
| `/health` | Shows bot health status (uptime, WS ping, database) | Administrator |

### Karma

| Command        | Options                                           | Description                                                              | Permission   |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------ | ------------ |
| `/checkkarma`  | `whos` (user, optional)                           | Check karma for yourself or another user                                 | Everyone     |
| `/etiquette`   | `who` (user), `good` (boolean), `reason` (string) | Report a user for good/bad etiquette. One report per user every 24 hours | Everyone     |
| `/leaderboard` | —                                                 | Show the karma weekly leaderboard                                        | Everyone     |
| `/react`       | `message_id` (string)                             | Add the karma reactions to a message in this channel                     | Manage Roles |

### Leaderboard Channels

The weekly karma leaderboard is posted to these channels every Sunday at 21:00 UTC.

| Command                      | Options               | Description                               | Permission    |
| ---------------------------- | --------------------- | ----------------------------------------- | ------------- |
| `/leaderboardchannel add`    | `channel` (channel)   | Post the weekly leaderboard in a channel  | Administrator |
| `/leaderboardchannel remove` | `channel_id` (string) | Stop posting the leaderboard in a channel | Administrator |
| `/leaderboardchannel list`   | —                     | List leaderboard channels                 | Administrator |

### Message Clearer

| Command                | Options               | Description                                                    | Permission    |
| ---------------------- | --------------------- | -------------------------------------------------------------- | ------------- |
| `/clearchannel add`    | `channel` (channel)   | **DANGEROUS** — Add a channel to be cleared daily at 05:00 UTC | Administrator |
| `/clearchannel remove` | `channel_id` (string) | Remove a channel from the daily clear list                     | Administrator |
| `/clearchannel list`   | —                     | List channels currently in the clear list                      | Administrator |

`add` only accepts channels in the server you run it from. `remove` takes an ID so you can also remove a channel that has since been deleted.

### Invenchecker

| Command                          | Options                                      | Description                                                       | Permission |
| -------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `/invenchecker account register` | —                                            | Register your Discord account with invenchecker                   | Everyone   |
| `/invenchecker steam add`        | `id` (17 digits)                             | Add a Steam64 ID to your account                                  | Everyone   |
| `/invenchecker steam remove`     | `id`                                         | Remove a Steam64 ID from your account                             | Everyone   |
| `/invenchecker item add`         | `name`                                       | Add a custom item to track (by `market_hash_name`)                | Everyone   |
| `/invenchecker item remove`      | `name`                                       | Remove a custom tracked item                                      | Everyone   |
| `/invenchecker alerts list`      | —                                            | List unresolved price alerts                                      | Everyone   |
| `/invenchecker alerts resolve`   | —                                            | Resolve all unresolved alerts                                     | Everyone   |
| `/invenchecker view summary`     | —                                            | Inventory summary with latest prices per tracked item             | Everyone   |
| `/invenchecker view progress`    | —                                            | Scan state (queued, last fetched, next scan) per account and item | Everyone   |
| `/invenchecker view prices`      | `days` (1–365, default 7), `item` (optional) | Price history for your custom tracked items                       | Everyone   |

## API Endpoints

### Health

| Method | Path      | Description                                  |
| ------ | --------- | -------------------------------------------- |
| `GET`  | `/health` | Returns bot health status. 503 if unhealthy. |

### Admin

Every admin route needs an `Authorization: Bearer <ADMIN_TOKEN>` header. If `ADMIN_TOKEN` isn't set, the admin API is disabled and returns 503.

| Method | Path                                   | Body                       | Description                                                                        |
| ------ | -------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `POST` | `/admin/clearstate`                    | —                          | Clear session state (username cache)                                               |
| `POST` | `/admin/reloadconfig`                  | —                          | Reload `applicationConfig.json` from disk                                          |
| `POST` | `/admin/deploycommands`                | `{}` or `{"serverId":"…"}` | Deploy slash commands globally or to a specific guild. 502 if Discord rejects them |
| `POST` | `/admin/sendLeaderboardRoute`          | —                          | Send karma weekly leaderboard now (responds 202)                                   |
| `POST` | `/admin/persistKarmaWeeklyLeaderboard` | —                          | Persist weekly leaderboard snapshot (responds 202)                                 |

**Examples:**

```bash
AUTH="Authorization: Bearer $ADMIN_TOKEN"

curl -X POST -H "$AUTH" http://localhost:33002/admin/reloadconfig
curl -X POST -H "$AUTH" http://localhost:33002/admin/clearstate

# Deploy commands globally
curl -X POST -H "$AUTH" http://localhost:33002/admin/deploycommands \
  -H "Content-Type: application/json" -d '{}'

# Deploy commands to one server
curl -X POST -H "$AUTH" http://localhost:33002/admin/deploycommands \
  -H "Content-Type: application/json" -d '{"serverId":"YOUR_SERVER_ID"}'
```

Commands can also be deployed at startup with the `--deploy-commands` flag:

```bash
# Local
node src/index.js --deploy-commands
npm run dev -- --deploy-commands
```

In Docker, either run it as a one-off:

```bash
docker compose run --rm chowbot node src/index.js --deploy-commands
```

Or temporarily add `command` to `docker-compose.yml`, bring it up, then remove it again:

```yaml
services:
  chowbot:
    command: node src/index.js --deploy-commands
```

> Don't leave the `command` override permanently — it will redeploy on every container restart and hit Discord's API rate limits.

## Environment Variables

Configured in `.env` or the host environment; variables already set in the environment take precedence over `.env`. See `.env.example`, and `config.js` for the defaults.

| Variable               | Default                  | Required | Description                                                          |
| ---------------------- | ------------------------ | -------- | -------------------------------------------------------------------- |
| `TOKEN`                | —                        | Yes      | Discord bot token                                                    |
| `CLIENT_ID`            | —                        | Yes      | Discord application client ID                                        |
| `PORT`                 | `33002`                  | No       | HTTP server port                                                     |
| `INVENCHECKER_API_URL` | `http://localhost:33001` | No       | Base URL for the invenchecker API                                    |
| `ADMIN_TOKEN`          | —                        | No       | Bearer token for the admin API. The admin API is disabled without it |
| `LOG_LEVEL`            | `info`                   | No       | `trace`, `debug`, `info`, `warn`, `error` or `fatal`                 |

## Local Development (without Docker)

Needs Node 24 or newer. `npm run dev` restarts on save.

```bash
npm install
cp .env.example .env
npm run dev
```

```bash
npm test       # jest
npm run lint   # eslint
```
