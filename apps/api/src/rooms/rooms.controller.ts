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
import type { CreateRoomInput, UpdateRoomInput } from '@salon-os/types';
import { createRoomSchema, updateRoomSchema, uuidSchema } from '@salon-os/types';
import type { Room } from '@salon-os/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { RoomsService } from './rooms.service.js';

@Controller('v1/rooms')
export class RoomsController {
  constructor(private readonly svc: RoomsService) {}

  @Get()
  async list(@Query('locationId') locationId?: string): Promise<{ rooms: Room[] }> {
    return { rooms: await this.svc.list(locationId) };
  }

  @Get(':id')
  async get(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<Room> {
    return this.svc.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createRoomSchema)) input: CreateRoomInput,
  ): Promise<Room> {
    return this.svc.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateRoomSchema)) input: UpdateRoomInput,
  ): Promise<Room> {
    return this.svc.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ZodValidationPipe(uuidSchema)) id: string): Promise<void> {
    await this.svc.deactivate(id);
  }
}
