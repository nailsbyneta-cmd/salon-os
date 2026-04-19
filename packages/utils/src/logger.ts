/**
 * Minimalistic structured logger.
 * Ersetzen wir in Phase 0 Ende durch pino + OpenTelemetry-Hook.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  [key: string]: unknown;
}

function log(level: Level, msg: string, fields: LogFields = {}): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => log('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => log('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => log('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => log('error', msg, fields),
};
