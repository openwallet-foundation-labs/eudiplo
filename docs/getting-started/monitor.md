# EUDIPLO Monitoring Setup

This document describes how to set up Prometheus monitoring for the EUDIPLO service using Docker Compose.

## Quick Start

### Option 1: Basic Setup (Prometheus only)

To start EUDIPLO with Prometheus monitoring:

```bash
docker-compose up -d
```

This will start:
- **EUDIPLO service** on http://localhost:3000
- **Prometheus** on http://localhost:9090

### Option 2: Full Monitoring Stack (Prometheus + Grafana)

To start the complete monitoring stack:

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

This will start:
- **EUDIPLO service** on http://localhost:3000
- **Prometheus** on http://localhost:9090
- **Grafana** on http://localhost:3001

## Services Overview

### EUDIPLO Service
- **URL**: http://localhost:3000
- **Metrics endpoint**: http://localhost:3000/metrics
- **Per-tenant metrics**: http://localhost:3000/metrics/tenant/{tenantId}
- **Tenant list**: http://localhost:3000/metrics/tenants

### Prometheus
- **URL**: http://localhost:9090
- **Configuration**: `./prometheus/prometheus.yml`
- **Rules**: `./prometheus/rules/eudiplo.yml`
- **Data persistence**: Docker volume `prometheus_data`

### Grafana (Optional)
- **URL**: http://localhost:3001
- **Username**: admin
- **Password**: admin
- **Configuration**: `./grafana/provisioning/`
- **Dashboards**: `./grafana/dashboards/`
- **Data persistence**: Docker volume `grafana_data`

## Configuration Files

### Prometheus Configuration (`prometheus/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'eudiplo'
    static_configs:
      - targets: ['EUDIPLO:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Alerting Rules (`prometheus/rules/eudiplo.yml`)

The setup includes predefined alerting rules for:
- High error rates
- Credential issuance failures
- Service downtime
- High response times
- Resource usage (if node_exporter is available)

## Key Metrics Available

### Business Metrics
- `credential_issuance_total` - Total credentials issued per tenant
- `credential_issuance_failures_total` - Failed credential issuances
- `credential_verification_total` - Credential verifications
- `active_sessions_total` - Active sessions per tenant
- `webhook_calls_total` - Webhook calls made

### Technical Metrics
- `http_requests_total` - HTTP requests by method, status, tenant
- `http_request_duration_seconds` - Request duration histograms
- `application_errors_total` - Application errors by type

### System Metrics (if enabled)
- Node exporter metrics for system monitoring
- Container metrics for resource usage

## Multi-Tenant Monitoring

All business metrics include a `tenant_id` label for multi-tenant monitoring:

### Example Prometheus Queries

```promql
# Credentials issued per tenant
sum(credential_issuance_total) by (tenant_id)

# Error rate per tenant (last 5 minutes)
rate(application_errors_total[5m]) by (tenant_id)

# Active sessions per tenant
active_sessions_total by (tenant_id)

# HTTP request rate by tenant
rate(http_requests_total[5m]) by (tenant_id)
```

## Customization

### Adding Custom Metrics

1. Update your EUDIPLO service to expose additional metrics
2. Metrics will automatically be scraped by Prometheus
3. Add alerting rules if needed in `prometheus/rules/eudiplo.yml`

### Adding Custom Dashboards

1. Create dashboard JSON files in `grafana/dashboards/`
2. Restart Grafana: `docker-compose restart grafana`
3. Dashboards will be automatically imported

### Modifying Scrape Intervals

Edit `prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'eudiplo'
    scrape_interval: 15s  # Change from 30s to 15s
    # ... other config
```

### Adding Alertmanager

1. Add Alertmanager service to docker-compose.yml:

```yaml
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - '9093:9093'
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - monitoring
```

2. Update Prometheus configuration to include alerting:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## Maintenance

### Data Retention

Prometheus data is retained for 200 hours by default. To change:

```yaml
command:
  - '--storage.tsdb.retention.time=720h'  # 30 days
```

### Backup and Restore

#### Prometheus Data
```bash
# Backup
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz -C /data .

# Restore
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /data
```

#### Grafana Data
```bash
# Backup
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .

# Restore
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /data
```

### Monitoring the Monitoring

- Check Prometheus targets: http://localhost:9090/targets
- Check Prometheus configuration: http://localhost:9090/config
- Check alerting rules: http://localhost:9090/rules
- Check Grafana health: http://localhost:3001/api/health

## Troubleshooting

### Common Issues

1. **Prometheus can't connect to EUDIPLO**
   - Check if both services are on the same network
   - Verify EUDIPLO service name in prometheus.yml matches docker-compose.yml
   - Check if EUDIPLO metrics endpoint is accessible: `curl http://localhost:3000/metrics`

2. **No data in Grafana**
   - Verify Prometheus datasource is configured correctly
   - Check if Prometheus is scraping data: http://localhost:9090/targets
   - Verify time range in Grafana dashboards

3. **High memory usage**
   - Reduce Prometheus retention time
   - Increase scrape intervals
   - Monitor metric cardinality (number of unique label combinations)

4. **Container startup issues**
   - Check logs: `docker-compose logs prometheus`
   - Verify configuration syntax: `docker exec prometheus promtool check config /etc/prometheus/prometheus.yml`

### Health Checks

```bash
# Check all services
docker-compose ps

# Check Prometheus configuration
curl http://localhost:9090/-/healthy

# Check EUDIPLO metrics endpoint
curl http://localhost:3000/metrics/health

# Check Grafana
curl http://localhost:3001/api/health
```

## Security Considerations

### Production Deployment

1. **Change default passwords**:
   ```yaml
   environment:
     - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
   ```

2. **Enable authentication for Prometheus**:
   - Add reverse proxy with authentication
   - Use network policies to restrict access

3. **Secure metrics endpoints**:
   - Add authentication to EUDIPLO metrics endpoints
   - Use HTTPS in production

4. **Data encryption**:
   - Configure TLS for inter-service communication
   - Encrypt persistent volumes

### Network Security

```yaml
networks:
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Performance Tuning

### Prometheus

```yaml
command:
  - '--storage.tsdb.retention.time=720h'
  - '--storage.tsdb.retention.size=10GB'
  - '--query.max-concurrency=20'
  - '--query.timeout=2m'
```

### Grafana

```yaml
environment:
  - GF_DATABASE_WAL=true
  - GF_LOG_LEVEL=warn
  - GF_SNAPSHOTS_EXTERNAL_ENABLED=false
```

## Integration with CI/CD

### Docker Compose Override

Create `docker-compose.override.yml` for local development:

```yaml
services:
  EUDIPLO:
    environment:
      - LOG_LEVEL=debug
  
  prometheus:
    ports:
      - '9090:9090'  # Expose only in development
```

### Environment-specific Configuration

Use environment variables in docker-compose.yml:

```yaml
environment:
  - PROMETHEUS_RETENTION=${PROMETHEUS_RETENTION:-200h}
  - GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
```
