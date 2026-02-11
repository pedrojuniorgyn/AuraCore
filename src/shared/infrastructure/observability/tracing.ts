/**
 * OpenTelemetry Distributed Tracing Setup
 *
 * Provides a stable tracing API for the AuraCore application.
 * If @opentelemetry/sdk-node is installed, delegates to real OTel spans.
 * Otherwise, falls back to a lightweight no-op implementation that still
 * records timing via the existing performance tracker.
 *
 * Instruments HTTP requests, database calls, and integration operations.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT - OTLP collector endpoint (e.g. http://localhost:4318)
 *   OTEL_SERVICE_NAME           - Service name (default: 'auracore')
 *   OTEL_ENABLED                - Set to 'true' to enable OTel SDK (default: 'false')
 *   NODE_ENV                    - When 'development', uses console exporter as fallback
 *
 * @module shared/infrastructure/observability
 * @since E12
 */

import { log } from '@/lib/observability/logger';

// ============================================================================
// PUBLIC INTERFACES (stable API regardless of OTel availability)
// ============================================================================

/**
 * Represents an active span in a trace.
 * Mirrors a subset of the OpenTelemetry Span API.
 */
export interface Span {
  /** Set a key-value attribute on this span */
  setAttribute(key: string, value: string | number | boolean): void;
  /** Mark the span status as ok or error */
  setStatus(status: 'ok' | 'error', message?: string): void;
  /** End the span and record its duration */
  end(): void;
}

/**
 * Creates spans for tracing operations.
 */
export interface Tracer {
  /** Start a new span with optional initial attributes */
  startSpan(name: string, attributes?: Record<string, string | number>): Span;
}

// ============================================================================
// NO-OP IMPLEMENTATION (zero-dependency fallback)
// ============================================================================

class NoOpSpan implements Span {
  private readonly name: string;
  private readonly startTime: number;
  private readonly attrs: Record<string, string | number | boolean> = {};
  private spanStatus: 'ok' | 'error' = 'ok';
  private statusMessage?: string;

  constructor(name: string, attributes?: Record<string, string | number>) {
    this.name = name;
    this.startTime = performance.now();
    if (attributes) {
      for (const [k, v] of Object.entries(attributes)) {
        this.attrs[k] = v;
      }
    }
  }

  setAttribute(key: string, value: string | number | boolean): void {
    this.attrs[key] = value;
  }

  setStatus(status: 'ok' | 'error', message?: string): void {
    this.spanStatus = status;
    this.statusMessage = message;
  }

  end(): void {
    const durationMs = Math.round(performance.now() - this.startTime);

    if (process.env.LOG_LEVEL === 'debug') {
      log('debug', `[tracing] span ended: ${this.name}`, {
        durationMs,
        status: this.spanStatus,
        statusMessage: this.statusMessage,
        attributes: this.attrs,
      });
    }
  }
}

class NoOpTracer implements Tracer {
  private readonly tracerName: string;

  constructor(name: string) {
    this.tracerName = name;
  }

  startSpan(name: string, attributes?: Record<string, string | number>): Span {
    const spanName = `${this.tracerName}:${name}`;
    return new NoOpSpan(spanName, attributes);
  }
}

// ============================================================================
// OTEL-BACKED IMPLEMENTATION (loaded dynamically)
// ============================================================================

/**
 * Wraps a real OpenTelemetry span behind our stable interface.
 * Only instantiated when the OTel SDK is available.
 */
class OTelSpan implements Span {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OTel Span type varies across versions
  private readonly inner: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(inner: any) {
    this.inner = inner;
  }

  setAttribute(key: string, value: string | number | boolean): void {
    this.inner.setAttribute(key, value);
  }

  setStatus(status: 'ok' | 'error', message?: string): void {
    // OTel SpanStatusCode: UNSET=0, OK=1, ERROR=2
    const code = status === 'ok' ? 1 : 2;
    this.inner.setStatus({ code, message });
  }

  end(): void {
    this.inner.end();
  }
}

class OTelTracer implements Tracer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OTel Tracer type varies across versions
  private readonly inner: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(inner: any) {
    this.inner = inner;
  }

  startSpan(name: string, attributes?: Record<string, string | number>): Span {
    const span = this.inner.startSpan(name, attributes ? { attributes } : undefined);
    return new OTelSpan(span);
  }
}

