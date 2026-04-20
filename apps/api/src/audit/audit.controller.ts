import { Controller, Get, Query } from '@nestjs/common';
import { AuditService, type AuditEntry } from './audit.service.js';

@Controller('v1/audit-log')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  async list(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<{ entries: AuditEntry[]; nextCursor: string | null }> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.svc.list({
      entity,
      entityId,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor,
    });
  }
}
