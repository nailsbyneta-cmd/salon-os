import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Globaler Error-Filter — wandelt alles in RFC 7807 Problem-Details.
 * Siehe specs/api.md §Fehlerformat.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let type = 'about:blank';
    let errors: Array<{ path: string; code: string }> | undefined;

    if (exception instanceof ZodError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      title = 'Validation failed';
      type = 'https://salon-os.com/errors/validation';
      errors = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const msg = (body as { message: unknown }).message;
        title = Array.isArray(msg) ? 'Bad request' : String(msg);
        detail = Array.isArray(msg) ? msg.join(', ') : undefined;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(exception.stack ?? exception.message);
    }

    const payload = {
      type,
      title,
      status,
      detail,
      instance: req.url,
      ...(errors ? { errors } : {}),
    };

    void reply.status(status).type('application/problem+json').send(payload);
  }
}
