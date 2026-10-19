/* UTKAL MOMO backend: Google Apps Script bound to your Google Sheet (the only backend).
SETUP
1) In the Sheet: Extensions > Apps Script. Paste this whole file into Code.gs and save.
2) Project Settings (gear icon) > Script properties > Add property: ACCESS_CODE = your 4 digits.
3) Select the function "setup" and click Run once. Authorise when asked. It creates / upgrades all tabs.
4) Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone". Copy the /exec URL.
5) Open index.html, paste that URL on first run, then enter the 4-digit code.
After changing this code later: Run setup once, then Deploy > Manage deployments > Edit > Version: New version > Deploy. */

const TZ = 'Asia/Kolkata';
const MSG = "Access Denied! The access code you entered is incorrect. Utkal Momo's management system is restricted to authorized access. Please check the code and try again.";
const BASES = ['Steam Momo', 'Fried Momo', 'Kurkure Momo', 'Tandoori Momo', 'Schezwan Momo', 'Creamy Garlic Momo'];
const TYPES = ['Dine', 'Parcel'];
const H = {
  'Stock Ledger': ['ID', 'Business Date', 'Timestamp', 'Type', 'Variety', 'Pieces', 'Ref', 'Notes', 'Total Cost', 'Supplier'],
  'Sales Log': ['Order ID', 'Business Date', 'Creation Timestamp', 'Variety', 'Plates', 'Pieces', 'Price Per Plate', 'Subtotal', 'Discount Allocation', 'Final Line Total', 'Order Total', 'Payment Method', 'Status', 'Cost Per Plate', 'Line Cost', 'Order Type', 'Stock Key', 'Last Updated'],
  'Wastage Log': ['ID', 'Business Date', 'Creation Timestamp', 'Variety', 'Pieces', 'Reason', 'Notes'],
  'Extra Pieces Log': ['ID', 'Business Date', 'Creation Timestamp', 'Variety', 'Pieces', 'Reason', 'Notes'],
  'Daily Expenses': ['Expense ID', 'Business Date', 'Creation Timestamp', 'Item Name', 'Category', 'Quantity', 'Unit', 'Unit Cost', 'Total Amount', 'Payment Method', 'Supplier', 'Receipt Reference', 'Notes', 'Last Updated', 'Status'],
  'Daily Summary': ['Business Date', 'Opening Stock', 'Stock Purchased', 'Plates Sold', 'Pieces Sold', 'Wastage Pieces', 'Complimentary Pieces', 'Closing Stock', 'Sales Revenue', 'Purchase Cost', 'Operating Expenses', 'Estimated Gross Profit', 'Estimated Net Operating Result', 'Last Updated', 'Cost Of Sales', 'Wastage And Free Cost', 'Cash Sales', 'UPI Sales', 'Other Sales', 'Net Cash Flow', 'Dine Revenue', 'Parcel Revenue', 'Dine Profit', 'Parcel Profit'],
  'Varieties': ['Name', 'Price', 'Active', 'Order', 'Cost Per Plate', 'Pieces Per Plate', 'Base', 'Type'],
  'Settings': ['Key', 'Value']
};

