/* eslint-disable no-console */
/**
 * OpenTelemetry-Bootstrap für apps/worker.
 * Gleiches Muster wie in apps/api — fail-safe ohne OTEL_EXPORTER_OTLP_ENDPOINT.
 */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] ?? 'salon-os-worker',
    [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
    'deployment.environment': process.env['NODE_ENV'] ?? 'development',
  }),
  traceExporter: endpoint ? new OTLPTraceExporter() : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

try {
  sdk.start();
  console.log(
    `[otel] worker instrumentation active — exporter=${endpoint ? 'otlp' : 'noop'}`,
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
