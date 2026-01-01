#!/bin/sh
# Recreate env.js file with runtime environment variables

# Set defaults if not provided
API_BASE_URL=${API_BASE_URL:-http://localhost:3000}
VERSION=${VERSION:-dev}

# Generate timestamp for cache busting
TIMESTAMP=$(date +%s)

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
