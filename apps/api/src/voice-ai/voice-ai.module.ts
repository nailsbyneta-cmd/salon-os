import { Module } from '@nestjs/common';
import { VoiceAiController } from './voice-ai.controller.js';
import { VoiceAiService } from './voice-ai.service.js';

@Module({
  controllers: [VoiceAiController],
  providers: [VoiceAiService],
  exports: [VoiceAiService],
})
export class VoiceAiModule {}
