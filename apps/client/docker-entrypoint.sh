#!/bin/sh
# Recreate env.js file with runtime environment variables

# Set defaults if not provided
API_BASE_URL=${API_BASE_URL:-http://localhost:3000}
VERSION=${VERSION:-dev}
BASE_HREF=${BASE_HREF:-/}

# Normalize BASE_HREF: must start and end with /
case "$BASE_HREF" in
  /*) ;;
  *) BASE_HREF="/$BASE_HREF" ;;
esac
case "$BASE_HREF" in
  */) ;;
  *) BASE_HREF="$BASE_HREF/" ;;
esac

# Generate timestamp for cache busting
TIMESTAMP=$(date +%s)

# Replace base href in index.html (supports both self-closing and non-self-closing variants)
sed -i 's|<base href="[^"]*"[^>]*>|<base href="'"${BASE_HREF}"'">|g' /usr/share/nginx/html/index.html

# Replace env.js content with timestamp in the file
cat > /usr/share/nginx/html/env.js << EOF
(function (window) {
  window['env'] = window['env'] || {};

  // Environment variables
  window['env']['apiUrl'] = '${API_BASE_URL}';

  // Application version
  window['env']['version'] = '${VERSION}';

  // Cache busting timestamp (changes every container start)
  window['env']['timestamp'] = '${TIMESTAMP}';
})(this);
EOF

echo "env.js configured with API_BASE_URL: ${API_BASE_URL}, VERSION: ${VERSION}, timestamp: ${TIMESTAMP}"

# Start nginx
exec "$@"
