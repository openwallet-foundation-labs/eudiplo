import { Injectable } from '@angular/core';
import { client } from '@eudiplo/sdk-core';

export interface GrafanaConfig {
  url?: string;
  tempoUid: string;
  lokiUid: string;
}

interface FrontendConfig {
  grafana: GrafanaConfig;
}

@Injectable({
  providedIn: 'root',
})
export class GrafanaLinkService {
  private config: GrafanaConfig | null = null;
  private configPromise: Promise<GrafanaConfig | null> | null = null;

  /**
   * Fetches and caches the Grafana configuration from the backend.
   */
  async getConfig(): Promise<GrafanaConfig | null> {
    if (this.config !== null) {
      return this.config;
    }
    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = client
      .get<FrontendConfig>({
        security: [{ scheme: 'bearer', type: 'http' }],
        url: '/api/frontend-config',
      })
      .then((response) => {
        this.config = (response.data as FrontendConfig)?.grafana ?? null;
        return this.config;
      })
      .catch(() => {
        this.config = null;
        return null;
      })
      .finally(() => {
        this.configPromise = null;
      });

    return this.configPromise;
  }

  /**
   * Whether Grafana deep linking is available.
   */
  isEnabled(): boolean {
    return !!this.config?.url;
  }

  /**
   * Returns the base Grafana URL, or null if not configured.
   */
  getBaseUrl(): string | null {
    return this.config?.url ?? null;
  }

  /**
   * Build a Grafana Explore URL for viewing a trace by its ID in Tempo.
   */
  buildTraceUrl(traceId: string): string | null {
    if (!this.config?.url) return null;

    const panes = JSON.stringify({
      x: {
        datasource: this.config.tempoUid,
        queries: [{ refId: 'A', queryType: 'traceql', query: traceId }],
        range: { from: 'now-1h', to: 'now' },
      },
    });

    return `${this.config.url}/explore?schemaVersion=1&panes=${encodeURIComponent(panes)}`;
  }

  /**
   * Build a Grafana Explore URL for viewing logs filtered by session ID in Loki.
   */
  buildSessionLogsUrl(sessionId: string, from?: Date, to?: Date): string | null {
    if (!this.config?.url) return null;

    const fromStr = from ? String(from.getTime()) : 'now-1h';
    const toStr = to ? String(to.getTime()) : 'now';

    const panes = JSON.stringify({
      x: {
        datasource: this.config.lokiUid,
        queries: [
          {
            refId: 'A',
            expr: `{service_name="eudiplo-backend"} |= "${sessionId}"`,
          },
        ],
        range: { from: fromStr, to: toStr },
      },
    });

    return `${this.config.url}/explore?schemaVersion=1&panes=${encodeURIComponent(panes)}`;
  }

  /**
   * Build a Grafana Explore URL for viewing traces filtered by session ID in Tempo.
   */
  buildSessionTracesUrl(sessionId: string): string | null {
    if (!this.config?.url) return null;

    const panes = JSON.stringify({
      x: {
        datasource: this.config.tempoUid,
        queries: [
          {
            refId: 'A',
            queryType: 'traceql',
            query: `{span.session.id="${sessionId}"}`,
          },
        ],
        range: { from: 'now-1h', to: 'now' },
      },
    });

    return `${this.config.url}/explore?schemaVersion=1&panes=${encodeURIComponent(panes)}`;
  }

  /**
   * Reset the cached config (e.g., on logout).
   */
  reset(): void {
    this.config = null;
    this.configPromise = null;
  }
}
