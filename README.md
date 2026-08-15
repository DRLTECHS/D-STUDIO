# D-Studio

This repository includes a minimal Docker-based development baseline for Alloy sessions.

## Run with Alloy Compose

```sh
docker compose -f docker-compose.alloy.yaml up -d
```

The site listens on port `3000`. Alloy proxies its preview from `http://localhost:8080`.
