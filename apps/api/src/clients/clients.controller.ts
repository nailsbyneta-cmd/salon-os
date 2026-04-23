import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createClientSchema,
  importClientsSchema,
  updateClientSchema,
  uuidSchema,
} from '@salon-os/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ClientsService } from './clients.service.js';
import type { Client } from '@salon-os/db';

@Controller('v1/clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ): Promise<{ clients: Client[] }> {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    const safeLimit = Number.isFinite(parsed) ? parsed : 50;
    const clients = await this.svc.list(q, safeLimit);
    return { clients };
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Client> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createClientSchema))
    input: import('@salon-os/types').CreateClientInput,
  ): Promise<Client> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateClientSchema))
    input: import('@salon-os/types').UpdateClientInput,
  ): Promise<Client> {
    return this.svc.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.softDelete(id);
  }

  /** Bulk-Import (CSV-Migration von Phorest/Fresha/Booksy). */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importBulk(
    @Body(new ZodValidationPipe(importClientsSchema))
    input: import('@salon-os/types').ImportClientsInput,
  ): Promise<import('@salon-os/types').ImportClientsResult> {
    return this.svc.importBulk(input.clients);
  }

  /** 1-Klick-DSGVO-Export: JSON mit allen Daten einer Kundin. */
  @Get(':id/export')
  async exportData(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<unknown> {
    return this.svc.exportPersonalData(id);
  }

  /** DSGVO „Recht auf Vergessenwerden" — markiert Löschung. */
  @Post(':id/forget')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forget(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.requestDeletion(id);
  }

  /** Zusammenführen: Duplikat → Primary. Termine + Waitlist werden
   * re-assigned, Profil-Felder mit 'primary hat Vorrang'-Logik
   * gemergt, Duplikat soft-deleted. */
  @Post(':id/merge')
  async merge(
    @Param('id', new ZodValidationPipe(uuidSchema)) primaryId: string,
    @Body() body: { duplicateId: string },
  ): Promise<Client> {
    // Minimaler Body-Validator — keine extra Zod-Schema-Infra nötig
    if (!body || typeof body.duplicateId !== 'string') {
      throw new Error('duplicateId required');
    }
    return this.svc.merge(primaryId, body.duplicateId);
  }
}
