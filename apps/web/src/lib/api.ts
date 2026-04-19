/**
 * SALON OS API-Client für apps/web.
 *
 * In Phase 0 stub: benutzt x-tenant-id / x-user-id / x-role Header statt
 * WorkOS-Session-Cookie. Sobald packages/auth den echten Session-Flow
 * liefert, wird dieses Modul durch einen Server-Action-basierten Fetcher
 * mit httpOnly-Cookie ersetzt.
 */
import type { ProblemDetails } from '@salon-os/types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  tenantId: string;
  userId?: string | null;
  role?: string | null;
  idempotencyKey?: string;
}

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, opts: ApiOptions): Promise<T> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': opts.tenantId,
  };
  if (opts.userId) headers['x-user-id'] = opts.userId;
  if (opts.role) headers['x-role'] = opts.role;

  if (method !== 'GET' && method !== 'DELETE') {
    headers['idempotency-key'] =
      opts.idempotencyKey ?? crypto.randomUUID();
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let problem: ProblemDetails | null = null;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      /* response body not JSON — leave problem null */
    }
    throw new ApiError(res.status, problem, problem?.title ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
