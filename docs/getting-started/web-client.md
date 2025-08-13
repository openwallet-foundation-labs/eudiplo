# Web Client

EUDIPLO includes a web interface for easy credential management without requiring API knowledge.

## Getting Started

### Access the Web Client

After starting EUDIPLO with the [Full Setup](./quick-start.md#step-1-choose-your-setup):

1. **Open**: http://localhost:4200
2. **Login** with default credentials:
   - **Username**: `root`
   - **Password**: `root`

!!! tip "Production Setup"
    Replace default credentials before production use. See [Authentication](../api/authentication.md).

---

## Dashboard Overview

The main dashboard provides:

- **System Status** - Health and configuration overview
- **Active Sessions** - Real-time credential issuance/verification tracking
- **Quick Actions** - One-click access to common tasks
- **Statistics** - Usage metrics and activity summaries

---

## Core Features

### 🎫 Credential Issuance

1. **Navigate** to *Credential Management* → *Issue Credential*
2. **Select** a credential template
3. **Fill** required credential data
4. **Generate** QR code for wallet scanning
5. **Monitor** issuance status in real-time

### ✅ Credential Verification

1. **Navigate** to *Verification* → *Create Presentation Request*
2. **Configure** required credential types
3. **Generate** verification QR code
4. **Review** submitted presentations
5. **Accept/Reject** credentials

### 📋 Template Management

- **View** available credential templates
- **Configure** template parameters
- **Preview** credential schemas
- **Manage** display configurations

### 📊 Session Monitoring

- **Track** active credential sessions
- **View** session details and logs
- **Cancel** or retry failed sessions
- **Export** session data

---

## Common Workflows

### Issue Your First Credential

1. Go to **Credential Management**
2. Click **Issue New Credential**
3. Choose template (e.g., "Personal ID")
4. Enter credential data
5. Share QR code with wallet user
6. Confirm issuance completion

### Verify a Presentation

1. Go to **Verification**
2. Click **New Verification Request**
3. Select required credential types
4. Generate and share QR code
5. Review submitted credentials
6. Accept or reject presentation

---

## Next Steps

- 📖 **[API Documentation](../api/index.md)** - For programmatic integration
- 🔧 **[Configuration](../architecture/overview.md)** - Advanced setup options
- 🏗️ **[Architecture](../architecture/overview.md)** - System design overview

!!! info "Need API Access?"
    The web client and API work together. Use the API for automation while the web client provides oversight and manual operations.
