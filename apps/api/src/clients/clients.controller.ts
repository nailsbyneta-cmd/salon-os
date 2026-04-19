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
    @Body(new ZodValidationPipe(createClientSchema)) input: import('@salon-os/types').CreateClientInput,
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
}
