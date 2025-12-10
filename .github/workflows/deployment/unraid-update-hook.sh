#!/bin/bash
# Unraid Docker Post-Update Hook
# Add this as a post-update script in Unraid's Docker template for game-thumbs
# Location: Settings -> Docker -> Click on container -> "Post Arguments" or use CA Auto Update plugin

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_PAT_HERE}"  # Set as Unraid environment variable or replace here
GITHUB_OWNER="sethwv"
GITHUB_REPO="game-thumbs"
CONTAINER_NAME="${CONTAINER_NAME:-game-thumbs}"  # Your container name in Unraid
SERVER_NAME="${SERVER_NAME:-Unraid-Main}"
SERVER_URL="${SERVER_URL:-https://your-server.com}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Get version from running container's image tag
VERSION=$(docker inspect $CONTAINER_NAME --format='{{.Config.Image}}' 2>/dev/null | cut -d':' -f2)
[ -z "$VERSION" ] && VERSION="latest"

# Get the git commit SHA from the image labels (if available)
GIT_SHA=$(docker inspect $CONTAINER_NAME --format='{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null)

# Determine the git ref to use for the deployment
# For version tags (v1.2.3), use the tag reference
# For everything else (latest, dev, etc.), prefer commit SHA if available
if [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    GIT_REF="refs/tags/$VERSION"
elif [ ! -z "$GIT_SHA" ]; then
    GIT_REF="$GIT_SHA"
elif [ "$VERSION" != "latest" ]; then
    # Assume it's a branch name (e.g., "dev")
    GIT_REF="refs/heads/$VERSION"
else
    # For "latest" tag, use commit SHA or fall back to main
    GIT_REF="${GIT_SHA:-main}"
fi

# Send deployment notification to GitHub
curl -sS -X POST \
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
            \"status\": \"success\",
            \"server_name\": \"$SERVER_NAME\",
            \"server_url\": \"$SERVER_URL\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }
    }"

echo "✅ Deployment notification sent to GitHub"
echo "   Version: $VERSION"
echo "   Git Ref: $GIT_REF"
[ ! -z "$GIT_SHA" ] && echo "   Commit: $GIT_SHA"
