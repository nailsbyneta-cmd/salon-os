/* eslint-disable no-console */
/**
 * OpenTelemetry-Bootstrap für apps/api.
 *
 * MUSS als ALLERERSTES in `main.ts` importiert werden — vor fastify, pg,
 * ioredis, bullmq usw. — damit die Auto-Instrumentierung die Module
 * patchen kann.
 *
 * Fail-safe: ohne OTEL_EXPORTER_OTLP_ENDPOINT läuft das Node-SDK im
 * No-Op-Mode, die App verhält sich funktional identisch.
 * Metriken folgen in einem späteren Slice (sdk-metrics v2 ist noch nicht
 * kompatibel mit exporter-metrics-otlp-http ^0.57).
 */
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

if (process.env['OTEL_LOG_LEVEL'] === 'debug') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] ?? 'salon-os-api',
    [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
    'deployment.environment': process.env['NODE_ENV'] ?? 'development',
  }),
  traceExporter: endpoint ? new OTLPTraceExporter() : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Filesystem-Spans spammen ohne Mehrwert die Traces voll.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

try {
  sdk.start();
  console.log(
    `[otel] api instrumentation active — exporter=${endpoint ? 'otlp' : 'noop'}`,
  );
} catch (err) {
  console.warn(`[otel] failed to start SDK: ${(err as Error).message}`);
}

process.on('SIGTERM', () => {
  void sdk
    .shutdown()
    .catch((err: unknown) =>
      console.warn(`[otel] shutdown failed: ${(err as Error).message}`),
    );
});
