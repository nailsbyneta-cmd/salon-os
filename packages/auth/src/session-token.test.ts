import { describe, expect, it } from 'vitest';

import { signSessionToken, verifySessionToken, type Session } from './index.js';

const SECRET = 'a'.repeat(32);

const validSession: Session = {
  userId: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  role: 'OWNER',
  email: 'lorenc@example.com',
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

describe('signSessionToken / verifySessionToken', () => {
  it('Roundtrip: sign → verify ergibt identische Session', () => {
    const token = signSessionToken(validSession, SECRET);
    const parsed = verifySessionToken(token, SECRET);
    expect(parsed).toEqual(validSession);
  });

  it('weist Tokens mit manipuliertem Payload ab', () => {
    const token = signSessionToken(validSession, SECRET);
    const [payload, sig] = token.split('.');
    // Payload-Byte ändern → Signatur passt nicht mehr.
    const tampered = `${payload}x.${sig}`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('weist Tokens mit falschem Secret ab', () => {
    const token = signSessionToken(validSession, SECRET);
    expect(verifySessionToken(token, 'b'.repeat(32))).toBeNull();
  });

  it('weist abgelaufene Tokens ab', () => {
    const expired: Session = {
      ...validSession,
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    };
    const token = signSessionToken(expired, SECRET);
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('wirft bei zu kurzem Secret (Schutz gegen weak-key-Fehler)', () => {
    expect(() => signSessionToken(validSession, 'short')).toThrow(/secret too short/);
  });

  it('weist Tokens mit Junk-Payload (nicht-JSON) ab', () => {
    const fakePayload = Buffer.from('not-json').toString('base64url');
    const token = `${fakePayload}.xxx`;
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('weist Tokens mit falschem Schema (fehlendes Feld) ab', () => {
    // @ts-expect-error — absichtlich unvollständig
    const token = signSessionToken({ email: 'x@y.com' }, SECRET);
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });
});
