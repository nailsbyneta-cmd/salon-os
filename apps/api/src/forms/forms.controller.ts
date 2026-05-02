import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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

/** Public endpoints — no tenant middleware, form ID resolves tenant. */
@Controller('v1/public/forms')
export class PublicFormsController {
  constructor(private readonly svc: FormsService) {}

  @Get(':id')
  async getPublic(@Param('id') id: string) {
    const form = await this.svc.getPublicForm(id);
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  submitPublic(@Body() dto: SubmitAnswersDto) {
    return this.svc.submitPublicAnswers(dto);
  }
}
