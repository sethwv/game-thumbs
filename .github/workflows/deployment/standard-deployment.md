# Deployment Notification Hook

[`standard-update.hook.sh`](./standard-update.hook.sh) reports a deployment to
GitHub as a `deployment-success` `repository_dispatch`, which
[`deployment-webhook.yml`](../deployment-webhook.yml) turns into a Deployment
record. It reads git state from the local repo (`REPO_DIR`, default `/app`) when
present, else polls the app's `/info` over HTTP, then picks a ref (tag, else
branch, else short SHA) and sends the dispatch.

## Usage with Komodo

The hook is baked into the image at `/deploy/standard-update.hook.sh` (`Dockerfile`)
and the container is named `game-thumbs` (`docker-compose.yml`), so run it via
`docker exec` in the **Post Deploy** field:

```sh
docker exec -e GITHUB_TOKEN=$GITHUB_TOKEN -e SERVER_NAME=production -e ENVIRONMENT=cloud-instance -e SERVER_URL=https://game-thumbs.swvn.io game-thumbs sh /deploy/standard-update.hook.sh
```

Use `docker exec` (not `-v` bind mount): a containerized Komodo's daemon can't see
host paths, so a bind mount lands as an empty dir. Inside the container the script
reads `/app` directly, avoiding the hairpin-NAT case where it can't reach its own
public URL. Prefer a Komodo variable for the token (`[[GITHUB_TOKEN]]`).

Anywhere else, with a shell + `curl`:

```sh
GITHUB_TOKEN=ghp_xxx SERVER_URL=https://game-thumbs.swvn.io sh standard-update.hook.sh
```

## Config (env vars)

`GITHUB_TOKEN` (PAT, `repo` scope), `GITHUB_OWNER`, `GITHUB_REPO`, `SERVER_NAME`,
`ENVIRONMENT`, `SERVER_URL` (deployment env_url), `INFO_URL` (HTTP fallback),
`REPO_DIR`. Defaults are in the script; override via `-e`.

## Troubleshooting

- No deployment: check the script's stderr; the dispatch must return HTTP 204
  and `GITHUB_TOKEN` needs `repo` scope.
- `/info` fallback failing: check `INFO_URL` and app health.
