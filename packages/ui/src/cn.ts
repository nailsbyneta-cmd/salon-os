import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kombiniert clsx (conditional classes) mit tailwind-merge (last-wins bei
 * konkurrierenden Tailwind-Klassen). Copy-paste Standard aus shadcn/ui.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
