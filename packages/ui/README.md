# @salon-os/ui

Shared React-Komponenten + Design-Tokens.

## Aktuell (Phase 0)

- `cn()` — Tailwind class-merge helper (Standard shadcn-Pattern).

## Phase 1 Aufbau

Wir kopieren shadcn/ui-Komponenten hierher (NICHT als Dep — shadcn-Pattern
ist „owned code"). Erwartete Komponenten: `Button`, `Input`, `Label`,
`Card`, `Dialog`, `DropdownMenu`, `Select`, `Tabs`, `Toast`, `Tooltip`,
`Badge`, `Avatar`, `Calendar`, `Command` (für Command-K-Palette).

Design-Tokens kommen in `src/tokens/` — zentrale Farbe-/Radius-/Shadow-Tabellen,
die sowohl Web als auch Mobile (via NativeWind) konsumieren.

Siehe [specs/tech-stack.md — Frontend Web](../../specs/tech-stack.md#frontend-web).
