/**
 * BullMQ worker bootstrap.
 * Startet alle registrierten Queues (reminders, emails, exports, retries).
 *
 * In Phase 1 werden hier Queue-Consumer pro Event-Typ registriert.
 */

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

// eslint-disable-next-line no-console
console.log(`[worker] ready, Redis = ${redisUrl}`);
// eslint-disable-next-line no-console
console.log('[worker] no queues registered yet — waiting for Phase 1');

// Keep process alive (später wird BullMQ das übernehmen).
setInterval(() => {
  // Heartbeat-Log alle 60s
  // eslint-disable-next-line no-console
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, 60_000);
