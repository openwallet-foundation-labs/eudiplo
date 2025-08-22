# Web Client

EUDIPLO provides a user-friendly web interface for credential management—no API expertise required. Simply enter your instance URL and credentials to get started. There's no need to deploy a separate client for each instance.

There is no need to use the client to interact with EUDIPLO, but it offers a more intuitive way to manage the configurations.

## Getting Started

### Accessing the Web Client

After completing the [Full Setup](./quick-start.md#step-1-choose-your-setup):

1. **Open your browser** and go to: [http://localhost:4200](http://localhost:4200)
2. **Login** using the default credentials:
   - **Username:** `root`
   - **Password:** `root`

> **Important:** Change the default credentials before using EUDIPLO in production. See [Authentication](../api/authentication.md) for details.

---

## Dashboard Overview

The dashboard offers:

- **Quick Actions:** One-click access to common tasks
- **Statistics:** Usage metrics and activity summaries _(coming soon)_

---

## Core Features

### 🎫 Credential Issuance Management

- Create, edit, import, or delete credential and issuance configurations
- Import keys and certificates, and link them to configurations

### ✅ Credential Verification

- Manage verification flows
- Create, edit, import, or delete verification configurations

### 📋 Session Management

- View and manage active issuance and verification sessions
- Inspect session details, including parameters

### 🧑‍💼 Client Management

- Create new tenants with client ID and secret (Keycloak only)
- Not supported for other identity providers or when using EUDIPLO as IAM yet

---

## Next Steps

- [API Documentation](../api/index.md): For programmatic integration
- [Configuration](../architecture/overview.md): Advanced setup options
- [Architecture](../architecture/overview.md): System design overview
