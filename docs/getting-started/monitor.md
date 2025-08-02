# Monitoring

This guide shows how to set up Prometheus and Grafana monitoring for EUDIPLO in
both local development and Docker container scenarios.

## Quick Start

The monitoring stack includes:

- **Prometheus** on http://localhost:9090 - Metrics collection
- **Grafana** on http://localhost:3001 - Dashboards and visualization

### Start Monitoring Stack

```bash
cd monitor/
docker-compose up -d
```

## Local Development Setup

When running EUDIPLO locally (outside Docker) and monitoring with Docker:

### 1. Start EUDIPLO Locally

```bash
# Install dependencies and start EUDIPLO
npm install
npm run start:dev
```

EUDIPLO will be available at http://localhost:3000 with metrics at
http://localhost:3000/metrics

### 2. Configure Prometheus for Local EUDIPLO

Update `monitor/prometheus/prometheus.yml`:

```yaml
global:
    scrape_interval: 15s

scrape_configs:
    - job_name: 'eudiplo-local'
      static_configs:
          - targets: ['host.docker.internal:3000'] # For local EUDIPLO
      metrics_path: '/metrics'
      scrape_interval: 30s
```

### 3. Start Monitoring

```bash
cd monitor/
docker-compose up -d prometheus grafana
```

## Docker Container Setup

When running EUDIPLO as a Docker container:

### 1. Update Prometheus Configuration

Edit `monitor/prometheus/prometheus.yml`:

```yaml
global:
    scrape_interval: 15s

scrape_configs:
    - job_name: 'eudiplo-docker'
      static_configs:
          - targets: ['eudiplo:3000'] # For Docker container
      metrics_path: '/metrics'
      scrape_interval: 30s
```

### 2. Add EUDIPLO to Docker Compose

Add to `monitor/docker-compose.yml`:

```yaml
services:
    eudiplo:
        image: eudiplo/eudiplo:latest
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=development
            - PUBLIC_URL=http://localhost:3000
        networks:
            - monitoring

    prometheus:
        # ... existing config

networks:
    monitoring:
        driver: bridge
```

### 3. Start Full Stack

```bash
cd monitor/
docker-compose up -d
```

## Key Metrics

Right now only the sessions will be monitored, but you can extend this to
include more metrics as needed like:

### Business Metrics

- `credential_issuance_total` - Credentials issued
- `credential_verification_total` - Verifications performed
- `active_sessions_total` - Current active sessions

### Technical Metrics

- `http_requests_total` - HTTP requests by status
- `http_request_duration_seconds` - Request latency
- `nodejs_heap_used_bytes` - Memory usage

### Example Queries

```promql
# Request rate (last 5 minutes)
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"4..|5.."}[5m])

# Memory usage
nodejs_heap_used_bytes / 1024 / 1024
```

## Access Dashboards

1. **Prometheus**: http://localhost:9090
    - View metrics and run queries
    - Check targets status at `/targets`

2. **Grafana**: http://localhost:3001
    - Username: `admin`
    - Password: `admin`
    - Import or create dashboards

## Configuration Files

### Prometheus (`prometheus/prometheus.yml`)

```yaml
global:
    scrape_interval: 15s

scrape_configs:
    - job_name: 'eudiplo'
      static_configs:
          - targets: ['host.docker.internal:3000'] # Local
          # - targets: ['eudiplo:3000']             # Docker
      scrape_interval: 30s
```

### Grafana Data Source

Grafana is pre-configured with Prometheus as data source at
`http://prometheus:9090`.

## Troubleshooting

### Common Issues

**Prometheus can't reach EUDIPLO:**

```bash
# Check if metrics endpoint is accessible
curl http://localhost:3000/metrics

# For local development, verify host.docker.internal works
docker run --rm appropriate/curl curl -I http://host.docker.internal:3000/metrics
```

**No data in Grafana:**

- Check Prometheus targets: http://localhost:9090/targets
- Verify time range in Grafana dashboards
- Ensure Prometheus data source is configured

**Container issues:**

```bash
# Check logs
docker-compose logs prometheus
docker-compose logs grafana

# Restart services
docker-compose restart
```

## Production Considerations

For production deployments:

1. **Security**: Change default Grafana password
2. **Retention**: Configure appropriate data retention
3. **Backup**: Set up regular backups of Grafana dashboards
4. **Alerting**: Configure alertmanager for notifications
5. **Resources**: Monitor resource usage and scale accordingly

## Clean Up

```bash
# Stop monitoring stack
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```
