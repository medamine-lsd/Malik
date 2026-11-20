/**
 * toggle-dn.js — Interrupteur tactile « Glass » D / ND (Disponible / Non Disponible).
 * Reçoit : { value: 'D'|'ND', onChange: (newValue) => void }.
 * Renvoie : Un élément HTML interactif avec bascule D (vert) et ND (rouge).
 */
export function createToggleDN({
  value = 'D',
  onChange = null
} = {}) {
  const container = document.createElement('div');
  container.className = 'toggle-dn';
  container.setAttribute('data-state', value);
  container.setAttribute('role', 'switch');
  container.setAttribute('aria-checked', value === 'D' ? 'true' : 'false');
  container.tabIndex = 0;

  container.innerHTML = `
    <span class="toggle-dn-pill pill-d">D</span>
    <span class="toggle-dn-pill pill-nd">ND</span>
  `;

  let currentState = value;

  function toggle() {
    currentState = currentState === 'D' ? 'ND' : 'D';
    container.setAttribute('data-state', currentState);
    container.setAttribute('aria-checked', currentState === 'D' ? 'true' : 'false');
    if (typeof onChange === 'function') {
      onChange(currentState);
    }
  }

  container.addEventListener('click', toggle);
  container.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });

  return {
    element: container,
    getValue: () => currentState,
    setValue: (val) => {
      currentState = val === 'ND' ? 'ND' : 'D';
      container.setAttribute('data-state', currentState);
      container.setAttribute('aria-checked', currentState === 'D' ? 'true' : 'false');
    }
  };
}
