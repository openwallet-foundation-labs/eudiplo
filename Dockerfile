# Use Node.js as the base image for building the application
FROM node:23-alpine AS builder

ARG APP

# Set the working directory
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl

# Copy patch files
#COPY ./patches ./patches/


# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . ./

# Build the NestJS application
#RUN pnpm build $APP
RUN pnpm build

# Use a smaller base image for the runtime stage
FROM node:23-alpine AS runner

ARG APP

# Set the working directory
WORKDIR /app

# Install pnpm globally and openssl
RUN apk add --no-cache openssl

# Copy only the built application and necessary files
#COPY --from=builder /app/dist/apps/$APP ./dist/
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/patches ./patches

# install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

RUN mkdir config

EXPOSE 3000

# Specify the command to run the application
CMD ["node", "dist/main.js"]
