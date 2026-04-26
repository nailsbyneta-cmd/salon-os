import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module.js';
import { OutboxService } from './outbox.service.js';

@Module({
  imports: [DbModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class CommonModule {}
