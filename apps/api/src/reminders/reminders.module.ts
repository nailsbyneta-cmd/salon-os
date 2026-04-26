import { Global, Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { RemindersService } from './reminders.service.js';

@Global()
@Module({
  imports: [CommonModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
