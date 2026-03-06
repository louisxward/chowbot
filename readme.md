# chowbot

Version: 0.4.0

Publisher: ChowIndustries

## Release Notes

## Quick Start

```bash
# 1. Create required host directory
mkdir -p data

# 2. Start the app
docker compose up --build
```

The app runs on port **33002**.

## Configuration
### applicationConfig
managed by app owner

### serverConfig
managed by app



## Configuration 
### Server Config (`data/serverConfig.json`)

Server config is stored in a single JSON file. Create `data/serverConfig.json` with the following structure:

```json
{
  "YOUR_SERVER_ID": {
    "leaderboardChannels": ["YOUR_CHANNEL_ID"],
    "clearChannels": ["YOUR_CHANNEL_ID"]
  }
}
```

Both arrays are optional — omit a key if that feature isn't used for a server.
Mainly managed by App

### Application Config (`data/applicationConfig.json`)

Application config is stored in a single JSON file. Create `data/serverConfig.json` with the following structure:

```json
{
  "YOUR_SERVER_ID": {
    "leaderboardChannels": ["YOUR_CHANNEL_ID"],
    "clearChannels": ["YOUR_CHANNEL_ID"]
  }
}
```

Both arrays are optional — omit a key if that feature isn't used for a server.
Mainly managed by App