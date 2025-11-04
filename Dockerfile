# Use Node.js LTS version
FROM node:lts-alpine

# Install canvas dependencies
# canvas requires Cairo, Pango, and other libraries for image manipulation
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    ttf-dejavu

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Create cache directory
RUN mkdir -p .cache

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
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {let d='';r.on('data', (c) => d+=c);r.on('end', () => {if (r.statusCode !== 200) process.exit(1);const j=JSON.parse(d);process.exit(j.status==='ok'?0:1)})}).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "index.js"]