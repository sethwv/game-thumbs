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

# Set environment variables
ENV PORT=3000

# Start the application
CMD ["node", "index.js"]