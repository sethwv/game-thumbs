#!/bin/sh
# Post-deploy notification hook for game-thumbs
#
# Reads the running git state from the app's own /info endpoint (no `docker
# inspect`, no Docker socket, no bash) and reports the deployment to GitHub. Works
# anywhere a shell and curl are available (Komodo, plain compose, cron, CI, etc.).
#
# Usage with Komodo (recommended): this script is baked into the app image at
# /deploy/standard-update.hook.sh (see Dockerfile), and the container is named
# `game-thumbs` (see docker-compose.yml). A containerized Komodo's Docker daemon
# cannot see arbitrary host paths, so bind-mounting the script mounts an empty
# dir and nothing runs; running it via `docker exec` against the live container
# avoids that entirely. Put this single command in the "Post Deploy" field:
#
#   docker exec -e GITHUB_TOKEN=$GITHUB_TOKEN -e SERVER_NAME=production -e ENVIRONMENT=cloud-instance -e SERVER_URL=https://game-thumbs.swvn.io game-thumbs sh /deploy/standard-update.hook.sh
#
# The -e flags override the defaults below. Add -e INFO_URL=http://localhost:3000/info
# (match your PORT) to poll the local instance instead of the public URL.
#
# Alternatives (see standard-deployment.md): fetch over HTTP and pipe to sh in a
# curl container, or, if the script and curl are directly reachable, run it
# without Docker:
#
#   GITHUB_TOKEN=$GITHUB_TOKEN SERVER_NAME=production ENVIRONMENT=cloud-instance SERVER_URL=https://game-thumbs.swvn.io sh /path/to/standard-update.hook.sh
#
# It polls /info until the app is actually serving (condition: service_started
# only means the container launched), then POSTs a `deployment-success`
# repository_dispatch consumed by .github/workflows/deployment-webhook.yml.
#
# Dependencies: curl + busybox (grep, sed, head, sleep). No jq, no bash.

set -u

# --- Configuration (all overridable via environment) -------------------------
GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_PAT_HERE}"  # GitHub PAT with `repo` scope; inject via env, never commit a real token
GITHUB_OWNER="${GITHUB_OWNER:-sethwv}"
GITHUB_REPO="${GITHUB_REPO:-game-thumbs}"
SERVER_NAME="${SERVER_NAME:-cloud-instance}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# SERVER_URL is the app's public base URL (reported as the deployment's
# environment_url). INFO_URL must resolve to the app's /info endpoint; by default
# it is derived from SERVER_URL.
SERVER_URL="${SERVER_URL:-https://game-thumbs.swvn.io}"
INFO_URL="${INFO_URL:-${SERVER_URL%/}/info}"

# Status/progress goes to stderr so it shows up in orchestrators (e.g. Komodo)
# that surface stderr; stdout stays clean.
echo "→ game-thumbs deploy hook: polling $INFO_URL for readiness ..." >&2

# --- Poll /info until the app is ready (~60s: 20 tries x 3s) ------------------
INFO_JSON=""
i=0
while [ "$i" -lt 20 ]; do
    INFO_JSON=$(curl -fsS --max-time 5 "$INFO_URL" 2>/dev/null) \
        && printf '%s' "$INFO_JSON" | grep -q '"git"' && break
    INFO_JSON=""
    i=$((i + 1))
    sleep 3
done

if [ -z "$INFO_JSON" ]; then
    echo "❌ /info not reachable at $INFO_URL after ~60s; aborting, no dispatch sent" >&2
    exit 1
fi

# --- Parse git state from the compact /info JSON -----------------------------
# busybox-safe extraction of a top-level string value; null/absent -> empty.
json_str() {
    printf '%s' "$INFO_JSON" | grep -o "\"$1\":\"[^\"]*\"" | head -n1 | sed 's/^"[^"]*":"//; s/"$//'
}

BRANCH=$(json_str branch)
GIT_SHA=$(json_str commit)       # short SHA from `git rev-parse --short HEAD`
TAG=$(json_str tag)              # empty when "tag":null
DIRTY=$(printf '%s' "$INFO_JSON" | grep -q '"dirty":true' && echo true || echo false)

# --- Derive VERSION and GIT_REF ----------------------------------------------
# Prefer a tag, then the branch, then the raw SHA. Tag/branch refs resolve for
# the downstream createDeployment call; a short SHA may not.
#
# Note: /info's `tag` comes from `git describe --tags --abbrev=0`, i.e. the
# latest *reachable* tag, not proof HEAD sits exactly on it. So on a non-release
# commit GIT_REF may not pin the exact running commit; git_sha (short) remains
# the precise running marker. This is the most faithful mapping /info allows.
if [ -n "$TAG" ]; then
    VERSION="$TAG"
    GIT_REF="refs/tags/$TAG"
elif [ -n "$BRANCH" ]; then
    VERSION="$BRANCH"
    GIT_REF="refs/heads/$BRANCH"
else
    VERSION="${GIT_SHA:-unknown}"
    GIT_REF="${GIT_SHA:-main}"
fi

# --- Send deployment notification to GitHub ----------------------------------
echo "→ dispatching deployment-success (version=$VERSION ref=$GIT_REF sha=$GIT_SHA dirty=$DIRTY)" >&2

# Capture the HTTP status (GitHub returns 204 No Content on success) so a failed
# dispatch is loud and sets a non-zero exit instead of silently "succeeding".
RESP=$(curl -sS -w '\n%{http_code}' -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/dispatches" \
    -d "{
        \"event_type\": \"deployment-success\",
        \"client_payload\": {
            \"environment\": \"$ENVIRONMENT\",
            \"version\": \"$VERSION\",
            \"git_ref\": \"$GIT_REF\",
            \"git_sha\": \"$GIT_SHA\",
            \"git_dirty\": $DIRTY,
            \"status\": \"success\",
            \"server_name\": \"$SERVER_NAME\",
            \"server_url\": \"$SERVER_URL\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }
    }" 2>&1)

HTTP_CODE=$(printf '%s' "$RESP" | tail -n1)
BODY=$(printf '%s' "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Deployment notification sent to GitHub (HTTP $HTTP_CODE)" >&2
    echo "   Version: $VERSION  |  Git Ref: $GIT_REF  |  Commit: ${GIT_SHA:-?}  |  Dirty: $DIRTY" >&2
else
    echo "❌ GitHub dispatch failed: HTTP ${HTTP_CODE:-no-response}" >&2
    [ -n "$BODY" ] && echo "   Response: $BODY" >&2
    exit 1
fi