/* ---------- helpers ---------- */
const P = k => PropertiesService.getScriptProperties().getProperty(k);
const sh = n => SpreadsheetApp.getActive().getSheetByName(n);
const fmt = (d, f) => Utilities.formatDate(d, TZ, f);
const today = () => fmt(new Date(), 'yyyy-MM-dd');
const now = () => fmt(new Date(), 'yyyy-MM-dd HH:mm:ss');
const uid8 = () => Utilities.getUuid().slice(0, 8).toUpperCase();
const rows = n => {
  const v = sh(n).getDataRange().getValues(), h = v.shift();
  return v.map((r, i) => {
    const o = { _row: i + 2 };
    h.forEach((k, j) => { o[k] = r[j] instanceof Date ? fmt(r[j], 'yyyy-MM-dd HH:mm:ss') : r[j]; });
    return o;
  });
};
const add = (n, r) => { const s = sh(n); s.getRange(s.getLastRow() + 1, 1, r.length, r[0].length).setValues(r); };
const led = (date, type, v, p, ref, notes, cost, sup) => add('Stock Ledger', [['L-' + uid8(), date, now(), type, v, p, ref || '', notes || '', cost || '', sup || '']]);
const bd = o => String(o['Business Date']).slice(0, 10);
const isOn = x => x === true || String(x).toUpperCase() == 'TRUE';
const vd = x => { x = x || today(); if (!/^\d{4}-\d\d-\d\d$/.test(x) || x > today()) throw Error('Invalid or future date.'); return x; };
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const D = () => ({ led: rows('Stock Ledger'), sales: rows('Sales Log'), exp: rows('Daily Expenses') });
const bal = l => { const b = {}; l.forEach(r => { b[r.Variety] = (b[r.Variety] || 0) + Number(r.Pieces); }); return b; };
const ppl = (v, s) => { const n = Math.trunc(+v['Pieces Per Plate']); return n >= 1 ? n : s.plateSize; };   // momos per plate for this item
const cst = v => Math.max(0, +v['Cost Per Plate'] || 0);                                                  // your cost per plate for this item
const typeOf = r => r['Order Type'] == 'Parcel' ? 'Parcel' : 'Dine';                                     // older rows count as Dine
function S() {
  const o = {};
  rows('Settings').forEach(r => { o[r.Key] = r.Value; });
  return { name: o.name, plateSize: +o.plateSize, mode: o.mode, low: +o.low, categories: String(o.categories).split(',').map(s => s.trim()).filter(Boolean) };
}

/* ---------- one-time setup / upgrade ---------- */
function setup() {
  if (!/^\d{4}$/.test(P('ACCESS_CODE') || '')) throw Error('Add Script property ACCESS_CODE (exactly 4 digits) first.');
  if (!P('SECRET')) PropertiesService.getScriptProperties().setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(H).forEach(n => heads(ss.getSheetByName(n) || ss.insertSheet(n), H[n]));
  if (sh('Settings').getLastRow() < 2) sh('Settings').getRange(2, 1, 5, 2).setValues([
    ['name', 'Utkal Momo'], ['plateSize', 6], ['mode', 'shared'], ['low', 30],
    ['categories', 'Momo ingredients,Flour or wrappers,Vegetables,Paneer or other fillings,Oil,Sauces and seasonings,Mayonnaise and cream,Packaging materials,Gas and fuel,Transport,Electricity,Rent,Cleaning supplies,Equipment and maintenance,Staff expenses,Miscellaneous']
  ]);
  const vs = sh('Varieties');
  if (vs.getLastRow() < 2) {
    const r = [];
    BASES.forEach((b, i) => TYPES.forEach((t, j) => r.push([b + ' ' + t, 80, true, i * 2 + j + 1, 0, 6, b, t])));
    vs.getRange(2, 1, r.length, 8).setValues(r);
  }
  // upgrade from older versions
  const dflt = Math.trunc(+S().plateSize) >= 1 ? Math.trunc(+S().plateSize) : 6;
  rows('Varieties').forEach(v => {
    if (v['Cost Per Plate'] === '') vs.getRange(v._row, 5).setValue(0);
    if (v['Pieces Per Plate'] === '') vs.getRange(v._row, 6).setValue(dflt);
    if (v.Base === '') {                                      // old single-type variety becomes its Dine item
      vs.getRange(v._row, 1).setValue(v.Name + ' Dine');
      vs.getRange(v._row, 7, 1, 2).setValues([[v.Name, 'Dine']]);
    }
  });
  let all = rows('Varieties');
  all.filter(v => v.Type === 'Dine' && !all.some(x => x.Base === v.Base && x.Type === 'Parcel')).forEach(v =>
    add('Varieties', [[v.Base + ' Parcel', v.Price, v.Active, 0, v['Cost Per Plate'], v['Pieces Per Plate'], v.Base, 'Parcel']]));
  all = rows('Varieties');
  const order = all.filter(v => v.Type === 'Dine').sort((a, b) => a.Order - b.Order).map(v => v.Base);
  all.forEach(v => { const i = order.indexOf(v.Base); if (i >= 0) vs.getRange(v._row, 4).setValue(i * 2 + (v.Type === 'Parcel' ? 2 : 1)); });
}
/* Create the header row, or append any missing header columns at the end (keeps old data in place). */
function heads(s, h) {
  if (s.getLastRow() == 0) { s.appendRow(h); s.setFrozenRows(1); return; }
  let c = s.getLastColumn();
  const cur = s.getRange(1, 1, 1, c).getValues()[0];
  h.forEach(x => { if (cur.indexOf(x) < 0) { c++; s.getRange(1, c).setValue(x); } });
}

