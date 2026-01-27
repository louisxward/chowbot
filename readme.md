# ChowBot

Version: 0.3.1

Publisher: ChowIndustries

Source: https://discordjs.guide

## Release Notes

- Karma Leaderboard Update
  - /leaderboard
- You can now commend/report users for Etiquette
  - /etiquette

## Development

### Environment(.env place in root)

```
TOKEN=<BOT_API_KEY>
CLIENT_ID=<BOT_USER_ID>
GUILD_ID=<SERVER_ID>
```

### Commands

`npm run dev` - dev command restarts on save

`docker compose build` - prod build

`docker compose up -d` - prod deploy

`docker compose logs -f` - prod logs

`node deploy-commands.js` - deploy commands to all servers or just one
