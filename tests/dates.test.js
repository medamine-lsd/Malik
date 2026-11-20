import { describe, it, expect } from 'vitest';
import { todayLocal, formatDateFr, addDays } from '../src/core/dates.js';

describe('dates.js — Gestion du fuseau horaire algérien', () => {
  it('gère correctement le passage de minuit (cas 00h30 à Alger)', () => {
    // 23h30 UTC le 19 novembre correspond à 00h30 le 20 novembre à Alger (UTC+1)
    const lateNightDate = new Date('2026-11-19T23:30:00Z');
    expect(todayLocal(lateNightDate)).toBe('2026-11-20');
  });

  it('formatDateFr formate correctement une date ISO', () => {
    const formatted = formatDateFr('2026-11-20');
    expect(formatted).toContain('20');
    expect(formatted).toContain('novembre');
  });

  it('addDays ajoute ou retire des jours sans décalage', () => {
    expect(addDays('2026-11-20', 1)).toBe('2026-11-21');
    expect(addDays('2026-11-20', -1)).toBe('2026-11-19');
  });
});