/* ---------- access gate ---------- */
const mac = s => Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, P('SECRET')));
const mk = () => { const e = Date.now() + 12 * 3600000; return e + '.' + mac('' + e); };
const ok = t => { if (!t) return false; const [a, b] = String(t).split('.'); return b === mac(a) && +a > Date.now(); };

function doPost(e) {
  let r;
  try { r = route(JSON.parse(e.postData.contents)); } catch (x) { r = { error: String(x.message || x) }; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}
function route(q) {
  if (q.action == 'login') {
    const c = CacheService.getScriptCache(), f = +(c.get('f') || 0);
    if (f >= 5) return { error: 'Too many wrong attempts. Locked for 15 minutes.' };
    if (/^\d{4}$/.test(q.code) && String(q.code) === P('ACCESS_CODE')) { c.remove('f'); return { token: mk() }; }
    c.put('f', f + 1, 900);
    return { error: MSG };
  }
  if (!ok(q.token)) return { error: 'AUTH' };
  if (!Object.prototype.hasOwnProperty.call(A, q.action)) throw Error('Unknown action.');
  const L = LockService.getScriptLock();
  L.waitLock(20000);          // one write at a time: no overselling, no duplicate rows
  try { return A[q.action](q); } finally { L.releaseLock(); }
}

/* ---------- calculations ---------- */
function sum(d, date, s) {
  const o = { date, opening: 0, added: 0, adj: 0, sold: 0, waste: 0, extra: 0, plates: 0 };
  const ty = { Dine: { plates: 0, rev: 0, cost: 0, cash: 0, upi: 0, other: 0 }, Parcel: { plates: 0, rev: 0, cost: 0, cash: 0, upi: 0, other: 0 } };
  let rv = 0, cogs = 0, pcost = 0, exs = 0, loss = 0, cash = 0, upi = 0, oth = 0, cashExp = 0;
  d.led.forEach(r => {
    const x = bd(r), p = +r.Pieces;
    if (x < date) o.opening += p;
    else if (x == date) {
      const t = r.Type, c = Math.round((+r['Total Cost'] || 0) * 100);
      if (t == 'purchase' || t == 'opening') { o.added += p; pcost += c; }
      else if (t == 'sale' || t == 'sale_reversal') o.sold -= p;
      else if (t == 'wastage') { o.waste -= p; loss += c; }
      else if (t == 'complimentary') { o.extra -= p; loss += c; }
      else o.adj += p;
    }
  });
  d.sales.forEach(r => {
    if (bd(r) == date && r.Status == 'Saved') {
      const m = Math.round(r['Final Line Total'] * 100), c = Math.round((+r['Line Cost'] || 0) * 100), t = ty[typeOf(r)], pm = r['Payment Method'];
      o.plates += +r.Plates; rv += m; cogs += c;
      t.plates += +r.Plates; t.rev += m; t.cost += c;
      if (pm == 'Cash') { cash += m; t.cash += m; } else if (pm == 'UPI') { upi += m; t.upi += m; } else { oth += m; t.other += m; }
    }
  });
  d.exp.forEach(r => {
    if (bd(r) == date && r.Status == 'Active') { const m = Math.round(r['Total Amount'] * 100); exs += m; if (r['Payment Method'] == 'Cash') cashExp += m; }
  });
  const R = x => Math.round(x) / 100;
  o.closing = o.opening + o.added + o.adj - o.sold - o.waste - o.extra;
  o.revenue = R(rv); o.costOfSales = R(cogs); o.gross = R(rv - cogs);
  o.lossCost = R(loss); o.expenses = R(exs); o.net = R(rv - cogs - loss - exs);
  o.purchaseCost = R(pcost); o.cash = R(cash); o.upi = R(upi); o.other = R(oth);
  o.cashFlow = R(rv - exs - pcost); o.cashInHand = R(cash - cashExp);
  o.types = {};
  TYPES.forEach(k => { const t = ty[k]; o.types[k] = { plates: t.plates, revenue: R(t.rev), cost: R(t.cost), profit: R(t.rev - t.cost), cash: R(t.cash), upi: R(t.upi), other: R(t.other) }; });
  return o;
}
function refresh(date) {
  const o = sum(D(), date, S()), s = sh('Daily Summary');
  const v = [date, o.opening, o.added, o.plates, o.sold, o.waste, o.extra, o.closing, o.revenue, o.purchaseCost, o.expenses, o.gross, o.net, now(),
    o.costOfSales, o.lossCost, o.cash, o.upi, o.other, o.cashFlow,
    o.types.Dine.revenue, o.types.Parcel.revenue, o.types.Dine.profit, o.types.Parcel.profit];
  const col = s.getRange(2, 1, Math.max(1, s.getLastRow() - 1), 1).getValues().map(r => r[0] instanceof Date ? fmt(r[0], 'yyyy-MM-dd') : String(r[0]));
  const i = col.indexOf(date);
  s.getRange(i < 0 ? s.getLastRow() + 1 : i + 2, 1, 1, v.length).setValues([v]);
}
const sumExp = (d, f, t) => d.exp.filter(r => r.Status == 'Active' && bd(r) >= f && bd(r) <= t).reduce((a, r) => a + Math.round(r['Total Amount'] * 100), 0) / 100;
/* Stock is kept per BASE variety in separate mode (Steam Dine and Steam Parcel share one Steam stock). */
const pickV = (q, st) => {
  const v = st.mode == 'shared' ? 'ALL' : q.variety;
  if (v != 'ALL' && !rows('Varieties').some(x => x.Base == v)) throw Error('Choose a variety.');
  return v;
};

/* ---------- order helpers (used by save, edit, delete) ---------- */
const keyOf = (r, mode) => r['Stock Key'] || (mode == 'shared' ? 'ALL' : r.Variety);   // the stock pool this sale used
function build(q, s) {
  if (!Array.isArray(q.items) || !q.items.length) throw Error('Invalid order.');
  const V = rows('Varieties'), seen = {};
  let sub = 0, pcs = 0;
  const L = q.items.map(i => {
    const v = V.find(x => x.Name == i.name && isOn(x.Active));
    if (!v || seen[i.name] || !Number.isInteger(i.plates) || i.plates < 1 || i.plates > 500) throw Error('Invalid quantities.');
    seen[i.name] = 1;
    const price = Math.round(v.Price * 100), line = price * i.plates, p = i.plates * ppl(v, s), cp = Math.round(cst(v) * 100);   // from the sheet, never the browser
    sub += line; pcs += p;
    return { name: i.name, type: v.Type, n: i.plates, price, line, p, cp, lc: cp * i.plates, key: s.mode == 'shared' ? 'ALL' : v.Base };
  });
  const disc = Math.round((+q.discount || 0) * 100);
  if (disc < 0 || disc > sub) throw Error('Discount cannot exceed the order total.');
  if (!['Cash', 'UPI', 'Other'].includes(q.pay)) throw Error('Invalid payment method.');
  let big = 0;
  L.forEach((l, i) => { l.d = Math.floor(disc * l.line / sub); if (l.line > L[big].line) big = i; });
  L[big].d += disc - L.reduce((a, l) => a + l.d, 0);          // remainder paise go to the largest line
  const need = {};
  L.forEach(l => { need[l.key] = (need[l.key] || 0) + l.p; });
  return { L, sub, pcs, disc, need };
}
function enough(b, need) {
  Object.keys(need).forEach(k => { if ((b[k] || 0) < need[k]) throw Error(k == 'ALL' ? 'Not enough stock. Order not saved.' : 'Not enough ' + k + ' stock. Order not saved.'); });
}
const salesRows = (id, date, ts, B, pay) => B.L.map(l => [id, date, ts, l.name, l.n, l.p, l.price / 100, l.line / 100, l.d / 100, (l.line - l.d) / 100, (B.sub - B.disc) / 100, pay, 'Saved', l.cp / 100, l.lc / 100, l.type, l.key, now()]);
const ledSale = (B, date, id) => Object.keys(B.need).forEach(k => led(date, 'sale', k, -B.need[k], id));
function restore(R, date, id, note, mode) {                   // put the pieces of these sale rows back into stock
  const m = {};
  R.forEach(r => { const k = keyOf(r, mode); m[k] = (m[k] || 0) + Number(r.Pieces); });
  Object.keys(m).forEach(k => led(date, 'sale_reversal', k, m[k], id, note));
}

/* ---------- actions ---------- */
const A = {};

A.state = q => {
  const date = vd(q.date), d = D(), s = S();
  const all = rows('Varieties').sort((a, b) => a.Order - b.Order).map(v => ({ name: v.Name, base: v.Base, type: v.Type, price: +v.Price, cost: cst(v), pieces: ppl(v, s), active: isOn(v.Active) }));
  const act = all.filter(v => v.active);
  const ids = [...new Set(d.sales.map(r => r['Order ID']))].slice(-10).reverse();
  const recent = ids.map(id => {
    const R = d.sales.filter(r => r['Order ID'] == id), live = R.filter(r => r.Status == 'Saved');
    const status = live.length ? 'Saved' : R[R.length - 1].Status, use = R.filter(r => r.Status == status);
    return {
      id, status, date: bd(use[0]), time: use[0]['Creation Timestamp'], total: use[0]['Order Total'], pay: use[0]['Payment Method'],
      discount: use.reduce((a, r) => a + Math.round(r['Discount Allocation'] * 100), 0) / 100,
      lines: use.map(r => ({ name: r.Variety, plates: +r.Plates })), items: use.map(r => r.Variety + ' ×' + r.Plates).join(', ')
    };
  });
  const m0 = date.slice(0, 8) + '01', pm = addDays(m0, -1);
  return {
    at: now(), set: s, all, vars: act, bases: [...new Set(act.map(v => v.base))], bal: bal(d.led), sum: sum(d, date, s), recent,
    led: d.led.slice(-15).reverse().map(r => ({ date: bd(r), type: r.Type, variety: r.Variety, pcs: r.Pieces, notes: r.Notes })),
    exp: {
      list: d.exp.filter(r => bd(r) == date).reverse(),
      prev: sumExp(d, addDays(date, -1), addDays(date, -1)),
      week: sumExp(d, addDays(date, -6), date), prevWeek: sumExp(d, addDays(date, -13), addDays(date, -7)),
      month: sumExp(d, m0, date), prevMonth: sumExp(d, pm.slice(0, 8) + '01', pm)
    }
  };
};

A.saveOrder = q => {
  const d = D(), s = S();
  if (d.sales.some(r => r['Order ID'] == q.id)) return { ok: 1, dup: 1 };       // retry-safe
  if (!/^UM-[A-Z0-9-]{8,40}$/.test(String(q.id))) throw Error('Invalid order.');
  const B = build(q, s);
  enough(bal(d.led), B.need);
  const date = today(), ts = now();
  add('Sales Log', salesRows(q.id, date, ts, B, q.pay));
  ledSale(B, date, q.id);
  refresh(date);
  return { ok: 1 };
};

/* Edit a saved order: the old lines are kept in the sheet marked "Edited", new lines are added with the same Order ID. */
A.editOrder = q => {
  const d = D(), s = S(), old = d.sales.filter(r => r['Order ID'] == q.id && r.Status == 'Saved');
  if (!old.length) throw Error('Order not found, or it was already deleted.');
  const B = build(q, s), date = bd(old[0]), b = bal(d.led);
  old.forEach(r => { const k = keyOf(r, s.mode); b[k] = (b[k] || 0) + Number(r.Pieces); });   // stock the old version held is free again
  enough(b, B.need);
  const sl = sh('Sales Log');
  old.forEach(r => { sl.getRange(r._row, 13).setValue('Edited'); sl.getRange(r._row, 18).setValue(now()); });
  restore(old, date, q.id, 'Order edited', s.mode);
  add('Sales Log', salesRows(q.id, date, old[0]['Creation Timestamp'], B, q.pay));
  ledSale(B, date, q.id);
  refresh(date);
  return { ok: 1 };
};

/* Delete (customer refused): stock goes back, rows stay in the sheet marked "Deleted" and count nowhere. */
A.deleteOrder = q => {
  const R = rows('Sales Log').filter(r => r['Order ID'] == q.id && r.Status == 'Saved');
  if (!R.length) throw Error('Order not found, or it was already deleted.');
  const s = S(), sl = sh('Sales Log'), date = bd(R[0]);
  R.forEach(r => { sl.getRange(r._row, 13).setValue('Deleted'); sl.getRange(r._row, 18).setValue(now()); });
  restore(R, date, q.id, 'Order deleted', s.mode);
  refresh(date);
  return { ok: 1 };
};

A.addStock = q => {
  const date = vd(q.date), p = Math.trunc(+q.pieces), t = q.type, st = S();
  if (!['purchase', 'opening', 'adjustment'].includes(t) || !p || (t != 'adjustment' && p < 0)) throw Error('Enter a valid piece count.');
  if (t == 'adjustment' && !q.notes) throw Error('Adjustments need a note.');
  const v = pickV(q, st);
  if (p < 0 && (bal(D().led)[v] || 0) + p < 0) throw Error('Adjustment would make stock negative.');
  led(date, t, v, p, '', q.notes, Math.round((+q.cost || 0) * 100) / 100, q.supplier);
  refresh(date);
  return { ok: 1 };
};

const out = (sheet, type) => q => {
  const date = vd(q.date), p = Math.trunc(+q.pieces), v = pickV(q, S());
  if (!(p > 0) || !q.reason) throw Error('Enter the pieces and a reason.');
  if ((bal(D().led)[v] || 0) < p) throw Error('Not enough stock.');
  const id = type.slice(0, 1).toUpperCase() + '-' + uid8(), st = S(), VR = rows('Varieties');
  const cpp = x => cst(x) / ppl(x, st);                       // your cost per momo piece
  const pool = v == 'ALL' ? VR.filter(x => isOn(x.Active)) : VR.filter(x => x.Base == v);   // average over the items that share this stock
  const per = pool.length ? pool.reduce((a, x) => a + cpp(x), 0) / pool.length : 0;
  const cost = Math.round(p * per * 100) / 100;                // saved so later cost edits do not change history
  add(sheet, [[id, date, now(), v, p, q.reason, q.notes || '']]);
  led(date, type, v, -p, id, q.reason, cost);
  refresh(date);
  return { ok: 1 };
};
A.addWaste = out('Wastage Log', 'wastage');
A.addExtra = out('Extra Pieces Log', 'complimentary');

function ex(q) {
  const qty = +q.qty, uc = Math.round(+q.cost * 100);
  if (!q.item || !q.cat || !(qty > 0) || !(uc >= 0)) throw Error('Fill item, category, quantity and cost.');
  return { date: vd(q.date), item: q.item, cat: q.cat, qty, unit: q.unit, uc, tot: Math.round(qty * uc), pay: q.pay };
}
A.addExpense = q => {
  const e = ex(q), id = 'EX-' + uid8();
  add('Daily Expenses', [[id, e.date, now(), e.item, e.cat, e.qty, e.unit, e.uc / 100, e.tot / 100, e.pay, q.supplier || '', q.receipt || '', q.notes || '', now(), 'Active']]);
  refresh(e.date);
  return { ok: 1, id };
};
A.editExpense = q => {
  const r = rows('Daily Expenses').find(x => x['Expense ID'] == q.id && x.Status == 'Active');
  if (!r) throw Error('Expense not found.');
  const e = ex(q), s = sh('Daily Expenses');
  s.getRange(r._row, 2).setValue(e.date);
  s.getRange(r._row, 4, 1, 11).setValues([[e.item, e.cat, e.qty, e.unit, e.uc / 100, e.tot / 100, e.pay, q.supplier || '', q.receipt || '', q.notes || '', now()]]);
  refresh(e.date);
  if (bd(r) != e.date) refresh(bd(r));
  return { ok: 1 };
};
A.reverseExpense = q => {
  const r = rows('Daily Expenses').find(x => x['Expense ID'] == q.id && x.Status == 'Active');
  if (!r) throw Error('Expense not found.');
  sh('Daily Expenses').getRange(r._row, 14, 1, 2).setValues([[now(), 'Reversed']]);   // row is kept for the audit trail
  refresh(bd(r));
  return { ok: 1 };
};

A.report = q => {
  const f = vd(q.from), t = vd(q.to);
  if (t < f) throw Error('Bad date range.');
  const d = D(), s = S(), days = [], vs = {}, cs = {};
  const types = { Dine: { plates: 0, revenue: 0, cost: 0, profit: 0, cash: 0, upi: 0, other: 0 }, Parcel: { plates: 0, revenue: 0, cost: 0, profit: 0, cash: 0, upi: 0, other: 0 } };
  for (let x = f, n = 0; x <= t && n < 93; x = addDays(x, 1), n++) days.push(sum(d, x, s));
  days.forEach(x => TYPES.forEach(k => Object.keys(types[k]).forEach(f2 => { types[k][f2] = Math.round((types[k][f2] + x.types[k][f2]) * 100) / 100; })));
  d.sales.forEach(r => {
    const x = bd(r);
    if (x >= f && x <= t && r.Status == 'Saved') {
      const o = vs[r.Variety] = vs[r.Variety] || { plates: 0, pieces: 0, rev: 0, cost: 0 };
      o.plates += +r.Plates; o.pieces += +r.Pieces; o.rev += Math.round(r['Final Line Total'] * 100); o.cost += Math.round((+r['Line Cost'] || 0) * 100);
    }
  });
  Object.values(vs).forEach(o => { o.profit = (o.rev - o.cost) / 100; o.rev /= 100; o.cost /= 100; });
  d.exp.forEach(r => { const x = bd(r); if (x >= f && x <= t && r.Status == 'Active') cs[r.Category] = (cs[r.Category] || 0) + Math.round(r['Total Amount'] * 100) / 100; });
  return { days, vs, cs, types };
};

A.saveSettings = q => {
  const o = q.set, V = q.vars || [];
  if (!['shared', 'separate'].includes(o.mode)) throw Error('Invalid inventory mode.');
  V.forEach(n => {                                            // validate everything first, so nothing is half-saved
    if (!(+n.price >= 0)) throw Error('Invalid selling price for ' + n.name + '.');
    if (!(+n.cost >= 0)) throw Error('Invalid cost for ' + n.name + '.');
    if (!Number.isInteger(+n.pieces) || +n.pieces < 1 || +n.pieces > 100) throw Error('Momos per plate for ' + n.name + ' must be a whole number from 1 to 100.');
  });
  const s = sh('Settings'), R = rows('Settings'), put = (k, v) => s.getRange(R.find(x => x.Key == k)._row, 2).setValue(v);
  put('mode', o.mode); put('low', +o.low || 0); put('categories', String(o.categories));
  const vs = sh('Varieties');
  rows('Varieties').forEach(v => {
    const n = V.find(x => x.name == v.Name);
    if (n) {
      vs.getRange(v._row, 2, 1, 2).setValues([[+n.price, !!n.active]]);
      vs.getRange(v._row, 5, 1, 2).setValues([[+n.cost, +n.pieces]]);
    }
  });
  return { ok: 1 };
};