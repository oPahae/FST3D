import * as THREE from 'three';

/**
 * Buvette economy. The cashier (3apdlah) sells products and gives tickets (1, 2, 3, 4, 5 or 7 dhs); the counter (opama)
 * takes the tickets and hands over the products. State lives for the whole page session.
 */
export const PRODUCTS = [
  { id: 'crepe', name: 'Crêpe', plural: 'crêpes', price: 3, icon: '🥞' },
  { id: 'pain', name: 'Petit pain', plural: 'petits pains', price: 3, icon: '🥖' },
  { id: 'cafe', name: 'Café', plural: 'cafés', price: 5, icon: '☕' },
  { id: 'the', name: 'Thé', plural: 'thés', price: 1, icon: '🍵' },
  { id: 'lait', name: 'Lait', plural: 'laits', price: 4, icon: '🥛' },
  { id: 'pressup', name: 'Press-up', plural: 'press-up', price: 3, icon: '🧃' },
  { id: 'ghani', name: 'Ghani', plural: 'ghani', price: 4, icon: '🥤' },
  { id: 'pfromage', name: 'Pain au fromage', plural: 'pains au fromage', price: 4, icon: '🧀' },
  { id: 'pfcachir', name: 'Pain au fromage et cachir', plural: 'pains au fromage et cachir', price: 6, icon: '🥪' },
];
const TICKETS = [7, 5, 4, 3, 2, 1];

export const wallet = { orders: [], plate: {} };     // orders waiting at the counter, products received

/** Fewest tickets (values 1, 2, 3, 4, 5, 7) summing to `total`. */
export function splitTickets(total) {
  const best = new Array(total + 1).fill(Infinity), from = new Array(total + 1).fill(0); best[0] = 0;
  for (let s = 1; s <= total; s++) for (const t of TICKETS) if (t <= s && best[s - t] + 1 < best[s]) { best[s] = best[s - t] + 1; from[s] = t; }
  const out = []; for (let s = total; s > 0; s -= from[s]) out.push(from[s]);
  return out.sort((a, b) => b - a);
}

const TCOL = { 1: '#e9e4c8', 2: '#cfe7c3', 3: '#c6def2', 4: '#f2d6b8', 5: '#e9c6e4', 7: '#f5b8b0' };
const ticketHtml = (v) => `<span class="tk" style="background:${TCOL[v]}"><b>${v}</b><small>dh</small></span>`;
const plural = (p, q) => (q > 1 ? p.plural : p.name.toLowerCase());

function injectStyle() {
  if (document.getElementById('shop-style')) return;
  const st = document.createElement('style'); st.id = 'shop-style';
  st.textContent = `
  #modeHint{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:rgba(14,18,24,.8);color:#cfd6de;font:12px system-ui,sans-serif;padding:5px 12px;border-radius:8px;pointer-events:none;z-index:30}
  #modeHint b{color:#fff}
    #shop{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:min(380px,44vw);max-height:84vh;overflow:auto;z-index:28;background:rgba(22,18,14,.93);color:#f3ece2;font:14px system-ui,sans-serif;border:1px solid rgba(255,190,90,.45);border-radius:12px;padding:12px 14px}
  #shop h3{margin:0 0 2px;font-size:16px;color:#ffd25a}
  #shop .who{color:#cdbfae;font-size:12px;margin-bottom:8px}
  #shop .say{background:rgba(255,255,255,.07);border-radius:8px;padding:7px 9px;margin:6px 0;font-size:13px}
  #shop .p{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:7px}
  #shop .p.sel{background:rgba(255,210,90,.16)}
  #shop .p .nm{flex:1}
  #shop .p .pr{color:#ffd25a;width:44px;text-align:right}
  #shop .p button{width:24px;height:24px;border-radius:6px;border:0;background:#4a3a2a;color:#fff;font-size:15px;cursor:pointer}
  #shop .p .q{width:20px;text-align:center;font-weight:700}
  #shop .tot{display:flex;justify-content:space-between;margin:8px 0 6px;font-weight:700}
  #shop .btn{display:block;width:100%;padding:8px;border:0;border-radius:8px;background:linear-gradient(#ffd25a,#ffa800);color:#231600;font-weight:800;cursor:pointer;margin-top:6px}
  #shop .btn.alt{background:#3b3027;color:#f3ece2;font-weight:600}
  #shop .tks{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
  #shop .tk{display:inline-flex;align-items:baseline;gap:2px;color:#222;padding:6px 10px;border-radius:4px;border:1px dashed rgba(0,0,0,.4);font-size:16px;transform:rotate(-2deg);box-shadow:0 1px 3px rgba(0,0,0,.4)}
  #shop .tk small{font-size:10px}
  #shop ul{margin:4px 0 4px 18px;padding:0}
  #shop .k{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:4px;background:#ffd25a;color:#231600;font-weight:800;font-size:11px;padding:0 3px}
  #wallet{position:absolute;right:12px;top:12px;z-index:24;background:rgba(14,18,24,.82);color:#e6ebf0;font:12px system-ui,sans-serif;padding:6px 10px;border-radius:9px;display:none;max-width:260px;pointer-events:none}
  #wallet .tk{padding:1px 6px;font-size:12px;border-radius:3px;border:1px dashed rgba(0,0,0,.4);color:#222;margin-right:3px;display:inline-flex;gap:1px}
  `;
  document.head.appendChild(st);
}

