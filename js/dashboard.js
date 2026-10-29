/* Dashboard and Quick Sale (customer order entry), with Dine / Parcel pairs and edit / delete of orders. */
let EO = '', EDISC = '', EPAY = 'Cash';   // order being edited (EO = its Order ID), with its discount and payment method

function tot() {
  const L = ST.vars.filter(v => Q[v.name] > 0).map(v => ({ v, n: Q[v.name], sub: Math.round(v.price * 100) * Q[v.name], pcs: Q[v.name] * v.pieces }));
  return { L, plates: L.reduce((a, l) => a + l.n, 0), pcs: L.reduce((a, l) => a + l.pcs, 0), sub: L.reduce((a, l) => a + l.sub, 0) };
}

/* One entry per variety, holding its Dine and Parcel items (i = index in ST.vars). */
function groups() {
  const g = [];
  ST.vars.forEach((v, i) => {
    let x = g.find(y => y.base == v.base);
    if (!x) { x = { base: v.base, items: [] }; g.push(x); }
    x.items.push({ v, i });
  });
  return g;
}

function itemCard(v, i) {
  return `<div class="card"><b>${esc(v.name)}</b><br><small>${inr(v.price)} · ${v.pieces} momos</small>
  <div class="qb"><button aria-label="Remove one ${esc(v.name)}" onclick="qa(${i},-1)">−</button>
  <input id="q${i}" inputmode="numeric" value="${Q[v.name] || 0}" onfocus="this.select()" oninput="qt(${i},this.value)" aria-label="${esc(v.name)} plates">
  <button aria-label="Add one ${esc(v.name)}" onclick="qa(${i},1)">+</button></div><small id="s${i}"></small></div>`;
}

function dashView() {
  const s = ST.sum, low = ST.set.low, ty = s.types;
  const cards = [
    ['Opening stock', s.opening, ''], ['Purchased/prepared', s.added, ''], ['Plates sold', s.plates, ''],
    ['Pieces sold', s.sold, ''], ['Remaining stock', s.closing, s.closing < low ? 'r' : 'g'], ['Wastage pieces', s.waste, 'r'],
    ['Complimentary pieces', s.extra, ''], ['Sales revenue', inr(s.revenue), 'g'], ['Cash received', inr(s.cash), 'g'],
    ['UPI received', inr(s.upi), 'g'], ['Expenses', inr(s.expenses), 'r']
  ];
  if (ST.role != 'staff') cards.push(['Wastage + free-piece cost', inr(s.lossCost), 'r'], ['Est. net result', inr(s.net), s.net < 0 ? 'r' : 'g'], ['Net cash flow', inr(s.cashFlow), s.cashFlow < 0 ? 'r' : 'g']);
  const quick = [['stock', 'Add Stock'], ['waste', 'Record Wastage'], ['extra', 'Give Extra Pieces'], ['exp', 'Add Expense'], ['rep', 'View Reports']].filter(x => ST.role != 'staff' || x[0] != 'rep');
  const typeRows = [['Plates', k => ty[k].plates], ['Revenue', k => inr(ty[k].revenue)],
    ['Cash received', k => inr(ty[k].cash)], ['UPI received', k => inr(ty[k].upi)], ['Other received', k => inr(ty[k].other)]];
  $('#m').innerHTML = `<h2>Utkal Momo Dashboard</h2>
<p><span id="clk"></span><br>Business date ${BD.split('-').reverse().join('/')} · ${ST.set.mode} stock · <span class="g">Saved in Google Sheet ✔ ${esc(ST.at)}</span></p>
<div class="grid">${cards.map(([a, b, c]) => `<div class="card k"><small>${a}</small><b class="${c}">${b}</b></div>`).join('')}</div>
<div class="card sc"><b>Dine vs Parcel</b>${tbl(['', 'Dine', 'Parcel'], typeRows.map(([n, f]) => [n, f('Dine'), f('Parcel')]))}</div>
<div class="card"><b>Top sellers today</b><br>${ST.top.length ? ST.top.map((t, i) => `${i + 1}. ${esc(t.name)} — ${t.plates} plates`).join('<br>') : 'No sales yet today.'}</div>
<p>${quick.map(([k, l]) => `<button class="s" onclick="V='${k}';draw()">${l}</button>`).join('')}</p>
<h3>Quick Sale</h3>
${EO ? `<div class="card"><b class="w">Editing order ${esc(EO)}</b><br>Change the plates, discount or payment below, then press SAVE CHANGES. <button class="s" onclick="cancelEdit()">Cancel edit</button></div>` : ''}
${groups().map(g => `<div class="pair">${g.items.map(x => itemCard(x.v, x.i)).join('')}</div>`).join('')}
<div class="card"><div id="ln"></div><p id="tt"></p>
  <label>Discount (₹)<input id="disc" inputmode="decimal" value="${esc(EDISC)}" oninput="this.value=this.value.replace(/[^\\d.]/g,'');paint()"></label>
  ${sel('pay', 'Payment method', ['Cash', 'UPI', 'Other'], EPAY)}
  <p><button class="s" onclick="if(confirm('Clear all quantities?')){Q={};dashView()}">Clear all</button>
  <button class="s" onclick="undoLast()">Delete last order</button></p>
  <button class="p" id="sv" onclick="save()">${EO ? 'SAVE CHANGES' : 'SAVE ORDER'}</button></div>
<h3>Stock by variety</h3><div class="card">${balHtml()}</div>
<h3>Recent orders</h3><div class="card sc"><table>${ST.recent.map(o => `<tr><td>${esc(o.id)}<br><small>${esc(o.items)}</small></td><td>${inr(o.total)}<br><small>${esc(o.pay)}</small></td>
<td class="${o.status == 'Saved' ? 'g' : 'r'}">${esc(o.status)}${o.status == 'Saved' ? `<br><button class="s" onclick="editOrder('${o.id}')">Edit</button><button class="s" onclick="rev('${o.id}')">Delete</button>` : ''}</td></tr>`).join('') || '<tr><td>No orders yet</td></tr>'}</table></div>
<h3>Recent stock movements</h3><div class="card sc">${tbl(['Date', 'Type', 'Variety', 'Pcs'], ST.led.slice(0, 8).map(r => [r.date, r.type, r.variety, r.pcs]))}</div>`;
  paint();
}

