# chowbot

Version: 0.4.0

Publisher: ChowIndustries

Discord bot for doing different things

## Release Notes

[Invenchecker](#invenchecker)

## Quick Start

```bash
# 1. Create required host directory
mkdir -p data

# 2. Start the app
docker compose up --build
```

The app runs on port **33002**.

## Configuration

### serverConfig.json — managed by the Discord server

`data/serverConfig.json` is written to at runtime by Discord slash commands. You should not edit it manually. It is keyed by guild ID.

```json
{
  "<guildId>": {
    "clearChannels": ["<channelId>"],
    "leaderboardChannels": ["<channelId>"]
  }
}
```

| Field                 | Type       | Managed by                                   |
| --------------------- | ---------- | -------------------------------------------- |
| `clearChannels`       | `string[]` | `/clearchannel add` / `/clearchannel remove` |
| `leaderboardChannels` | `string[]` | (internal)                                   |

---

### sessionState.json — managed automatically

`data/sessionState.json` is written to at runtime as a persistent cache. You should not edit it manually. Clear it with `POST /admin/clearstate`.

```json
{
  "usernames": {
    "<discordUserId>": { "username": "<string>", "cachedAt": "<timestamp ms>" }
  }
}
```

| Field       | Type                                 | Description                                                                          |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `usernames` | `{ userId: { username, cachedAt } }` | Discord username cache used by the karma leaderboard. Entries expire after 12 hours. |

---

### userConfig.json — managed by users

`data/userConfig.json` is written to at runtime by user-facing slash commands. You should not edit it manually. It is keyed by Discord user ID (global across all servers).

```json
{
  "<discordUserId>": {
    "invencheckerId": "<uid>"
  }
}
```

| Field            | Type     | Managed by                       |
| ---------------- | -------- | -------------------------------- |
| `invencheckerId` | `string` | `/invenchecker account register` |

---

### applicationConfig.json — managed manually

`data/applicationConfig.json` is edited by hand and loaded at startup. Changes take effect immediately after running `/dev reloadconfig` or `POST /admin/reloadconfig` — no restart needed.

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

### Utility

| Command   | Description                                         | Permission    |
| --------- | --------------------------------------------------- | ------------- |
| `/health` | Shows bot health status (uptime, WS ping, database) | Administrator |

### Karma

| Command        | Options                                           | Description                              | Permission |
| -------------- | ------------------------------------------------- | ---------------------------------------- | ---------- |
| `/checkkarma`  | `whos` (user, optional)                           | Check karma for yourself or another user | Everyone   |
| `/etiquette`   | `who` (user), `good` (boolean), `reason` (string) | Report a user for good/bad etiquette     | Everyone   |
| `/leaderboard` | —                                                 | Show the karma weekly leaderboard        | Everyone   |

### Message Clearer

| Command                | Options                | Description                                                    | Permission    |
| ---------------------- | ---------------------- | -------------------------------------------------------------- | ------------- |
| `/clearchannel add`    | `channel_id`           | **DANGEROUS** — Add a channel to be cleared daily at 05:00 UTC | Administrator |
| `/clearchannel remove` | `channel_id`           | Remove a channel from the daily clear list                     | Administrator |
| `/clearchannel list`   | —                      | List channels currently in the clear list                      | Administrator |
| `/runclear`            | `confirm` (type `RUN`) | **DANGEROUS** — Manually run the channel clear                 | Administrator |

### Invenchecker

| Command                       | Options                                         | Description                                                       | Permission |
| ----------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `/invenchecker account register` | —                                            | Register your Discord account with invenchecker                   | Everyone   |
| `/invenchecker steam add`     | `id`                                            | Add a Steam64 ID to your account                                  | Everyone   |
| `/invenchecker steam remove`  | `id`                                            | Remove a Steam64 ID from your account                             | Everyone   |
| `/invenchecker item add`      | `name`                                          | Add a custom item to track (by `market_hash_name`)                | Everyone   |
| `/invenchecker item remove`   | `name`                                          | Remove a custom tracked item                                      | Everyone   |
| `/invenchecker alerts list`   | —                                               | List unresolved price alerts                                      | Everyone   |
| `/invenchecker alerts resolve` | —                                              | Resolve all unresolved alerts                                     | Everyone   |
| `/invenchecker view summary`  | —                                               | Inventory summary with latest prices per tracked item             | Everyone   |
| `/invenchecker view progress` | —                                               | Scan state (queued, last fetched, next scan) per account and item | Everyone   |
| `/invenchecker view prices`   | `days` (int, default 7), `item` (str, optional) | Price history for your custom tracked items                       | Everyone   |

## API Endpoints

### Health

| Method | Path      | Description                                  |
| ------ | --------- | -------------------------------------------- |
| `GET`  | `/health` | Returns bot health status. 503 if unhealthy. |

### Admin

| Method | Path                                   | Body                       | Description                                           |
| ------ | -------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `POST` | `/admin/clearstate`                    | —                          | Clear session state (username cache)                  |
| `POST` | `/admin/reloadconfig`                  | —                          | Reload `applicationConfig.json` from disk             |
| `POST` | `/admin/deploycommands`                | `{}` or `{"serverId":"…"}` | Deploy slash commands globally or to a specific guild |
| `POST` | `/admin/sendLeaderboardRoute`          | —                          | Send karma weekly leaderboard now (responds 202)      |
| `POST` | `/admin/persistKarmaWeeklyLeaderboard` | —                          | Persist weekly leaderboard snapshot (responds 202)    |

**Examples:**

```bash
curl -X POST http://localhost:33002/admin/reloadconfig
curl -X POST http://localhost:33002/admin/clearstate

# Deploy commands globally
curl -X POST http://localhost:33002/admin/deploycommands \
  -H "Content-Type: application/json" -d '{}'

# Deploy commands to one server
curl -X POST http://localhost:33002/admin/deploycommands \
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

Configured in `.env` or the host environment. Defined in `config.js`.

| Variable               | Default                  | Required | Description                            |
| ---------------------- | ------------------------ | -------- | -------------------------------------- |
| `TOKEN`                | —                        | Yes      | Discord bot token                      |
| `CLIENT_ID`            | —                        | Yes      | Discord application client ID          |
| `PORT`                 | `33002`                  | No       | HTTP server port                       |
| `INVENCHECKER_API_URL` | `http://localhost:33001` | No       | Base URL for the invenchecker API      |

## Local Development (without Docker)

Restarts on save

```bash
npm install
mkdir -p data
npm run dev
```
