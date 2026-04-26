import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { OutboxController } from './outbox.controller.js';
import { OutboxWorkerService } from './outbox-worker.service.js';

@Module({
  imports: [EmailModule],
  controllers: [OutboxController],
  providers: [OutboxWorkerService],
  exports: [OutboxWorkerService],
})
export class OutboxModule {}
