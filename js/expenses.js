/* Daily Expenses screen. */
function expView() {
  const e = ST.exp, L = e.list.filter(r => r.Status == 'Active'), E = ED;
  const total = L.reduce((a, r) => a + Math.round(r['Total Amount'] * 100), 0) / 100;
  const by = k => {
    const m = {};
    L.forEach(r => { m[r[k]] = (m[r[k]] || 0) + Math.round(r['Total Amount'] * 100); });
    return Object.entries(m).map(([a, b]) => [a, b / 100]).sort((a, b) => b[1] - a[1]);
  };
  const top = L.slice().sort((a, b) => b['Total Amount'] - a['Total Amount'])[0], cat = by('Category')[0];
  const K = (a, b, c) => `<div class="card k"><small>${a}</small><b class="${c || ''}">${b}</b></div>`;
  const line = k => by(k).map(x => esc(x[0]) + ' ' + inr(x[1])).join(' · ') || '-';
  $('#m').innerHTML = `<h2>Daily Expenses</h2>${dtf(1)}
<div class="grid">${K('Entries', L.length)}${K('Total spent', inr(total), 'r')}${K('Previous day', inr(e.prev))}
${K('Highest item', top ? esc(top['Item Name']) + ' ' + inr(top['Total Amount']) : '-')}${K('Top category', cat ? esc(cat[0]) + ' ' + inr(cat[1]) : '-')}
${K('Week / Month', inr(e.week) + ' / ' + inr(e.month) + '<small>Previous: ' + inr(e.prevWeek) + ' / ' + inr(e.prevMonth) + '</small>')}</div>
<div class="card"><b>${EID ? 'Edit expense ' + esc(EID) : 'Add expense'}</b>
${fld('it', 'Item or expense name', 'text', 'value="' + esc(E['Item Name'] || '') + '"')}
${sel('ct', 'Category', ST.set.categories, E.Category)}
${fld('qy', 'Quantity', 'number', 'step="any" inputmode="decimal" value="' + (E.Quantity || '') + '" oninput="expTotal()"')}
${sel('un', 'Unit', ['item', 'pieces', 'kg', 'litre', 'packet', 'trip'], E.Unit)}
${fld('co', 'Cost per unit (₹)', 'number', 'step="0.01" inputmode="decimal" value="' + (E['Unit Cost'] == null ? '' : E['Unit Cost']) + '" oninput="expTotal()"')}
<p>Total: <b id="etot">₹0</b></p>
${sel('py', 'Payment method', ['Cash', 'UPI', 'Other'], E['Payment Method'])}
${fld('sp', 'Supplier / shop', 'text', 'value="' + esc(E.Supplier || '') + '"')}
${fld('rc', 'Receipt reference', 'text', 'value="' + esc(E['Receipt Reference'] || '') + '"')}
${fld('nt', 'Notes', 'text', 'value="' + esc(E.Notes || '') + '"')}
<button class="p" id="go">Save Expense</button>${EID ? '<button class="s" onclick="EID=\'\';ED={};draw()">Cancel edit</button>' : ''}</div>
<div class="card sc"><b>By category</b> ${line('Category')}<br><b>By payment</b> ${line('Payment Method')}<br><b>By item</b> ${line('Item Name')}</div>
<div class="card sc"><table>${e.list.map(r => `<tr><td>${esc(r['Item Name'])}<br><small>${esc(r.Category)} · ${r.Quantity} ${esc(r.Unit)} × ${inr(r['Unit Cost'])}</small></td><td>${inr(r['Total Amount'])}</td>
<td>${r.Status == 'Active' ? `<button class="s" onclick="expEdit('${r['Expense ID']}')">Edit</button><button class="s" onclick="expReverse('${r['Expense ID']}')">Reverse</button>` : '<span class="r">Reversed</span>'}</td></tr>`).join('') || '<tr><td>No expenses for this date.</td></tr>'}</table></div>`;
  expTotal();
  $('#go').onclick = async ev => {
    const ok = await act(ev.target, EID ? 'editExpense' : 'addExpense',
      { id: EID, date: val('dt'), item: val('it'), cat: val('ct'), qty: val('qy'), unit: val('un'), cost: val('co'), pay: val('py'), supplier: val('sp'), receipt: val('rc'), notes: val('nt') }, 'Expense saved.');
    if (ok) { EID = ''; ED = {}; draw(); }
  };
}

function expTotal() { $('#etot').textContent = inr(Math.round((+val('qy') || 0) * Math.round((+val('co') || 0) * 100)) / 100); }
function expEdit(id) { EID = id; ED = ST.exp.list.find(r => r['Expense ID'] == id) || {}; draw(); scrollTo(0, 0); }
async function expReverse(id) {
  if (!confirm('Reverse this expense? The row stays in the sheet, marked Reversed.')) return;
    try { await apply(await call('reverseExpense', { id })); toast('Expense reversed.'); } catch (e) { toast(e.message, 1); }
}