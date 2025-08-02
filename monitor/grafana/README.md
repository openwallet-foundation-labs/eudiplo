# Grafana Custom Configuration

This document explains how the `custom.ini` file is integrated into the EUDIPLO
monitoring setup.

## Configuration File Location

- **Host Path**: `./grafana/custom.ini`
- **Container Path**: `/etc/grafana/grafana.ini`

## Docker Compose Integration

The `custom.ini` file is mounted as the main Grafana configuration file:

```yaml
services:
    grafana:
        # ...other config...
        volumes:
            - grafana_data:/var/lib/grafana
            - ./grafana/provisioning:/etc/grafana/provisioning:ro
            - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
            - ./grafana/custom.ini:/etc/grafana/grafana.ini:ro # Custom config
```

## Features Enabled

The current `custom.ini` includes:

### Feature Toggles

- `provisioning = true` - Enables dashboard/datasource provisioning
- `kubernetesClientDashboardsFolders = true` - K8s dashboard folders
- `kubernetesDashboards = true` - K8s dashboards from browser
- `grafanaAPIServerEnsureKubectlAccess = true` - Easy kubectl access
- `prometheusConfigOverhaul = true` - Enhanced Prometheus support
- `alertingBigTransactions = true` - Better alerting performance

### Security & User Settings

- Sign-up disabled for security
- Admin credentials via environment variables
- Dark theme as default

### Dashboard Settings

- Auto-provisioning from `/var/lib/grafana/dashboards`
- Default dashboard set to EUDIPLO overview

## Accessing Grafana

1. **URL**: http://localhost:3001
2. **Username**: admin
3. **Password**: admin

## Applying Configuration Changes

To apply changes to `custom.ini`:

```bash
# Stop services
docker-compose down

# Make your changes to grafana/custom.ini
# ...

# Restart services
docker-compose up -d

# Check logs
docker-compose logs grafana
```

## Available Dashboards

After startup, you should see:

1. **EUDIPLO Session Metrics** - Session monitoring dashboard
    - Active sessions by tenant and type
    - Session success rates
    - Session creation/completion rates

## Configuration Sections

### [feature_toggles]

Controls experimental and beta features in Grafana.

### [log]

Controls logging level and output formatting.

### [server]

HTTP server settings (port, protocol, domain).

### [security]

Authentication and authorization settings.

### [users]

User management and default settings.

### [dashboards]

Dashboard provisioning and default settings.

## Troubleshooting

### Configuration Not Loading

```bash
# Check if file is mounted correctly
docker exec grafana cat /etc/grafana/grafana.ini | head -10

# Check Grafana logs for config errors
docker-compose logs grafana | grep -i error
```

### Dashboard Provisioning Issues

```bash
# Check provisioning logs
docker-compose logs grafana | grep provisioning

# Verify dashboard files exist
ls -la grafana/dashboards/
```

### Feature Toggles Not Working

- Ensure Grafana version supports the feature toggle
- Check feature toggle spelling in configuration
- Review Grafana documentation for version-specific toggles

## Customization

To add more configuration options, edit `grafana/custom.ini`:

```ini
# Example: Enable additional features
[feature_toggles]
# Add new feature toggles here
newFeature = true

# Example: Custom SMTP settings
[smtp]
enabled = true
host = smtp.company.com:587
user = grafana@company.com
password = your_password

# Example: OAuth integration
[auth.google]
enabled = true
client_id = your_client_id
client_secret = your_client_secret
```

## Security Notes

- The current setup uses default admin credentials
- For production, use strong passwords and proper authentication
- Consider using OAuth or LDAP integration
- Enable HTTPS in production environments

## References

- [Grafana Configuration Documentation](https://grafana.com/docs/grafana/latest/administration/configuration/)
- [Feature Toggles List](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#feature_toggles)
- [Provisioning Documentation](https://grafana.com/docs/grafana/latest/administration/provisioning/)
