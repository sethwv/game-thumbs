# Use Node.js LTS version (Debian-based for better multi-arch support)
FROM node:lts-slim

# OCI annotations for image metadata
LABEL org.opencontainers.image.title="game-thumbs"
LABEL org.opencontainers.image.description="Dynamic sports thumbnail and logo generation API"
LABEL org.opencontainers.image.authors="Seth WV"
LABEL org.opencontainers.image.url="https://github.com/sethwv/game-thumbs"
LABEL org.opencontainers.image.source="https://github.com/sethwv/game-thumbs"
LABEL org.opencontainers.image.documentation="https://sethwv.github.io/game-thumbs"
LABEL org.opencontainers.image.licenses="MIT"

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json yarn.lock ./

# Install canvas dependencies and git in one layer
# Remove build tools after yarn install to reduce image size
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-dejavu-core \
    ca-certificates \
    curl \
    git \
 && yarn install --frozen-lockfile --network-timeout 100000 \
 && apt-get purge -y --auto-remove build-essential \
 && rm -rf /var/lib/apt/lists/* /root/.cache /tmp/*

# Copy application code (after dependencies for better caching)
COPY . .

# Bundle the post-deploy notification hook at a stable path so orchestrators
# (e.g. a Komodo post-deploy step) can run it via `docker exec` against this
# container, without bind-mounting a host file the daemon may not be able to see.
COPY .github/workflows/deployment/standard-update.hook.sh /deploy/standard-update.hook.sh

# Create directories for configuration and cache
RUN mkdir -p json/teams json/leagues .cache

# Expose port
EXPOSE 3000

# Set environment variables with defaults
ENV PORT=3000
ENV IMAGE_CACHE_HOURS=24
ENV RATE_LIMIT_PER_MINUTE=30
ENV FORCE_COLOR=1
ENV NODE_ENV=production

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:${PORT}/health | grep -q '"status":"ok"'

# Start the application
CMD ["node", "src/index.js"]