/** Minimal HUD: error overlay + state of the place-names toggle. */
const $ = (id) => document.getElementById(id);

export function initHud() {
  return {
    showError(msg) { const e = $('error'); e.style.display = 'grid'; e.textContent = msg; },
    setNamesVisible(on) { $('namesState').textContent = on ? 'oui' : 'non'; },
  };
}
