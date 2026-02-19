# ChowBot

Version: 0.3.3

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
TOKEN=
CLIENT_ID=
?GUILD_ID=
EMOJI_UPVOTE_ID=
EMOJI_DOWNVOTE_ID=
```

### Commands

`npm run dev` - dev command restarts on save

`docker compose build` - prod build

`docker compose up -d` - prod deploy

`node deploy-commands.js` - deploy commands to all servers or just one