export function updateWallet(show) {
  injectStyle();
  let el = document.getElementById('wallet');
  if (!el) { el = document.createElement('div'); el.id = 'wallet'; document.body.appendChild(el); }
  if (!show) { el.style.display = 'none'; return; }
  const tks = wallet.orders.flatMap((o) => o.tickets);
  const plate = PRODUCTS.filter((p) => wallet.plate[p.id]).map((p) => `${wallet.plate[p.id]}× ${p.name}`);
  const parts = [];
  parts.push(tks.length ? `🎫 ${tks.map(ticketHtml).join('')} <span style="opacity:.7">(${tks.reduce((a, b) => a + b, 0)} dh)</span>` : '🎫 aucun ticket');
  if (plate.length) parts.push('🍽 ' + plate.join(', '));
  el.innerHTML = parts.join('<br>'); el.style.display = 'block';
}

/** kind: 'caisse' | 'comptoir'. cam: first-person camera aimed at the staff member. */
export function createShopMode(mgr, kind, cam) {
  injectStyle();
  const host = document.body;
  const panel = document.createElement('div'); panel.id = 'shop'; host.appendChild(panel);
  const qty = {}; PRODUCTS.forEach((p) => (qty[p.id] = 0));
  let sel = 0, stage = kind === 'caisse' ? 'menu' : 'counter', said = '';

  const total = () => PRODUCTS.reduce((a, p) => a + p.price * qty[p.id], 0);
  const count = () => PRODUCTS.reduce((a, p) => a + qty[p.id], 0);

  function render() {
    updateWallet(true);
    if (kind === 'caisse') {
      if (stage === 'menu') {
        panel.innerHTML = `<h3>Caisse</h3><div class="who">Caissier : <b>3apdlah</b></div>
          <div class="say">${said || '« Bonjour ! Qu’est-ce que tu veux prendre ? »'}</div>
          ${PRODUCTS.map((p, i) => `<div class="p ${i === sel ? 'sel' : ''}" data-i="${i}"><span>${p.icon}</span><span class="nm">${p.name}</span><span class="pr">${p.price} dh</span><button data-a="m" data-i="${i}">−</button><span class="q">${qty[p.id]}</span><button data-a="p" data-i="${i}">+</button></div>`).join('')}
          <div class="tot"><span>Total (${count()} article${count() > 1 ? 's' : ''})</span><span>${total()} dh</span></div>
          <button class="btn" data-a="ok"><span class="k">K</span> Valider la commande</button>
          <button class="btn alt" data-a="quit">Échap : partir</button>
          <div class="who" style="margin-top:6px">↑ ↓ choisir · ← → quantité</div>`;
      } else {
        const o = wallet.orders[wallet.orders.length - 1];
        panel.innerHTML = `<h3>Caisse</h3><div class="who">Caissier : <b>3apdlah</b></div>
          <div class="say">« Voilà tes tickets, ${o.total} dh en tout. Va les donner à <b>opama</b> au comptoir. »</div>
          <div class="tks">${o.tickets.map(ticketHtml).join('')}</div>
          <ul>${o.items.map((i) => `<li>${i.qty} × ${i.name}</li>`).join('')}</ul>
          <button class="btn" data-a="quit"><span class="k">K</span> Merci, au revoir</button>
          <button class="btn alt" data-a="again">Commander autre chose</button>`;
      }
    } else {
      if (stage === 'counter') {
        if (!wallet.orders.length) {
          panel.innerHTML = `<h3>Comptoir</h3><div class="who">Serveur : <b>opama</b></div><div class="say">« Il me faut des tickets ! Passe d’abord à la caisse voir <b>3apdlah</b>. »</div><button class="btn alt" data-a="quit">Échap : partir</button>`;
        } else {
          const tks = wallet.orders.flatMap((o) => o.tickets), sum = tks.reduce((a, b) => a + b, 0);
          const items = {}; wallet.orders.forEach((o) => o.items.forEach((i) => (items[i.id] = (items[i.id] || 0) + i.qty)));
          panel.innerHTML = `<h3>Comptoir</h3><div class="who">Serveur : <b>opama</b></div>
            <div class="say">« Donne-moi tes tickets. »</div>
            <div class="tks">${tks.map(ticketHtml).join('')}</div><div class="who">Total des tickets : ${sum} dh</div>
            <ul>${PRODUCTS.filter((p) => items[p.id]).map((p) => `<li>${items[p.id]} × ${p.name}</li>`).join('')}</ul>
            <button class="btn" data-a="give"><span class="k">K</span> Donner les tickets</button>
            <button class="btn alt" data-a="quit">Échap : partir</button>`;
        }
      } else {
        panel.innerHTML = `<h3>Comptoir</h3><div class="who">Serveur : <b>opama</b></div><div class="say">${said}</div>
          <button class="btn" data-a="quit"><span class="k">K</span> Merci !</button>`;
      }
    }
  }
  function act(a, i) {
    if (a === 'p') { qty[PRODUCTS[i].id] = Math.min(20, qty[PRODUCTS[i].id] + 1); sel = i; }
    else if (a === 'm') { qty[PRODUCTS[i].id] = Math.max(0, qty[PRODUCTS[i].id] - 1); sel = i; }
    else if (a === 'ok') confirmOrder();
    else if (a === 'again') { stage = 'menu'; said = ''; PRODUCTS.forEach((p) => (qty[p.id] = 0)); }
    else if (a === 'give') give();
    else if (a === 'quit') { end(); return; }
    render();
  }
  function confirmOrder() {
    if (!count()) { said = '« Tu n’as rien choisi… »'; return; }
    const t = total();
    wallet.orders.push({ total: t, tickets: splitTickets(t), items: PRODUCTS.filter((p) => qty[p.id]).map((p) => ({ id: p.id, name: plural(p, qty[p.id]).replace(/^./, (c) => c.toUpperCase()), qty: qty[p.id] })) });
    stage = 'tickets';
  }
  function give() {
    const lines = [];
    for (const o of wallet.orders) for (const i of o.items) { wallet.plate[i.id] = (wallet.plate[i.id] || 0) + i.qty; }
    const got = {}; wallet.orders.forEach((o) => o.items.forEach((i) => (got[i.id] = (got[i.id] || 0) + i.qty)));
    for (const p of PRODUCTS) if (got[p.id]) lines.push(`${got[p.id]} ${plural(p, got[p.id])}`);
    wallet.orders = [];
    said = `« Merci ! Voilà : ${lines.join(', ')}. Bon appétit ! »`; stage = 'done';
  }
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a, +b.dataset.i); });
  const key = (e) => {
    if (e.type !== 'keydown') return true;
    e.preventDefault();
    const k = e.key.toLowerCase();
    if (k === 'escape') { end(); return true; }
    if (kind === 'caisse' && stage === 'menu') {
      if (k === 'arrowup') sel = (sel + PRODUCTS.length - 1) % PRODUCTS.length;
      else if (k === 'arrowdown') sel = (sel + 1) % PRODUCTS.length;
      else if (k === 'arrowright' || k === '+') act('p', sel);
      else if (k === 'arrowleft' || k === '-') act('m', sel);
      else if (k === 'k' && !e.repeat) act('ok');
      render();
    } else if (k === 'k' && !e.repeat) {
      if (kind === 'caisse') act('quit');
      else if (stage === 'counter') { if (wallet.orders.length) act('give'); else act('quit'); }
      else act('quit');
    }
    return true;
  };
  function end() { panel.remove(); const h = document.getElementById('modeHint'); if (h) h.style.display = 'none'; mgr.endMode(); updateWallet(mgr.current === 'buvette'); }
  let h = document.getElementById('modeHint');
  if (!h) { h = document.createElement('div'); h.id = 'modeHint'; document.body.appendChild(h); }
  h.style.display = ''; h.innerHTML = kind === 'caisse' ? '<b>↑ ↓</b> produit · <b>← →</b> quantité · <b>K</b> valider · <b>Échap</b> partir' : '<b>K</b> donner les tickets · <b>Échap</b> partir';
  render();
  return { cam, update() {}, onKey: key };
}
