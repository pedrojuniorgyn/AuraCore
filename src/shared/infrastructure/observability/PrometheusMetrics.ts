/**
 * In-house Prometheus-compatible Metrics Collector
 *
 * Provides Counter, Histogram, and Gauge metric types that output
 * Prometheus text exposition format without external dependencies.
 *
 * Singleton instance collects HTTP request metrics, database query
 * durations, and active connection counts in memory.
 *
 * @module shared/infrastructure/observability/PrometheusMetrics
 * @see OBS-002 - Prometheus Metrics
 * @see https://prometheus.io/docs/instrumenting/exposition_formats/
 */

// ─── Metric Value Types ─────────────────────────────────────────────────────

/** Label key-value pairs attached to a metric sample */
type Labels = Record<string, string>;

/**
 * Serialises a labels object into the Prometheus `{key="value",...}` format.
 * Returns an empty string when labels are empty.
 */
function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  const inner = entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',');
  return `{${inner}}`;
}

/**
 * Escapes special characters in Prometheus label values.
 * Per the spec: backslash, double-quote, and newline must be escaped.
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Builds a unique string key for a given label combination.
 * Used as Map key for storing per-label-set values.
 */
function labelsKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
}

// ─── Counter ────────────────────────────────────────────────────────────────

/**
 * A monotonically increasing counter metric.
 *
 * @example
 * ```typescript
 * const counter = new Counter('http_requests_total', 'Total HTTP requests');
 * counter.inc({ method: 'GET', path: '/api/health', status_code: '200' });
 * ```
 */
class Counter {
  private values = new Map<string, { labels: Labels; value: number }>();

  constructor(
    /** Metric name following Prometheus naming conventions */
    readonly name: string,
    /** Human-readable description for the HELP line */
    readonly help: string,
  ) {}

  /** Increments the counter by `amount` (default 1) for the given labels. */
  inc(labels: Labels = {}, amount = 1): void {
    const key = labelsKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.values.set(key, { labels, value: amount });
    }
  }

  /** Returns the current value for the given label set. */
  get(labels: Labels = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0;
  }

  /** Serialises all samples into Prometheus text format lines. */
  serialize(): string {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${formatLabels(labels)} ${value}`);
    }
    return lines.join('\n');
  }

  /** Resets all tracked values (useful for tests). */
  reset(): void {
    this.values.clear();
  }
}

// ─── Histogram ──────────────────────────────────────────────────────────────

/**
 * A histogram metric that tracks the distribution of observed values
 * across configurable buckets.
 *
 * @example
 * ```typescript
 * const hist = new Histogram(
 *   'http_request_duration_seconds',
 *   'HTTP request duration',
 *   [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
 * );
 * hist.observe({ method: 'GET', path: '/api/health' }, 0.042);
 * ```
 */
class Histogram {
  private data = new Map<
    string,
    { labels: Labels; buckets: number[]; sum: number; count: number }
  >();

  constructor(
    /** Metric name */
    readonly name: string,
    /** Human-readable description */
    readonly help: string,
    /** Upper-bound bucket boundaries (sorted ascending) */
    readonly bucketBoundaries: number[],
  ) {
    // Ensure boundaries are sorted
    this.bucketBoundaries = [...bucketBoundaries].sort((a, b) => a - b);
  }

  /** Records an observed value into the appropriate buckets. */
  observe(labels: Labels = {}, value: number): void {
    const key = labelsKey(labels);
    let entry = this.data.get(key);
    if (!entry) {
      entry = {
        labels,
        buckets: new Array(this.bucketBoundaries.length).fill(0) as number[],
        sum: 0,
        count: 0,
      };
      this.data.set(key, entry);
    }

    entry.sum += value;
    entry.count += 1;

    for (let i = 0; i < this.bucketBoundaries.length; i++) {
      if (value <= this.bucketBoundaries[i]) {
        entry.buckets[i] += 1;
      }
    }
  }

  /** Serialises all samples into Prometheus text format. */
  serialize(): string {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} histogram`,
    ];

    for (const { labels, buckets, sum, count } of this.data.values()) {
      const labelStr = formatLabels(labels);
      const baseLabels = Object.entries(labels);

      // Cumulative bucket counts
      let cumulative = 0;
      for (let i = 0; i < this.bucketBoundaries.length; i++) {
        cumulative += buckets[i];
        const bucketLabels = [...baseLabels, ['le', String(this.bucketBoundaries[i])]];
        const bucketLabelStr = `{${bucketLabels.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}}`;
        lines.push(`${this.name}_bucket${bucketLabelStr} ${cumulative}`);
      }

      // +Inf bucket (always equals count)
      const infLabels = [...baseLabels, ['le', '+Inf']];
      const infLabelStr = `{${infLabels.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}}`;
      lines.push(`${this.name}_bucket${infLabelStr} ${count}`);

      lines.push(`${this.name}_sum${labelStr} ${sum}`);
      lines.push(`${this.name}_count${labelStr} ${count}`);
    }

    return lines.join('\n');
  }

  /** Resets all tracked values. */
  reset(): void {
    this.data.clear();
  }
}

