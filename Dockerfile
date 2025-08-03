# Use Node.js as the base image for building the application
FROM node:23-alpine AS builder

# Set the working directory
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl

# Copy patch files
#COPY ./patches ./patches/


# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . ./

# Build the NestJS application
RUN pnpm build

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

# Set the working directory
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl curl

# Copy only the built application and necessary files
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/patches ./patches

# install only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile --prod

RUN mkdir config

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

# Specify the command to run the application
CMD ["node", "dist/main.js"]