// ============================================================================
// STATE
// ============================================================================

let otelApi: {
  trace: { getTracer(name: string, version?: string): unknown };
} | null = null;

let initialized = false;
let shutdownFn: (() => Promise<void>) | null = null;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialise the tracing subsystem.
 *
 * If the OpenTelemetry SDK packages are available AND `OTEL_ENABLED=true`,
 * it configures the NodeTracerProvider with an OTLP or console exporter.
 * Otherwise it silently falls back to no-op spans (zero overhead).
 *
 * Safe to call multiple times; only the first call has an effect.
 */
export function initTracing(): void {
  if (initialized) return;
  initialized = true;

  const enabled = process.env.OTEL_ENABLED === 'true';
  if (!enabled) {
    log('info', '[tracing] OpenTelemetry disabled (OTEL_ENABLED != true). Using no-op tracer.');
    return;
  }

  try {
    // Dynamic imports so we don't hard-depend on @opentelemetry/*
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const otelApiModule = require('@opentelemetry/api');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require('@opentelemetry/resources');

    const serviceName = process.env.OTEL_SERVICE_NAME || 'auracore';

    const resource = new Resource({ 'service.name': serviceName });
    const provider = new NodeTracerProvider({ resource });

    // Configure exporter
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (otlpEndpoint) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
        provider.addSpanProcessor(
          new SimpleSpanProcessor(new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }))
        );
        log('info', `[tracing] OTLP exporter configured → ${otlpEndpoint}`);
      } catch {
        log('warn', '[tracing] @opentelemetry/exporter-trace-otlp-http not found, falling back to console exporter');
        provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
      }
    } else if (process.env.NODE_ENV === 'development') {
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
      log('info', '[tracing] Console exporter configured (development mode)');
    }

    provider.register();
    otelApi = otelApiModule;

    shutdownFn = async () => {
      await provider.shutdown();
    };

    log('info', `[tracing] OpenTelemetry initialised. service=${serviceName}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log('warn', `[tracing] OpenTelemetry SDK not available: ${message}. Using no-op tracer.`);
  }
}

/**
 * Get a Tracer instance for manual instrumentation.
 *
 * If OpenTelemetry is initialised, returns a real OTel-backed tracer.
 * Otherwise returns a no-op tracer with zero overhead.
 *
 * @param name - Logical name of the component (e.g. 'fiscal.cte', 'tms.romaneio')
 *
 * @example
 * ```typescript
 * const tracer = getTracer('fiscal.cte');
 * const span = tracer.startSpan('emitCte', { cteId: 'abc-123' });
 * try {
 *   await emitCte(data);
 *   span.setStatus('ok');
 * } catch (error) {
 *   span.setStatus('error', String(error));
 *   throw error;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function getTracer(name: string): Tracer {
  if (otelApi) {
    const inner = otelApi.trace.getTracer(name, '1.0.0');
    return new OTelTracer(inner);
  }
  return new NoOpTracer(name);
}

/**
 * Wraps an async operation in a span, automatically handling status and end().
 *
 * @param tracer  - Tracer instance from getTracer()
 * @param name    - Span name (e.g. 'calculateIcms')
 * @param fn      - Async function to execute within the span
 * @param attributes - Optional initial span attributes
 *
 * @example
 * ```typescript
 * const tracer = getTracer('fiscal');
 * const result = await withSpan(tracer, 'calculateTaxes', async (span) => {
 *   span.setAttribute('origin_uf', 'SP');
 *   span.setAttribute('dest_uf', 'RJ');
 *   return taxCalculator.calculate(params);
 * });
 * ```
 */
export async function withSpan<T>(
  tracer: Tracer,
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number>,
): Promise<T> {
  const span = tracer.startSpan(name, attributes);

  try {
    const result = await fn(span);
    span.setStatus('ok');
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    span.setStatus('error', message);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Gracefully flush and shutdown the tracing pipeline.
 * Call during application shutdown to ensure all pending spans are exported.
 */
export async function shutdownTracing(): Promise<void> {
  if (shutdownFn) {
    try {
      await shutdownFn();
      log('info', '[tracing] OpenTelemetry shutdown complete.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log('error', `[tracing] Error during shutdown: ${message}`);
    }
  }
}