// ─── Gauge ──────────────────────────────────────────────────────────────────

/**
 * A gauge metric that can go up and down.
 *
 * @example
 * ```typescript
 * const gauge = new Gauge('active_connections', 'Number of active connections');
 * gauge.inc();  // connection opened
 * gauge.dec();  // connection closed
 * ```
 */
class Gauge {
  private values = new Map<string, { labels: Labels; value: number }>();

  constructor(
    /** Metric name */
    readonly name: string,
    /** Human-readable description */
    readonly help: string,
  ) {}

  /** Sets the gauge to an exact value. */
  set(labels: Labels = {}, value: number): void {
    const key = labelsKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value = value;
    } else {
      this.values.set(key, { labels, value });
    }
  }

  /** Increments the gauge by `amount` (default 1). */
  inc(labels: Labels = {}, amount = 1): void {
    const current = this.get(labels);
    this.set(labels, current + amount);
  }

  /** Decrements the gauge by `amount` (default 1). */
  dec(labels: Labels = {}, amount = 1): void {
    const current = this.get(labels);
    this.set(labels, current - amount);
  }

  /** Returns the current gauge value. */
  get(labels: Labels = {}): number {
    return this.values.get(labelsKey(labels))?.value ?? 0;
  }

  /** Serialises all samples into Prometheus text format. */
  serialize(): string {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} gauge`,
    ];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${formatLabels(labels)} ${value}`);
    }
    return lines.join('\n');
  }

  /** Resets all tracked values. */
  reset(): void {
    this.values.clear();
  }
}

// ─── PrometheusMetrics Singleton ────────────────────────────────────────────

/**
 * Singleton registry that holds all application metrics and serialises them
 * into Prometheus exposition format on demand.
 *
 * **Pre-registered metrics:**
 *
 * | Name | Type | Labels | Description |
 * |------|------|--------|-------------|
 * | `http_requests_total` | counter | method, path, status_code | Total HTTP requests |
 * | `http_request_duration_seconds` | histogram | method, path | Request latency distribution |
 * | `http_request_errors_total` | counter | method, path, error_type | Total HTTP errors |
 * | `database_query_duration_seconds` | histogram | — | DB query latency distribution |
 * | `active_connections` | gauge | — | Currently open connections |
 *
 * @example
 * ```typescript
 * const metrics = PrometheusMetrics.getInstance();
 * metrics.httpRequestsTotal.inc({ method: 'GET', path: '/api/health', status_code: '200' });
 * metrics.httpRequestDuration.observe({ method: 'GET', path: '/api/health' }, 0.042);
 * ```
 */
export class PrometheusMetrics {
  // ── Singleton ──────────────────────────────────────────────────────────
  private static instance: PrometheusMetrics | null = null;

  /** Returns the global singleton instance. */
  static getInstance(): PrometheusMetrics {
    if (!PrometheusMetrics.instance) {
      PrometheusMetrics.instance = new PrometheusMetrics();
    }
    return PrometheusMetrics.instance;
  }

  /** Resets the singleton (tests only). */
  static resetInstance(): void {
    PrometheusMetrics.instance = null;
  }

  // ── Pre-registered Metrics ─────────────────────────────────────────────

  /** Total HTTP requests counter — labels: method, path, status_code */
  readonly httpRequestsTotal = new Counter(
    'http_requests_total',
    'Total number of HTTP requests',
  );

  /** HTTP request duration histogram — labels: method, path */
  readonly httpRequestDuration = new Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  );

  /** HTTP request errors counter — labels: method, path, error_type */
  readonly httpRequestErrors = new Counter(
    'http_request_errors_total',
    'Total number of HTTP request errors',
  );

  /** Database query duration histogram */
  readonly databaseQueryDuration = new Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],
  );

  /** Active connections gauge */
  readonly activeConnections = new Gauge(
    'active_connections',
    'Number of currently active connections',
  );

  /** Registry of all metrics for serialisation */
  private readonly registry: Array<{ serialize(): string }>;

  private constructor() {
    this.registry = [
      this.httpRequestsTotal,
      this.httpRequestDuration,
      this.httpRequestErrors,
      this.databaseQueryDuration,
      this.activeConnections,
    ];
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Serialises all registered metrics into Prometheus text exposition format.
   *
   * @returns Plain-text body suitable for a `/metrics` endpoint response
   *          with content-type `text/plain; version=0.0.4; charset=utf-8`.
   */
  serialize(): string {
    return this.registry.map((m) => m.serialize()).join('\n\n') + '\n';
  }

  /**
   * Resets all metrics to zero.
   * Intended for testing; **never call in production**.
   */
  resetAll(): void {
    this.httpRequestsTotal.reset();
    this.httpRequestDuration.reset();
    this.httpRequestErrors.reset();
    this.databaseQueryDuration.reset();
    this.activeConnections.reset();
  }
}
