FROM node:22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build \
	&& pnpm -C apps/client build
RUN pnpm deploy --filter=@eudiplo/backend --prod /prod/backend

FROM base AS eudiplo
# Copy production dependencies for backend and built dist
COPY --from=build /prod/backend /app
COPY --from=build /usr/src/app/dist/backend /app/dist

# Accept VERSION as build argument and set as environment variable
ARG VERSION=latest
ENV VERSION=$VERSION

# Set production environment
ENV NODE_ENV=production

# Set the default FOLDER environment variable
ENV FOLDER=/app/config
ENV CONFIG_FOLDER=/app/config/config

WORKDIR /app
EXPOSE 3000

# --- Healthcheck dependencies ---
# Install curl for HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# --- HEALTHCHECK ---
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run compiled NestJS app
CMD [ "node", "dist/main.js" ]

FROM nginx:alpine AS client
# Copy the Angular build output into the nginx html directory.
# The Angular output path is configured as apps/client/dist/apps/client in angular.json.
COPY --from=build /usr/src/app/apps/client/dist/apps/client/browser /usr/share/nginx/html

# Copy nginx configuration
COPY apps/client/nginx.conf /etc/nginx/nginx.conf

# Expose port 80 and start nginx
EXPOSE 80

# --- Healthcheck dependencies ---
RUN apk add --no-cache curl

# --- HEALTHCHECK (Client / Nginx) ---
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost/ || exit 

CMD ["nginx", "-g", "daemon off;"]
