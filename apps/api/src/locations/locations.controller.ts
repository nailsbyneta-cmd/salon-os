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
} from '@nestjs/common';
import type { CreateLocationInput, UpdateLocationInput } from '@salon-os/types';
import { createLocationSchema, updateLocationSchema, uuidSchema } from '@salon-os/types';
import type { Location } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { LocationsService } from './locations.service.js';

@Controller('v1/locations')
export class LocationsController {
  constructor(private readonly svc: LocationsService) {}

  @Get()
  async list(): Promise<{ locations: Location[] }> {
    return { locations: await this.svc.list() };
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Location> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createLocationSchema)) input: CreateLocationInput,
  ): Promise<Location> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateLocationSchema)) input: UpdateLocationInput,
  ): Promise<Location> {
    return this.svc.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.softDelete(id);
  }
}
