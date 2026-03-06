# Commands & Endpoints

## Discord Slash Commands

### Utility

| Command | Description | Permission |
|---------|-------------|------------|
| `/touch` | Replies with "uuuuuuuuhhhhm" | Everyone |
| `/health` | Shows bot health status (uptime, WS ping, database) | Administrator |

### Reddit / Karma

| Command | Options | Description | Permission |
|---------|---------|-------------|------------|
| `/checkkarma` | `whos` (user, optional) | Check karma for yourself or another user | Everyone |
| `/etiquette` | `who` (user), `good` (boolean), `reason` (string) | Report a user for good/bad etiquette | Everyone |
| `/leaderboard` | — | Show the karma weekly leaderboard | Everyone |
| `/persistweeklyleaderboard` | `confirm` (must type `RUN`) | Persist weekly leaderboard to DB | Administrator |

### Message Clearer

| Command | Options | Description | Permission |
|---------|---------|-------------|------------|
| `/addclearchannel` | `channel_id` (string) | **DANGEROUS** — Add a channel to be cleared daily at 05:00 UTC | Administrator |
| `/removeclearchannel` | `channel_id` (string) | Remove a channel from the daily clear list | Administrator |
| `/runclear` | `confirm` (must type `RUN`) | **DANGEROUS** — Manually run the channel clear | Administrator |

### Invenchecker

| Command | Description | Permission |
|---------|-------------|------------|
| `/invenchecker account register` | Register your Discord account with invenchecker | Administrator |
| `/invenchecker steam add <id>` | Add a Steam64 ID to your account | Administrator |
| `/invenchecker steam remove <id>` | Remove a Steam64 ID from your account | Administrator |
| `/invenchecker item add <name>` | Add a custom item to track (by `market_hash_name`) | Administrator |
| `/invenchecker item remove <name>` | Remove a custom tracked item | Administrator |
| `/invenchecker alerts list` | List unresolved price alerts | Administrator |
| `/invenchecker alerts resolve` | Resolve all unresolved alerts | Administrator |

### Dev

| Command | Description | Permission |
|---------|-------------|------------|
| `/dev sendleaderboard` | Send karma weekly leaderboard | Administrator |
| `/dev clearstate` | Clear session state (username cache) | Administrator |
| `/dev reloadconfig` | Reload application config from disk | Administrator |

---

## HTTP Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns bot health status. 503 if unhealthy. |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/clearstate` | Clear session state |
| `POST` | `/admin/reloadconfig` | Reload application config from disk |
| `POST` | `/admin/sendLeaderboardRoute` | Send karma weekly leaderboard (responds 202) |

**Example:**
```bash
curl -X POST http://localhost:<PORT>/admin/reloadconfig
```
