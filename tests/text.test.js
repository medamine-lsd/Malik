import { describe, it, expect } from 'vitest';
import { normalize, escapeHtml, formatPhone } from '../src/core/text.js';

describe('text.js — Fonctions utilitaires de texte', () => {
  it('normalize retire les accents, passe en minuscules et nettoie les espaces', () => {
    expect(normalize('  Dr. Ahmed SAÏGHI - Cardiologue!  ')).toBe('dr ahmed saighi cardiologue');
    expect(normalize('Établissement Public & Privé')).toBe('etablissement public prive');
  });

  it('escapeHtml protège contre les injections XSS', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml("L'arbre & l'oiseau")).toBe('L&#39;arbre &amp; l&#39;oiseau');
  });

  it('formatPhone normalise les numéros de téléphone algériens', () => {
    expect(formatPhone('0550123456')).toBe('0550123456');
    expect(formatPhone('+213 550 12 34 56')).toBe('0550123456');
    expect(formatPhone('550123456')).toBe('0550123456');
  });
});
