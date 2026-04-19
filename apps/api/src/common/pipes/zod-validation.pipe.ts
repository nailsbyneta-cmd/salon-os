import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Zod-Validation-Pipe für Controller-Input.
 *
 * Nutzung:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createClientSchema)) body: CreateClientInput) { }
 *
 * Bei Fehler: throw ZodError → gefangen vom ProblemDetailsFilter → RFC 7807 422.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    return this.schema.parse(value);
  }
}
