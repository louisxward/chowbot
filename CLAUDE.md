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
const { getDb } = require("database");
```

Use this style. Don't write relative `../` paths. The exceptions are `index.js`/`app.js`/`routes/index.js`, which require their siblings with `./`. Tests mock modules by these same bare names, e.g. `jest.mock("repositories/karma", ...)`.

## Layout

The layers are `events/` and `commands/` → `services/` → `repositories/` → `database/`. Events and commands stay thin and call services. Only repositories run SQL.

```
src/
  index.js           startup, event wiring, graceful shutdown
  app.js             Express app (createApp)
  config.js          env vars and file paths
  logger.js          pino, LOG_LEVEL
  database/          index.js (init, getDb, close), migrations.js (BASELINE_VERSION, SCHEMA, MIGRATIONS)
  repositories/      one file per table, all SQL lives here
  services/          business logic, one concern per file (see below)
  commands/<group>/  slash commands: karma, clearer, invenchecker, utility
  events/            one file per Discord event
  routes/            health.js (open), admin.js (token auth)
  utils/             createChannelCommand, format (formatPrice), pagination, ranking (toRankedMap)
```

Services:

| Service                    | Does                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `applicationConfigService` | reads/caches `applicationConfig.json`                                                      |
| `clearerService`           | daily channel clear                                                                        |
| `commandService`           | loads `commands/<group>/*.js`, deploys them to Discord                                     |
| `healthService`            | `/health` and `/health` command status                                                     |
| `invencheckerService`      | HTTP client for the invenchecker API (10s timeout)                                         |
| `invencheckerAlertService` | DMs price alerts (several messages if needed), resolves them only once all are delivered   |
| `karmaEmojiService`        | validates `karmaEmojis` (id, sort, value), `findKarmaEmoji`, `hasKarmaEmojis`              |
| `karmaService`             | reaction karma, etiquette reports and cooldown, totals                                     |
| `leaderboardService`       | weekly snapshot, formatting, pages of 20 (`buildLeaderboardMessage`), posting              |
| `messageService`           | detects qualifying posts, adds karma reactions, stores messages                            |
| `readyService`             | `onReady`: schedules jobs, validates emojis, sets the first status                         |
| `schedulerService`         | `schedule()` wrapper around node-cron (UTC, `noOverlap`, errors logged), `stopSchedules()` |
| `serverService`            | records servers the bot joins and leaves                                                   |
| `statusService`            | rotates the bot's activity through `statuses`                                              |
| `usernameCacheService`     | leaderboard username cache (12h TTL)                                                       |

### Startup and commands

- **`src/index.js`** validates env, loads commands (`commandService.loadCommands`) and every `events/*.js`, then, inside `start()`, runs the DB migrations before it starts Express and logs in. A startup failure (e.g. a bad token) logs `FATAL` and exits 1. Every event handler is wrapped in a try/catch that logs, because an error thrown from an async listener would otherwise crash the process. SIGTERM/SIGINT trigger a graceful shutdown (cron jobs, API, Discord client, database).
- **`commands/<group>/*.js`** each export `{ data: SlashCommandBuilder, execute(interaction) }` and are discovered automatically, so adding a file is all it takes. Errors thrown from `execute` get a generic reply from `events/interactionCreate.js`. Commands that need a guild must call `.setContexts(InteractionContextType.Guild)`; only `/invenchecker` also works in DMs. After changing `data`, deploy commands again (`--deploy-commands` or `POST /admin/deploycommands`).
- **Buttons**: a button's custom id is `"<commandName>:<args...>"`. `events/interactionCreate.js` routes clicks to that command's optional `handleButton(interaction, args)`. Buttons are stateless: the id carries everything needed to redo the work, so they survive restarts. Keep ids under Discord's 100 character limit.
- **Embed limits** (4096 description, 1024 per field, 6000 per embed): use `utils/pagination.js` rather than `.slice()`. `chunkLines` splits on whole lines, `sectionsToFields` splits long fields into "(cont.)" fields, `paginateFields` groups fields into pages, and `buildPageButtons` makes the ◀ / x/y / ▶ row. The leaderboard (`leaderboard:<page>`) and `/invenchecker` views (`invenchecker:<view>:<page>:<days>`) are paginated this way.
- **`utils/createChannelCommand.js`** is a factory for add/remove/list channel-list commands (`type` is the `ServerChannel.type`). Its `add` only accepts channels in the current guild. Anything that acts on a stored channel id (the clearer, the leaderboard post) must also check `channel.guildId` against the server the id was stored for.
- **`readyService.onReady`** schedules every cron job first, then validates the karma emojis, so a validation failure can't stop the jobs: status rotation daily, the channel clear at 05:00, the leaderboard send/persist on Sunday at 21:00/21:01, and invenchecker alert DMs every minute.
- **`routes/`**: `GET /health` (open) and `POST /admin/*`, which requires `Authorization: Bearer <ADMIN_TOKEN>`. The Discord client is available through `req.app.get("client")`.

### Persistence

1. **SQLite** (`data/chowbot.db`) through **better-sqlite3**, which is synchronous. `database.init()` opens one shared connection and brings the schema up to date, tracked by `PRAGMA user_version`. A new database gets `SCHEMA` at `BASELINE_VERSION` (5, the version every deployment had reached when the old migrations were removed); an unversioned or older database is refused, pointing at commit 3fd77de, which can still upgrade it. After that, `MIGRATIONS` applies in order (the first takes the database to version 6), each in its own transaction and either SQL or a function taking the db. **To change the schema, append a new entry to `MIGRATIONS`. Never edit an existing one, and never change `SCHEMA` without a matching migration.** Repositories call `getDb().prepare(sql).run/get/all(...params)` and never open or close connections. Repository functions stay `async` so callers don't change. better-sqlite3 rejects JS booleans as parameters, so pass `1`/`0` instead.
   Tables: `Karma`, `KarmaWeeklyLeaderboardWeek`/`User`, `Message`, `Server`, `ServerChannel` (per-guild channel lists keyed by `type`, e.g. `clearChannels`), `InvencheckerUser` and `UsernameCache`. `Karma` has a UNIQUE index on `(serverId, messageId, fromUserId, emojiId)`, so reactions are saved with an upsert. Etiquette rows have null `messageId`/`emojiId`, so they're never caught by it.
2. **`data/applicationConfig.json`**, **edited by hand**, read by `applicationConfigService`. It holds `karmaEmojis`, `domainList` and `statuses`. It's cached until `POST /admin/reloadconfig`.

All paths are defined in `src/config.js`. `data/` and `log/` are created at runtime and are volume-mounted in Docker.

### Karma flow

- `messageCreate`/`messageUpdate` → `messageService.handleMessage`. If the message has an embed from `domainList` or an image/video attachment, the bot adds the up/down reactions and stores the message. Edits only count within 24h.
- Karma emojis come from `karmaEmojis` in `applicationConfig.json`: `{ id, sort, value }`, where `id` is an application emoji id (string) or a unicode emoji. `karmaEmojiService.validateKarmaEmojis` runs at ready and on `/admin/reloadconfig`; invalid entries are skipped, and karma reactions are off only if none are valid (`hasKarmaEmojis()`). The old `emojiUpvoteId`/`emojiDownvoteId` keys are read as a +1/−1 pair when `karmaEmojis` is absent.
- `messageReactionAdd`/`Remove` → `karmaService.handleReaction`. A reaction is matched by `emoji.id ?? emoji.name` and is worth the emoji's `value`. Self-votes and bots are ignored. The reaction is saved with `upsertReactionKarma`, so its value is fixed when it's added.
- The bot adds its reactions to qualifying posts in `sort` order (`messageService.addKarmaReactions`).
- Karma `type` is `0` for a message reaction and `1` for etiquette (`/etiquette`), as defined in `KARMA_TYPE`. `reportEtiquette` allows one report per reporter, target and server every 24 hours, using `Karma.created`.
- Leaderboard ranks come from `utils/ranking.toRankedMap`: ties share a rank.
- Karma totals and the leaderboard are currently global across servers, not per server.

### invenchecker

`services/invencheckerService.js` is the API client; the contract is in [docs/invencheckeropenapi.yaml](docs/invencheckeropenapi.yaml). In Docker the base URL is `http://invenchecker:33001`, set in `docker-compose.yml`: invenchecker runs as a separate Compose project, and its service name resolves on the shared external `invenchecker` network. `localhost` inside the chowbot container is chowbot itself. The `localhost` default in `config.js` is only for running both locally. Account links live in the `InvencheckerUser` table. `/invenchecker` routes each subcommand through a handler table (`ACCOUNT_HANDLERS`); every handler except `account register` gets the user's uid after the reply is deferred and returns the reply to send. The list-style views are defined in `VIEWS` (each returns `lines` or `sections`) and rendered with pages by `renderView`. Prices are formatted with `utils/format.formatPrice` (£).

## Conventions

- Run `npm run lint` and `npm test` after changes. ESLint uses the recommended rules plus `eqeqeq` (smart), `prefer-const`, `object-shorthand` and `no-var`. It doesn't check formatting.
- Formatting uses Prettier ([.prettierrc](.prettierrc)): double quotes, semicolons, 2-space indent, no trailing commas, 120-char lines.
- Imports go in this order: `node:` built-ins, packages, `config`/`logger`, then internal modules (`database`, `repositories/…`, `services/…`, `utils/…`). The one exception is `app-module-path` at the top of `index.js`.
- **Logging** is structured, one line per event: `logger.info({ serverId, messageId }, "area - what happened")`. The area is short and lowercase (`karma`, `leaderboard`, `clearer`, `invenchecker`, `startup`...). Errors always pass `{ err }`. Services log at `info`, repositories log `"repository - functionName"` at `debug`.
- Caught errors are named `err`. Module-level constants are `UPPER_SNAKE_CASE`, including embed colours.
- Scheduled jobs go through `schedulerService.schedule()`.
- Most command replies are ephemeral: use `flags: MessageFlags.Ephemeral`, not the deprecated `ephemeral: true`. Option builder callbacks are named `option`.
- Tests live in `tests/*.test.js`, named after the module they test. Service tests mock `logger` (include `debug`), `config` and the repositories. `tests/database.test.js` runs the real `init()` and repository SQL against a temporary SQLite file, so add repository and migration tests there (tests can push temporary entries onto `MIGRATIONS` after `jest.resetModules()`). `tests/adminRoutes.test.js` starts the real Express app with `createApp()` on a random port.
