#!/bin/sh
# Post-deploy hook: report the deployed git state to GitHub as a
# `deployment-success` repository_dispatch (handled by deployment-webhook.yml).
# Reads git from the local repo ($REPO_DIR, when run inside the app container),
# else falls back to polling the app's /info over HTTP. See standard-deployment.md.
set -u

GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_PAT_HERE}"  # PAT with `repo` scope; inject via env
GITHUB_OWNER="${GITHUB_OWNER:-sethwv}"
GITHUB_REPO="${GITHUB_REPO:-game-thumbs}"
SERVER_NAME="${SERVER_NAME:-cloud-instance}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SERVER_URL="${SERVER_URL:-https://game-thumbs.swvn.io}"  # reported as the deployment env_url
INFO_URL="${INFO_URL:-${SERVER_URL%/}/info}"
REPO_DIR="${REPO_DIR:-/app}"

# Resolve git state (progress -> stderr so orchestrators like Komodo surface it).
BRANCH=""; GIT_SHA=""; TAG=""; DIRTY="false"

if command -v git >/dev/null 2>&1 && git -C "$REPO_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    echo "→ reading git state from $REPO_DIR" >&2
    BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)
    GIT_SHA=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null)
    TAG=$(git -C "$REPO_DIR" describe --tags --abbrev=0 2>/dev/null)
    [ -n "$(git -C "$REPO_DIR" status --porcelain 2>/dev/null)" ] && DIRTY=true
else
    echo "→ no repo at $REPO_DIR; polling $INFO_URL ..." >&2
    INFO_JSON=""; i=0
    while [ "$i" -lt 20 ]; do
        INFO_JSON=$(curl -fsS --max-time 5 "$INFO_URL" 2>/dev/null) \
            && printf '%s' "$INFO_JSON" | grep -q '"git"' && break
        INFO_JSON=""; i=$((i + 1)); sleep 3
    done
    [ -z "$INFO_JSON" ] && { echo "❌ no repo and /info unreachable after ~60s; aborting" >&2; exit 1; }
    field() { printf '%s' "$INFO_JSON" | grep -o "\"$1\":\"[^\"]*\"" | head -n1 | sed 's/^"[^"]*":"//; s/"$//'; }
    BRANCH=$(field branch); GIT_SHA=$(field commit); TAG=$(field tag)
    printf '%s' "$INFO_JSON" | grep -q '"dirty":true' && DIRTY=true
fi

# Pick a deployable ref: tag > branch > short SHA (tag/branch resolve downstream).
if [ -n "$TAG" ]; then       VERSION="$TAG";              GIT_REF="refs/tags/$TAG"
elif [ -n "$BRANCH" ]; then  VERSION="$BRANCH";           GIT_REF="refs/heads/$BRANCH"
elif [ -n "$GIT_SHA" ]; then VERSION="$GIT_SHA";          GIT_REF="$GIT_SHA"
else echo "❌ could not determine git state; aborting" >&2; exit 1
fi

# Dispatch; GitHub returns 204 on success, so fail loudly otherwise.
echo "→ dispatching deployment-success (version=$VERSION ref=$GIT_REF sha=$GIT_SHA dirty=$DIRTY)" >&2
RESP=$(curl -sS -w '\n%{http_code}' -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/dispatches" \
    -d "{\"event_type\":\"deployment-success\",\"client_payload\":{\"environment\":\"$ENVIRONMENT\",\"version\":\"$VERSION\",\"git_ref\":\"$GIT_REF\",\"git_sha\":\"$GIT_SHA\",\"git_dirty\":$DIRTY,\"status\":\"success\",\"server_name\":\"$SERVER_NAME\",\"server_url\":\"$SERVER_URL\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" 2>&1)

if [ "$(printf '%s' "$RESP" | tail -n1)" = "204" ]; then
    echo "✅ sent: version=$VERSION ref=$GIT_REF sha=${GIT_SHA:-?} dirty=$DIRTY" >&2
else
    echo "❌ dispatch failed: HTTP $(printf '%s' "$RESP" | tail -n1)" >&2
    printf '%s' "$RESP" | sed '$d' | grep -q . && printf '   %s\n' "$(printf '%s' "$RESP" | sed '$d')" >&2
    exit 1
fi
