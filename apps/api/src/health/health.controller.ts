import { Controller, Get } from '@nestjs/common';

/**
 * Liveness + readiness probes.
 * Kubernetes/Fly.io/Railway Health-Checks schlagen hier auf.
 */
@Controller('health')
export class HealthController {
  @Get()
  live(): { status: 'ok'; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('ready')
  ready(): { status: 'ready'; ts: string } {
    // TODO: Prüfung DB-Connection + Redis-Connection hier einhängen
    //       sobald packages/db den Client bereitstellt.
    return { status: 'ready', ts: new Date().toISOString() };
  }
}
