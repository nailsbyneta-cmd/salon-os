import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Redis } from 'ioredis';

import { IDEMPOTENCY_STORE, IdempotencyInterceptor } from './idempotency.interceptor.js';
import {
  InMemoryIdempotencyStore,
  RedisIdempotencyStore,
  type IdempotencyStore,
} from './idempotency.store.js';

const logger = new Logger('IdempotencyModule');

const storeProvider: Provider = {
  provide: IDEMPOTENCY_STORE,
  useFactory: (): IdempotencyStore | null => {
    const url = process.env['REDIS_URL'];
    if (!url) {
      if (process.env['NODE_ENV'] === 'test') {
        return new InMemoryIdempotencyStore();
      }
      logger.warn(
        'REDIS_URL nicht gesetzt — Idempotency-Store deaktiviert (fail-open).',
      );
      return null;
    }
    const redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    redis.on('error', (err: Error) => logger.warn(`Redis-Fehler: ${err.message}`));
    return new RedisIdempotencyStore(redis);
  },
};

@Global()
@Module({
  providers: [
    storeProvider,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [IDEMPOTENCY_STORE],
})
export class IdempotencyModule {}
