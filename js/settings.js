/* Settings screen: per-variety price, cost and momos per plate, with live profit. */
function setView() {
  const s = ST.set;
  $('#m').innerHTML = `<h2>Settings</h2>
<div class="card"><b>Variety price, cost and plate size</b>
<p><small>Set what you charge, what one plate costs you to make, and how many momos go in one plate. Profit per plate is worked out for you. Changes apply to new orders only; past orders keep the price, cost and plate size they were sold with.</small></p>
${ST.all.map((v, i) => `<div class="card" style="box-shadow:none;border:1px solid #eee"><b>${esc(v.name)}</b>
<label style="display:inline-block;margin-left:12px;white-space:nowrap"><input type="checkbox" id="va${i}" ${v.active ? 'checked' : ''} style="width:auto"> active</label>
<div class="grid">
<label>Selling price per plate (₹)<input id="vp${i}" type="number" step="0.01" min="0" inputmode="decimal" value="${v.price}" oninput="profLine(${i})"></label>
<label>Your cost per plate (₹)<input id="vc${i}" type="number" step="0.01" min="0" inputmode="decimal" value="${v.cost}" oninput="profLine(${i})"></label>
<label>Momos per plate<input id="vn${i}" type="number" step="1" min="1" max="100" inputmode="numeric" value="${v.pieces}" oninput="profLine(${i})"></label></div>
<p id="vl${i}"></p></div>`).join('')}
<p class="w">Do not also enter ingredient purchases as daily expenses, or the cost is counted twice. Use expenses for rent, gas, electricity, staff and similar.</p></div>
<div class="card">${sel('md', 'Inventory mode', ['shared', 'separate'], s.mode)}
${fld('lo', 'Low-stock warning (pieces)', 'number', 'value="' + s.low + '"')}
<label>Expense categories (comma separated)<textarea id="cg">${esc(s.categories.join(', '))}</textarea></label></div>
<p class="w">Anyone who knows a code can use this system. Codes live in Apps Script → Project Settings → Script properties: ACCESS_CODE (staff, no profit figures) and OWNER_CODE (owner, sees everything).</p>
<button class="p" id="go">Save settings</button>`;
  ST.all.forEach((v, i) => profLine(i));
  $('#go').onclick = e => {
    if (val('md') != s.mode && !confirm('Changing the inventory mode: existing stock entries stay under the old mode. Re-enter opening stock after switching. Continue?')) return;
    act(e.target, 'saveSettings', {
      set: { mode: val('md'), low: val('lo'), categories: val('cg') },
      vars: ST.all.map((v, i) => ({ name: v.name, price: val('vp' + i), cost: val('vc' + i), pieces: val('vn' + i), active: $('#va' + i).checked }))
    }, 'Settings saved.');
  };
}

/* Live profit line under each variety. */
function profLine(i) {
  const price = Math.round((+val('vp' + i) || 0) * 100), cost = Math.round((+val('vc' + i) || 0) * 100), n = Math.trunc(+val('vn' + i)) || 0;
  const profit = price - cost, el = $('#vl' + i);
  el.className = profit < 0 ? 'r' : 'g';
  el.innerHTML = `Profit per plate: <b>${inr(profit / 100)}</b>${price ? ' (' + (profit * 100 / price).toFixed(1) + '% margin)' : ''}` +
    (n > 0 ? `<br><small>Per momo: sells ${inr(Math.round(price / n) / 100)}, costs ${inr(Math.round(cost / n) / 100)}</small>` : '');
}