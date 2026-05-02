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
import { requireTenantContext } from '../tenant/tenant.context.js';
import { FormsService, type CreateFormDto, type SubmitAnswersDto } from './forms.service.js';

@Controller('v1/forms')
export class FormsController {
  constructor(private readonly svc: FormsService) {}

  @Get()
  list() {
    const ctx = requireTenantContext();
    return this.svc.listForms(ctx.tenantId, ctx.userId, ctx.role);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const ctx = requireTenantContext();
    return this.svc.getForm(ctx.tenantId, ctx.userId, ctx.role, id);
  }

  @Post()
  create(@Body() dto: CreateFormDto) {
    const ctx = requireTenantContext();
    return this.svc.createForm(ctx.tenantId, ctx.userId, ctx.role, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateFormDto> & { active?: boolean }) {
    const ctx = requireTenantContext();
    return this.svc.updateForm(ctx.tenantId, ctx.userId, ctx.role, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    const ctx = requireTenantContext();
    return this.svc.deleteForm(ctx.tenantId, ctx.userId, ctx.role, id);
  }

  @Get(':id/submissions')
  submissions(@Param('id') id: string) {
    const ctx = requireTenantContext();
    return this.svc.listSubmissions(ctx.tenantId, ctx.userId, ctx.role, id);
  }

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitAnswersDto) {
    const ctx = requireTenantContext();
    return this.svc.submitAnswers(ctx.tenantId, dto);
  }
}
