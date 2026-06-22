# Deployment Notification Hook

[`standard-update.hook.sh`](./standard-update.hook.sh) reports a deployment to
GitHub from any host with a shell and `curl`. It reads the running git state from
the app's `/info` endpoint and POSTs a `deployment-success` `repository_dispatch`
that [`deployment-webhook.yml`](../deployment-webhook.yml) turns into a GitHub
Deployment record.

It polls `/info` until the app is serving (so it also acts as a readiness gate),
derives `version`/`git_ref` (tag, else branch, else short SHA), and sends the
dispatch. If `/info` is unreachable after ~60s it exits non-zero and sends
nothing.

## Configuration (environment variables)

| Variable       | Default                       | Purpose                                       |
| -------------- | ----------------------------- | --------------------------------------------- |
| `GITHUB_TOKEN` | `YOUR_GITHUB_PAT_HERE`        | PAT with `repo` scope. Inject via env.        |
| `GITHUB_OWNER` | `sethwv`                      | Repo owner.                                   |
| `GITHUB_REPO`  | `game-thumbs`                 | Repo name.                                    |
| `SERVER_NAME`  | `cloud-instance`              | Label shown on the deployment.                |
| `ENVIRONMENT`  | `production`                  | GitHub deployment environment.                |
| `SERVER_URL`   | `https://game-thumbs.swvn.io` | Public base URL (deployment env_url).         |
| `INFO_URL`     | `${SERVER_URL}/info`          | The `/info` endpoint to poll.                 |

## Usage with Komodo (recommended)

The hook is baked into the app image at `/deploy/standard-update.hook.sh` (see
`Dockerfile`) and the container is named `game-thumbs` (see `docker-compose.yml`),
so run it with `docker exec` in the **Post Deploy** field:

```sh
docker exec -e GITHUB_TOKEN=$GITHUB_TOKEN -e SERVER_NAME=production -e ENVIRONMENT=cloud-instance -e SERVER_URL=https://game-thumbs.swvn.io game-thumbs sh /deploy/standard-update.hook.sh
```

Add `-e INFO_URL=http://localhost:3000/info` (match your `PORT`) to poll the
local instance directly. Prefer a Komodo variable for the token
(`-e GITHUB_TOKEN=[[GITHUB_TOKEN]]`) over inlining a PAT.

> Why `docker exec` and not a bind mount: a containerized Komodo's Docker daemon
> can't see arbitrary host paths, so `-v /host/path:/deploy.sh` mounts an empty
> directory and nothing runs. `docker exec` against the running container avoids
> that, the script and `curl` are already inside the image.

## Usage elsewhere

Any host where the script and `curl` are reachable:

```sh
GITHUB_TOKEN=ghp_xxx SERVER_URL=https://game-thumbs.swvn.io sh standard-update.hook.sh
```

## Troubleshooting

- **`/info` not reachable**: check `INFO_URL` and that the app is healthy.
- **No deployment appears**: verify `GITHUB_TOKEN` has `repo` scope and the
  dispatch returned HTTP 204 (the script logs this to stderr).
- **`git_ref` looks off on a non-release commit**: `/info`'s `tag` is the latest
  reachable tag, not necessarily HEAD; `git_sha` is the precise running marker.
