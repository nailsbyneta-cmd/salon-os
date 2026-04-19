import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: true }),
  );

  await app.register(helmet, {
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production' ? undefined : false,
  });
  await app.register(cors, {
    origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
}

void bootstrap();
