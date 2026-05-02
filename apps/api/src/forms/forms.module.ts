import { Module } from '@nestjs/common';
import { FormsController, PublicFormsController } from './forms.controller.js';
import { FormsService } from './forms.service.js';

@Module({
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
