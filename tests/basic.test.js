import { describe, it, expect } from 'vitest';

describe('Validation de démarrage', () => {
  it('l environnement de test fonctionne correctement', () => {
    expect(1 + 1).toBe(2);
  });

  it('les constantes fondamentales sont définies', () => {
    const appName = 'Délégation V2';
    expect(appName).toBe('Délégation V2');
  });
});
