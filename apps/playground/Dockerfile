# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/playground/package.json ./apps/playground/
COPY packages/eudiplo-sdk-core/package.json ./packages/eudiplo-sdk-core/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/eudiplo-sdk-core ./packages/eudiplo-sdk-core
COPY apps/playground ./apps/playground

# Build SDK first, then playground
WORKDIR /app/packages/eudiplo-sdk-core
RUN pnpm run build

WORKDIR /app/apps/playground
RUN pnpm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/apps/playground/dist ./dist
COPY --from=builder /app/apps/playground/public ./public
COPY --from=builder /app/apps/playground/package.json ./

# Install only production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --ignore-scripts

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]
