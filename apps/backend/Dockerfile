# Use Node.js as the base image for building the application
FROM node:23-alpine AS builder

# Set the working directory
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl

# Copy package.json and workspace files from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

RUN corepack enable

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the backend application code
COPY apps/backend ./apps/backend/

# Build the NestJS application
RUN pnpm --filter @eudiplo/backend build

# Use a smaller base image for the runtime stage
FROM node:23-alpine AS runner

# Accept VERSION as build argument and set as environment variable
ARG VERSION=latest
ENV VERSION=$VERSION

# Set production environment
ENV NODE_ENV=production

# Set the default FOLDER environment variable
ENV FOLDER=/app/config
ENV CONFIG_FOLDER=/app/config/config

# Set the working directory at repo root (we'll switch to package dir later)
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl curl

# Copy only the built application and necessary files
# Place the built backend into the package folder so runtime resolves node_modules correctly
COPY --from=builder /app/dist/backend ./apps/backend/dist/

# install only production dependencies for the backend package
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN corepack enable
# Switch to backend package directory and install its prod deps
WORKDIR /app/apps/backend
RUN pnpm install --frozen-lockfile --prod

# Ensure config directory exists at /app/config (independent of workdir)
RUN mkdir -p /app/config

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

# Specify the command to run the application from the backend package directory
CMD ["node", "dist/main.js"]
