# CLAUDE.md

Discord bot (discord.js v14, CommonJS, Node 24) with an Express API sitting next to it. Features: Reddit-style karma from up/down vote reactions, a weekly karma leaderboard, scheduled channel clearing, and a Discord front end for the external **invenchecker** service (Steam inventory price alerts). The user-facing docs are in [readme.md](readme.md). Keep the command, endpoint and config tables there in sync when you change behaviour.

## Commands

```bash
npm install
npm run dev                     # node --watch, restarts on save
npm run dev -- --deploy-commands  # also registers slash commands with Discord on startup
npm test                        # jest
npm run lint                    # eslint (flat config in eslint.config.js)
npx jest tests/karmaService.test.js   # a single test file
docker compose up --build       # production-like; needs the external `invenchecker` network
                                # multi-stage Dockerfile: build tools stay in the build stage
```

To run the bot you need a `.env` (copy `.env.example`) with `TOKEN` and `CLIENT_ID`. It's loaded with Node's `process.loadEnvFile()`, not dotenv. Optional variables are `ADMIN_TOKEN` (the admin API is disabled without it), `PORT`, `INVENCHECKER_API_URL` and `LOG_LEVEL`.

## Module resolution

`src/index.js` calls `app-module-path` on `src/`, and jest's `moduleDirectories` includes `./src`. Every internal import is therefore **bare and rooted at src**:

```js
const logger = require("logger");
const { getDb } = require("services/databaseService");
```

Use this style. Don't write relative `../` paths. The exceptions are `routes/index.js` (`require("./admin")`) and `index.js`/`app.js` (`require("./app")`, `require("./routes")`). Tests mock modules by these same bare names, e.g. `jest.mock("repositories/karma", ...)`.

## Architecture

The layers are `events/` and `commands/` → `services/` → `repositories/` (SQLite).

- **`src/index.js`** does startup. It validates env, loads commands (`utils/loadCommands.js`) and every `events/*.js`, then, inside `start()`, runs the DB migrations before it starts Express (`app.js`) and logs in. A startup failure (e.g. a bad token) logs `FATAL` and exits 1. Every event handler is wrapped in a try/catch that logs, because an error thrown from an async listener would otherwise crash the process. SIGTERM/SIGINT trigger a graceful shutdown (cron jobs, API, Discord client, database).
- **`commands/<folder>/*.js`** each export `{ data: SlashCommandBuilder, execute(interaction) }`. They're discovered automatically by `utils/loadCommands.js`, used by both `index.js` and `services/commandDeployer.js`, so adding a file is all it takes. Commands that need a guild must call `.setContexts(InteractionContextType.Guild)`; only `/invenchecker` also works in DMs. After changing `data`, you have to deploy commands again (`--deploy-commands` or `POST /admin/deploycommands`). `utils/createChannelCommand.js` is a factory for add/remove/list channel-list commands. Its `add` only accepts channels in the current guild. Anything that acts on a stored channel id (the clearer, the leaderboard post) must also check `channel.guildId` against the server the id was stored for.
- **`events/*.js`** each export `{ name: Events.X, once?, execute }`. Keep them thin and delegate to a service.
- **`services/readyService.js`** runs on `ClientReady`. It registers every cron job first, then validates the emoji IDs, so a validation failure can't stop the jobs. The cron jobs (UTC, `noOverlap`) are: daily status rotation, the channel clear at 05:00, the leaderboard send/persist on Sunday at 21:00/21:01, and invenchecker alert DMs every minute.
- **`routes/`** is the Express API: `GET /health` (open) and `POST /admin/*`, which requires `Authorization: Bearer <ADMIN_TOKEN>`. The Discord client is available through `req.app.get("client")`.

### Persistence

1. **SQLite** (`data/chowbot.db`) through **better-sqlite3**, which is synchronous, in `services/databaseService.js`. `init()` opens one shared connection and runs migrations. The migrations are an ordered `MIGRATIONS` array tracked by `PRAGMA user_version`, and each one runs in its own transaction. **To change the schema, append a new entry. Never edit an existing one.** Repositories call `getDb().prepare(sql).run/get/all(...params)`. Never open or close connections in a repository. Repository functions stay `async` so callers don't change. better-sqlite3 rejects JS booleans as parameters, so pass `1`/`0` instead.
   A migration is either a SQL string or a function taking the db (v4 uses one to import the legacy JSON files). Tables: `Karma`, `KarmaWeeklyLeaderboardWeek`/`User`, `Message`, `Server`, `ServerChannel` (per-guild channel lists keyed by `type`, e.g. `clearChannels`) and `InvencheckerUser`. `Karma` has a UNIQUE index on `(serverId, messageId, fromUserId, emojiId)`, so reactions are saved with an upsert. Etiquette rows have null `messageId`/`emojiId`, so they're never caught by it.
2. **`data/applicationConfig.json`**, **edited by hand**, read through `services/storageHelper.js`. It holds the emoji IDs, `domainList` and `statuses`. `applicationConfigService.js` caches it, and you reload it with `POST /admin/reloadconfig`.
3. **In memory:** the leaderboard's username cache (`sessionStateStorage.js`, 12h TTL).

`serverConfig.json` and `userConfig.json` are legacy. Migration v4 imports them once and nothing reads them afterwards.

All paths are defined in `src/config.js`. `data/` and `log/` are created at runtime and are volume-mounted in Docker.

### Karma flow

- `messageCreate`/`messageUpdate` → `contentDetector.handleMessageEvent`. If the message has an embed from `domainList` or an image/video attachment, the bot adds the up/down reactions and stores the message. Edits only count within 24h.
- `messageReactionAdd`/`Remove` → `karmaService.handleEvent`. Upvotes are +1 and downvotes −1. Self-votes and bots are ignored. It saves the reaction with `upsertReactionKarma`.
- If the emoji IDs fail validation at startup, karma reactions are **disabled** (`areEmojisValid()`).
- Karma `type` is `0` for a message reaction and `1` for etiquette (`/etiquette`), as defined in `KARMA_TYPE`. `reportEtiquette` allows one report per reporter, target and server every 24 hours, using `Karma.created`.
- Karma totals and the leaderboard are currently global across servers, not per server.

### invenchecker

`services/invencheckerService.js` is a thin `fetch` client for a separate service, with a 10s timeout. The API contract is in [docs/invencheckeropenapi.yaml](docs/invencheckeropenapi.yaml). Account links live in the `InvencheckerUser` table (`repositories/invencheckerUser.js`). The alert job only resolves alerts after the DM is delivered. Prices are shown in £.

## Conventions

- Run `npm run lint` after changes. It uses ESLint's recommended rules and doesn't enforce formatting.
- Formatting uses Prettier ([.prettierrc](.prettierrc)): double quotes, semicolons, 2-space indent, no trailing commas, 120-char lines.
- Logging uses pino (`require("logger")`). The existing pattern is a `"layer - action"` message followed by `"- key: value"` lines, e.g. `logger.info("service - updateUserKarma")`. For errors, use `logger.error({ err }, "msg")`.
- Scheduled jobs go through the `schedule()` wrapper in `readyService.js`, which catches and logs errors.
- Most command replies are ephemeral: use `flags: MessageFlags.Ephemeral`, not the deprecated `ephemeral: true`.
- Tests live in `tests/*.test.js`. Service tests mock `logger`, `config` and the repositories. `tests/database.test.js` runs the real migrations and repository SQL against a temporary SQLite file, so add repository and migration tests there. `tests/adminRoutes.test.js` starts the real Express app with `createApp()` on a random port.
