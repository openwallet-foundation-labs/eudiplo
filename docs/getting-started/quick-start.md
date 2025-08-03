# Quick Start

Get EUDIPLO running in under 2 minutes! This guide gets you from zero to issuing
your first credential.

!!! tip "New to EUDIPLO?"

    This is the fastest path to see EUDIPLO working. For
    production setup and advanced configuration, see the
    [Architecture](../architecture/overview.md) and [API](../api/index.md) sections.

---

## What You'll Need

- [Docker](https://www.docker.com/get-started) installed
- 2 minutes of your time ⏱️

---

## Step 1: One-Command Setup

```bash
# Run EUDIPLO with default settings
docker run -d \
  --name eudiplo-quickstart \
  -p 3000:3000 \
  -e PUBLIC_URL=http://localhost:3000 \
  -e AUTH_CLIENT_ID=demo \
  -e AUTH_CLIENT_SECRET=demo-secret \
  -e JWT_SECRET=quick-start-secret-32-characters-min \
  ghcr.io/openwallet-foundation-labs/eudiplo:latest
```

---

## Step 2: Verify It's Working

**Check health:**

```bash
curl http://localhost:3000/health
```

**Expected response:**

```json
{
    "status": "ok",
    "info": {
        "database": { "status": "up" }
    },
    "errors": {}
}
```

---

## Step 3: Explore the API

Open your browser and visit:

- 🏠 **API Documentation**: http://localhost:3000/api
- 📊 **Health Check**: http://localhost:3000/health

The Swagger UI includes authentication - use:

- **Client ID**: `demo`
- **Client Secret**: `demo-secret`

---

## Step 4: Authenticate via Swagger UI

1. **Open the API Documentation**: http://localhost:3000/api
2. **Click the "Authorize" button** (🔓 lock icon) in the top-right
3. **Enter your credentials**:
    - **Client ID**: `demo`
    - **Client Secret**: `demo-secret`
4. **Click "Authorize"** and then **"Close"**

You're now authenticated! The 🔓 icon should change to 🔒 (locked).

---

## Step 5: Test Your First API Call

1. **Find the "Issuer Management" section** in Swagger UI
2. **Expand** `/issuer-management/credentials` → **GET**
3. **Click "Try it out"** → **"Execute"**

You should see a successful response with available credential templates!

---

## 🎉 Success!

EUDIPLO is now running and ready for credential issuance and verification.

### What's Next?

- 📝 **[Issue Your First Credential](./issuance.md)** - Learn credential
  issuance flows
- 🔍 **[Verify Credentials](./presentation.md)** - Set up credential
  verification
- ⚙️ **[Production Setup](../architecture/overview.md)** - Deploy for production
  use
- 🔐 **[Advanced Authentication](../api/authentication.md)** - External OIDC,
  multi-tenant setup

### Clean Up

When you're done experimenting:

```bash
docker stop eudiplo-quickstart && docker rm eudiplo-quickstart
```