function qa(i, d) {
  const n = ST.vars[i].name;
  Q[n] = Math.max(0, (Q[n] || 0) + d);
  $('#q' + i).value = Q[n];
  paint();
}
function qt(i, x) { Q[ST.vars[i].name] = parseInt(String(x).replace(/\D/g, '')) || 0; paint(); }

function paint() {
  const t = tot(), shared = ST.set.mode == 'shared', d = Math.round((+(($('#disc') || {}).value) || 0) * 100);
  const used = {};                                            // pieces this order takes from each variety's stock (Dine + Parcel share it)
  t.L.forEach(l => { used[l.v.base] = (used[l.v.base] || 0) + l.pcs; });
  ST.vars.forEach((v, i) => {
    const n = Q[v.name] || 0;
    const rem = shared ? (ST.bal.ALL || 0) - t.pcs : (ST.bal[v.base] || 0) - (used[v.base] || 0);
    $('#s' + i).innerHTML = `Subtotal ${inr(n * v.price)}` + (n ? ` · <span class="${rem < 0 ? 'r' : rem < ST.set.low ? 'w' : 'g'}">${rem < 0 ? 'Short by ' + (-rem) : 'Left ' + rem} pcs${rem >= 0 && rem < ST.set.low ? ' (low)' : ''}</span>` : '');
  });
  $('#ln').innerHTML = t.L.map(l => `${esc(l.v.name)} × ${l.n} = ${inr(l.sub / 100)}`).join('<br>') || 'Tap + to start an order';
  $('#tt').innerHTML = `${t.plates} plates · ${t.pcs} pieces<br><b style="font-size:22px">Total ${inr(Math.max(0, t.sub - d) / 100)}</b>`;
}

async function save() {
  const t = tot();
  if (!t.plates) return toast('Add at least one plate. To cancel an order, use Delete.', 1);
  const d = +val('disc') || 0;
  if (Math.round(d * 100) > t.sub) return toast('Discount cannot exceed the order total.', 1);
  if (t.plates >= 10 && !confirm(`Save ${t.plates} plates (${t.pcs} pieces)?`)) return;
  const b = $('#sv'), editing = !!EO;
  b.disabled = true;
  try {
    const r = await call(editing ? 'editOrder' : 'saveOrder', { id: EO || SK, items: t.L.map(l => ({ name: l.v.name, plates: l.n })), discount: d, pay: val('pay') });
    Q = {};                                                   // reset only after the sheet confirmed the save
    if (editing) { EO = ''; EDISC = ''; EPAY = 'Cash'; } else SK = uid();
    await apply(r);
    toast(editing ? 'Order updated in the sheet.' : 'Order saved successfully! Ready for the next customer.');
  } catch (e) { toast(e.message, 1); }                        // entries stay so the operator can retry
  b.disabled = false;
}

/* Load a saved order into the Quick Sale form for editing. */
function editOrder(id) {
  const o = ST.recent.find(x => x.id == id);
  if (!o) return;
  const missing = o.lines.filter(l => !ST.vars.some(v => v.name == l.name));
  if (missing.length) return toast('This order has items that are not available any more (' + missing.map(m => m.name).join(', ') + '). Delete it and enter it again.', 1);
  Q = {};
  o.lines.forEach(l => { Q[l.name] = l.plates; });
  EO = id; EDISC = o.discount ? String(o.discount) : ''; EPAY = o.pay;
  V = 'dash';
  dashView();
  scrollTo(0, 0);
}
function cancelEdit() { EO = ''; EDISC = ''; EPAY = 'Cash'; Q = {}; dashView(); }

function undoLast() {
  const o = ST.recent.find(x => x.status == 'Saved');
  if (!o) return toast('No saved order to delete.', 1);
  rev(o.id);
}
/* Delete an order (customer refused): stock returns, the sheet keeps the rows marked Deleted. */
async function rev(id) {
  if (!confirm('Delete order ' + id + '? The stock is returned and the order stops counting in sales and profit. The rows stay in the sheet marked Deleted.')) return;
  try {
    const r = await call('deleteOrder', { id });
    if (EO == id) { EO = ''; EDISC = ''; EPAY = 'Cash'; Q = {}; }
    await apply(r);
    toast('Order deleted.');
  } catch (e) { toast(e.message, 1); }
}