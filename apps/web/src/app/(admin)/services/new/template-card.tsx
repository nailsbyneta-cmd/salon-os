'use client';
import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { createFromTemplate } from '../actions';

interface Props {
  templateKey: string;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
}

/**
 * Template-Karte mit Disable-while-pending.
 * Verhindert Doppelklick → doppeltes Service-Anlegen (Audit-Befund Pass 6).
 */
export function TemplateCard(props: Props): React.JSX.Element {
  return (
    <form action={createFromTemplate}>
      <input type="hidden" name="template" value={props.templateKey} />
      <CardButton {...props} />
    </form>
  );
}

function CardButton(props: Props): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-full w-full flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-elevated hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <span aria-hidden className="text-3xl">
        {props.emoji}
      </span>
      <span className="font-display text-base font-semibold tracking-tight text-text-primary group-hover:text-accent">
        {props.title}
      </span>
      <span className="text-xs text-text-secondary">{props.subtitle}</span>
      <span className="mt-auto flex items-center gap-1 text-[11px] font-medium tabular-nums text-text-muted">
        {pending ? (
          <>
            <span aria-hidden className="animate-spin">
              ⏳
            </span>
            Lege an…
          </>
        ) : (
          props.badge
        )}
      </span>
    </button>
  );
}
