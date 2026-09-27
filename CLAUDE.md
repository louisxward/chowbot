# CLAUDE.md

Discord bot (discord.js v14, CommonJS, Node 22) with an Express API sitting next to it. Features: Reddit-style karma from up/down vote reactions, a weekly karma leaderboard, scheduled channel clearing, and a Discord front end for the external **invenchecker** service (Steam inventory price alerts). The user-facing docs are in [readme.md](readme.md). Keep the command, endpoint and config tables there in sync when you change behaviour.

## Commands

```bash
npm install
npm run dev                     # NODE_ENV=development, logs piped through pino-pretty (no file watching)
npm run dev -- --deploy-commands  # also registers slash commands with Discord on startup
npm test                        # jest
npm run lint                    # eslint (flat config in eslint.config.js)
npx jest tests/karmaService.test.js   # a single test file
docker compose up --build       # production-like; needs the external `invenchecker` network
```

To run the bot you need a `.env` with `TOKEN` and `CLIENT_ID`. Optional variables are `PORT` (default 33002) and `INVENCHECKER_API_URL` (default http://localhost:33001).

## Module resolution

`src/index.js` calls `app-module-path` on `src/`, and jest's `moduleDirectories` includes `./src`. Every internal import is therefore **bare and rooted at src**:

```js
const logger = require("logger");
const { connect } = require("services/databaseService");
```

Use this style. Don't write relative `../` paths. The one exception is `routes/index.js`, which uses `require("./admin")`. Tests mock modules by these same bare names, e.g. `jest.mock("services/storageHelper", ...)`.

## Architecture

The layers are `events/` and `commands/` → `services/` → `repositories/` (SQLite) or JSON storage.

- **`src/index.js`** does startup. It validates env, auto-loads every `commands/<folder>/*.js` and every `events/*.js`, runs DB migrations, starts Express and logs in.
- **`commands/<folder>/*.js`** each export `{ data: SlashCommandBuilder, execute(interaction) }`. They're discovered automatically by both `index.js` and `services/commandDeployer.js`, so adding a file is all it takes. After changing `data`, you have to deploy commands again (`--deploy-commands` or `POST /admin/deploycommands`). `utils/createChannelCommand.js` is a factory for add/remove/list channel-list commands.
- **`events/*.js`** each export `{ name: Events.X, once?, execute }`. Keep them thin and delegate to a service.
- **`services/readyService.js`** runs on `ClientReady`. It validates the emoji IDs and registers every cron job (UTC): daily status rotation, the channel clear at 05:00, the leaderboard send/persist on Sunday at 21:00/21:01, and invenchecker alert DMs every minute.
- **`routes/`** is the Express API: `GET /health` and the unauthenticated `POST /admin/*`. The Discord client is available through `req.app.get("client")`.

### Persistence: two mechanisms

1. **SQLite** (`data/chowbot.db`) through `services/databaseService.js`. Migrations are an ordered `MIGRATIONS` array tracked by `PRAGMA user_version`. **To change the schema, append a new entry. Never edit an existing one.** Repositories open and close their own connection on every call (`connect()` … `db.close()`), so follow that pattern.
2. **JSON files** in `data/` through `services/storageHelper.js`, which provides an in-memory cache and returns deep clones:
   - `serverConfig.json`: per guild, written by slash commands (`serverConfigStorage.js`)
   - `userConfig.json`: per user, holds the invenchecker uid (`invencheckerStorage.js`)
   - `sessionState.json`: username cache (`sessionStateStorage.js`)
   - `applicationConfig.json`: **edited by hand**. It holds the emoji IDs, `domainList` and `statuses`. `applicationConfigService.js` caches it separately, and you reload it with `POST /admin/reloadconfig`.

All paths are defined in `src/config.js`. `data/` and `log/` are created at runtime and are volume-mounted in Docker.

### Karma flow

- `messageCreate`/`messageUpdate` → `contentDetector.handleMessageEvent`. If the message has an embed from `domainList` or an image/video attachment, the bot adds the up/down reactions and stores the message. Edits only count within 24h.
- `messageReactionAdd`/`Remove` → `karmaService.handleEvent`. Upvotes are +1 and downvotes −1. Self-votes and bots are ignored. It tries an update first and inserts if nothing changed, because there's no unique index yet (see the TODO in `repositories/karma.js`).
- If the emoji IDs fail validation at startup, karma reactions are **disabled** (`areEmojisValid()`).
- Karma `type` is `0` for a message reaction and `1` for etiquette (`/etiquette`), as defined in `KARMA_TYPE`.

### invenchecker

`services/invencheckerService.js` is a thin `fetch` client for a separate service. The API contract is in [docs/invencheckeropenapi.yaml](docs/invencheckeropenapi.yaml).

## Conventions

- Run `npm run lint` after changes. It uses ESLint's recommended rules and doesn't enforce formatting.
- Formatting uses Prettier ([.prettierrc](.prettierrc)): double quotes, semicolons, 2-space indent, no trailing commas, 120-char lines.
- Logging uses pino (`require("logger")`). The existing pattern is a `"layer - action"` message followed by `"- key: value"` lines, e.g. `logger.info("service - updateUserKarma")`. For errors, use `logger.error({ err }, "msg")`.
- Scheduled jobs go through the `schedule()` wrapper in `readyService.js`, which catches and logs errors.
- Most command replies are `ephemeral: true`.
- Tests live in `tests/*.test.js`. They mock `logger`, `config` and the repositories, so they never touch Discord or SQLite.

## Gotchas

- `interactionCreate.js` logs when a command isn't found but doesn't `return`, so it goes on to call `command.execute` on `undefined`.
- `databaseService.init()` isn't awaited at startup.
- `src/config.js` has a stray `console.log(__dirname)`.
