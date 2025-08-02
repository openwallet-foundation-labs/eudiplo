# EUDIPLO Monitoring Stack

This folder contains a complete monitoring setup for EUDIPLO using Prometheus
and Grafana.

## Quick Start

From this `monitor` directory, run:

```bash
docker-compose up -d
```

This will start:

- **Prometheus** on http://localhost:9090
- **Grafana** on http://localhost:3001

## Development Modes

### Monitoring Docker Container

The default configuration monitors the EUDIPLO service running in Docker
container.

### Monitoring Local Node.js Application

Prometheus is configured to monitor both:

1. **Docker container**: `eudiplo:3000` (when running via docker-compose)
2. **Local Node.js**: `host.docker.internal:3000` (when running `npm start`
   locally)

To run EUDIPLO locally and monitor it:

```bash
# Terminal 1: Start monitoring stack (from monitor folder)
docker-compose up -d

# Terminal 2: Start EUDIPLO locally (from project root)
cd ..
npm start

# Now Prometheus will scrape metrics from localhost:3000
```

Both targets will appear in Prometheus with different job names:

- `eudiplo-docker` - For containerized version
- `eudiplo-local` - For local Node.js version

You can see both in Prometheus targets page: http://localhost:9090/targets

### Switching Configurations

If you want to use a different configuration:

```bash
# Use the flexible configuration that adds deployment labels
cp prometheus/prometheus-flexible.yml prometheus/prometheus.yml
docker-compose restart prometheus
```

### Easy Configuration Script

Use the provided script to switch between monitoring modes:

```bash
# Monitor both local and Docker (default)
./configure-prometheus.sh both

# Monitor only local Node.js application
./configure-prometheus.sh local-only

# Monitor only Docker container
./configure-prometheus.sh docker-only

# Use flexible config with deployment labels
./configure-prometheus.sh flexible

# Check current configuration
./configure-prometheus.sh status

# Show help
./configure-prometheus.sh help
```

The script automatically restarts Prometheus to apply the new configuration.

## Services

### EUDIPLO Service

- URL: http://localhost:3000
- Metrics: http://localhost:3000/metrics
- Per-tenant metrics: http://localhost:3000/metrics/tenant/{tenantId}
- Health check: http://localhost:3000/metrics/health

### Prometheus

- URL: http://localhost:9090
- Targets: http://localhost:9090/targets
- Rules: http://localhost:9090/rules

### Grafana

- URL: http://localhost:3001
- Username: `admin`
- Password: `admin`

## Configuration

### Prometheus

- Configuration: `prometheus/prometheus.yml`
- Alerting rules: `prometheus/rules/eudiplo.yml`
- Data retention: 200 hours (configurable)

### Grafana

- Datasource: Auto-configured Prometheus
- Provisioning: `grafana/provisioning/`
- Dashboards: `grafana/dashboards/`

## Multi-Tenant Metrics

All business metrics include `tenant_id` labels for multi-tenant monitoring:

```promql
# Examples
sum(credential_issuance_total) by (tenant_id)
rate(application_errors_total[5m]) by (tenant_id)
active_sessions_total by (tenant_id)
```

## Available Metrics

### Business Metrics

- `credential_issuance_total` - Credentials issued per tenant
- `credential_issuance_failures_total` - Failed issuances
- `credential_verification_total` - Verifications performed
- `active_sessions_total` - Active sessions per tenant
- `webhook_calls_total` - Webhook calls made

### Technical Metrics

- `http_requests_total` - HTTP requests by method/status/tenant
- `http_request_duration_seconds` - Request duration histograms
- `application_errors_total` - Application errors by type/tenant

## Alerting Rules

Pre-configured alerts for:

- High error rates
- Credential issuance failures
- Service downtime
- High response times

## Management Commands

```bash
# Start monitoring stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop monitoring stack
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v

# Restart specific service
docker-compose restart prometheus
docker-compose restart grafana

# Update services
docker-compose pull
docker-compose up -d
```

## Data Persistence

- **Prometheus data**: Stored in `prometheus_data` Docker volume
- **Grafana data**: Stored in `grafana_data` Docker volume

To backup data:

```bash
# Backup Prometheus
docker run --rm -v monitor_prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz -C /data .

# Backup Grafana
docker run --rm -v monitor_grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .
```

## Customization

### Add Custom Metrics

1. Update EUDIPLO service to expose new metrics
2. Metrics will be automatically scraped

### Add Custom Alerts

1. Edit `prometheus/rules/eudiplo.yml`
2. Restart Prometheus: `docker-compose restart prometheus`

### Add Custom Dashboards

1. Create JSON files in `grafana/dashboards/`
2. Restart Grafana: `docker-compose restart grafana`

## Troubleshooting

### Check Service Health

```bash
# All services
docker-compose ps

# Prometheus targets
curl http://localhost:9090/targets

# EUDIPLO metrics
curl http://localhost:3000/metrics

# Grafana health
curl http://localhost:3001/health
```

### Common Issues

1. **Prometheus can't reach EUDIPLO**
    - Check if services are on same network
    - Verify target name in prometheus.yml matches service name

2. **No data in Grafana**
    - Check Prometheus targets are UP
    - Verify datasource configuration
    - Check time range in dashboards

3. **Permission errors**
    - Ensure file permissions allow Docker to read configs
    - Check volume mounts are correct

## Production Considerations

- Change default Grafana password
- Add authentication to Prometheus
- Configure proper data retention policies
- Set up external storage for long-term data
- Add SSL/TLS termination
- Configure backup strategies
