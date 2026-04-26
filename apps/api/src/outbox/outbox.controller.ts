import { Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { OutboxWorkerService } from './outbox-worker.service.js';

/**
 * Cron-Endpoint: Railway-Cron / GitHub-Actions hittet diesen Pfad
 * im 1-2-Min-Takt. x-cron-secret muss CRON_SECRET-env matchen.
 */
@Controller('v1/public/cron/outbox')
export class OutboxController {
  constructor(private readonly worker: OutboxWorkerService) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  async process(
    @Headers('x-cron-secret') secret?: string,
  ): Promise<{ picked: number; done: number; failed: number; skipped: number }> {
    const expected = process.env['CRON_SECRET'];
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.worker.processOnce();
  }
}
