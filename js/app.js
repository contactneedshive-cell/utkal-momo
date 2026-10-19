/* App shell: navigation, data loading, clock, start-up. Loaded last. */
function draw() {
  const items = [['dash', '🏠 Home'], ['stock', 'Stock'], ['waste', 'Wastage'], ['extra', 'Extra'], ['exp', 'Expenses'], ['rep', 'Reports'], ['set', 'Settings']];
  app.innerHTML = `<nav>${items.map(([k, l]) => `<button class="${V == k ? 'on' : ''}" onclick="V='${k}';draw()">${l}</button>`).join('')}<button onclick="lock()">🔒 Lock</button></nav><main id="m"></main>`;
  ({ dash: dashView, stock: stockView, waste: () => logView('waste'), extra: () => logView('extra'), exp: expView, rep: repView, set: setView })[V]();
}

async function load() { ST = await call('state', { date: BD }); draw(); }

setInterval(() => {
  const c = $('#clk');
  if (c) c.textContent = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
}, 1000);

if (!API || !TK) gate(); else load().catch(e => { toast(e.message, 1); });