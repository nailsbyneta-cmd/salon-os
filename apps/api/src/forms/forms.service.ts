import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaClient, Prisma } from '@salon-os/db';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'signature' | 'date';
  required: boolean;
  options?: string[];
}

export interface CreateFormDto {
  name: string;
  description?: string;
  fields: FormField[];
}

export interface SubmitAnswersDto {
  formId: string;
  clientId?: string;
  appointmentId?: string;
  answers: Record<string, unknown>;
}

@Injectable()
export class FormsService {
  constructor(
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  async listForms(tenantId: string, userId: string | null, role: string | null) {
    return this.withTenant(tenantId, userId, role, (db) =>
      db.consultationForm.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
          createdAt: true,
          _count: { select: { submissions: true } },
        },
      }),
    );
  }

  async getForm(tenantId: string, userId: string | null, role: string | null, formId: string) {
    const form = await this.withTenant(tenantId, userId, role, (db) =>
      db.consultationForm.findUnique({ where: { id: formId } }),
    );
    if (!form || form.tenantId !== tenantId) throw new NotFoundException('Form not found');
    return form;
  }

  async createForm(
    tenantId: string,
    userId: string | null,
    role: string | null,
    dto: CreateFormDto,
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required');
    return this.withTenant(tenantId, userId, role, (db) =>
      db.consultationForm.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: dto.description,
          fields: dto.fields as unknown as Prisma.InputJsonValue,
        },
      }),
    );
  }

  async updateForm(
    tenantId: string,
    userId: string | null,
    role: string | null,
    formId: string,
    dto: Partial<CreateFormDto> & { active?: boolean },
  ) {
    await this.getForm(tenantId, userId, role, formId);
    return this.withTenant(tenantId, userId, role, (db) =>
      db.consultationForm.update({
        where: { id: formId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.fields ? { fields: dto.fields as unknown as Prisma.InputJsonValue } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      }),
    );
  }

  async deleteForm(tenantId: string, userId: string | null, role: string | null, formId: string) {
    await this.getForm(tenantId, userId, role, formId);
    return this.withTenant(tenantId, userId, role, (db) =>
      db.consultationForm.delete({ where: { id: formId } }),
    );
  }

  async submitAnswers(tenantId: string, dto: SubmitAnswersDto) {
    return this.withTenant(tenantId, null, null, (db) =>
      db.consultationSubmission.create({
        data: {
          tenantId,
          formId: dto.formId,
          clientId: dto.clientId ?? null,
          appointmentId: dto.appointmentId ?? null,
          answers: dto.answers as unknown as Prisma.InputJsonValue,
        },
      }),
    );
  }

  async listSubmissions(
    tenantId: string,
    userId: string | null,
    role: string | null,
    formId: string,
  ) {
    await this.getForm(tenantId, userId, role, formId);
    return this.withTenant(tenantId, userId, role, (db) =>
      db.consultationSubmission.findMany({
        where: { tenantId, formId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          answers: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true, email: true } },
          appointment: { select: { startAt: true } },
        },
      }),
    );
  }

  async getPublicForm(formId: string) {
    const form = await this.prisma.consultationForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        fields: true,
        tenant: { select: { name: true, slug: true } },
      },
    });
    if (!form || !form.active) return null;
    return form;
  }

  async submitPublicAnswers(dto: SubmitAnswersDto) {
    const form = await this.prisma.consultationForm.findUnique({
      where: { id: dto.formId },
      select: { tenantId: true, active: true },
    });
    if (!form || !form.active) throw new NotFoundException('Form not found');
    return this.prisma.consultationSubmission.create({
      data: {
        tenantId: form.tenantId,
        formId: dto.formId,
        clientId: dto.clientId ?? null,
        appointmentId: dto.appointmentId ?? null,
        answers: dto.answers as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }
}
