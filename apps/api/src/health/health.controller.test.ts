import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const ctrl = new HealthController();

  it('live() returns ok + ts', () => {
    const res = ctrl.live();
    expect(res.status).toBe('ok');
    expect(typeof res.ts).toBe('string');
    expect(Number.isNaN(Date.parse(res.ts))).toBe(false);
  });

  it('ready() returns ready + ts', () => {
    const res = ctrl.ready();
    expect(res.status).toBe('ready');
    expect(typeof res.ts).toBe('string');
  });
});
