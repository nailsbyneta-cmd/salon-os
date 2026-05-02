import * as React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '@salon-os/ui';
import { PublicFormClient } from './public-form-client';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  fields: FormField[];
  tenant: { name: string; slug: string };
}

async function loadForm(formId: string): Promise<FormData | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/forms/${formId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as FormData;
  } catch {
    return null;
  }
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appointmentId?: string; clientToken?: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const sp = await searchParams;
  const form = await loadForm(id);

  if (!form || !form.active) notFound();

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-sm text-text-muted">{form.tenant.name}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-text-primary">
            {form.name}
          </h1>
          {form.description ? (
            <p className="mt-2 text-sm text-text-secondary">{form.description}</p>
          ) : null}
        </div>

        <Card>
          <CardBody>
            <PublicFormClient
              formId={form.id}
              fields={form.fields}
              appointmentId={sp.appointmentId}
              clientToken={sp.clientToken}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
