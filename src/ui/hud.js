/** Minimal HUD: error overlay, place-names toggle, door prompt ("K"), screen fade and place banner. */
const $ = (id) => document.getElementById(id);

export function initHud() {
  let bannerTimer = null;
  return {
    showError(msg) { const e = $('error'); e.style.display = 'grid'; e.textContent = msg; },
    setNamesVisible(on) { $('namesState').textContent = on ? 'oui' : 'non'; },
    /** { label, where } | null : "Appuyez sur [K] pour entrer" */
    showPrompt(p) {
      const el = $('prompt');
      if (!p) { el.classList.remove('on'); return; }
      el.querySelector('.act').textContent = p.label.toLowerCase().replace(/\bpc\b/, 'PC');
      el.querySelector('.where').textContent = p.where || '';
      el.classList.add('on');
    },
    fade(on) { $('fade').classList.toggle('on', !!on); },
    banner(text) {
      const el = $('banner'); el.textContent = text; el.classList.add('on');
      clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.classList.remove('on'), 2600);
    },
    setInside(on) { $('hint').classList.toggle('inside', !!on); },
  };
}
