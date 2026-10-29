/* Stock, Wastage and Extra Pieces screens. */
function stockView() {
  $('#m').innerHTML = `<h2>Stock</h2><div class="card">${dtf()}${sel('ty', 'Type', ['purchase', 'opening', 'adjustment'])}${varSel()}
    ${fld('pc', 'Pieces (an adjustment may be negative)', 'number', 'inputmode="numeric"')}${fld('cost', 'Total purchase cost (₹)', 'number', 'step="0.01"')}
    ${fld('sup', 'Supplier')}${fld('nt', 'Notes (required for an adjustment)')}<button class="p" id="go">Save stock entry</button></div>
    <div class="card">${balHtml()}</div>
    <div class="card"><b>Physical stock count</b>
      <p><small>Count the momos you really have and enter the number. The difference from the system is saved as an adjustment, so the system matches reality and any missing pieces show up.</small></p>
      ${ST.set.mode == 'separate' ? sel('cv', 'Variety', ST.bases) : ''}${fld('cn', 'Counted pieces', 'number', 'inputmode="numeric" min="0" oninput="countDiff()"')}${fld('cnt', 'Notes (optional)')}
      <p id="cdiff"></p><button class="p" id="cgo">Save count</button></div>
    <div class="card sc">${tbl(['Date', 'Type', 'Variety', 'Pieces', 'Notes'], ST.led.map(r => [r.date, r.type, r.variety, r.pcs, r.notes]))}</div>`;
  if ($('#cv')) $('#cv').onchange = countDiff;
  $('#cgo').onclick = e => {
    const sys = countSystem(), n = val('cn');
    if (n === '' || !(+n >= 0)) return toast('Enter the counted pieces.', 1);
    if (+n != sys && !confirm(`The system shows ${sys} pieces, you counted ${n}. Save a correction of ${+n - sys} pieces?`)) return;
    act(e.target, 'stockCount', { variety: ST.set.mode == 'separate' ? val('cv') : 'ALL', counted: n, notes: val('cnt') }, 'Stock count saved.');
  };
  countDiff();
  $('#go').onclick = e => act(e.target, 'addStock', { date: val('dt'), type: val('ty'), variety: vv(), pieces: val('pc'), cost: val('cost'), supplier: val('sup'), notes: val('nt') }, 'Stock saved.');
}

/* Stock count helpers: what the system thinks you have, and the live difference. */
function countSystem() { return (ST.set.mode == 'separate' ? ST.bal[val('cv')] : ST.bal.ALL) || 0; }
function countDiff() {
  const n = val('cn'), el = $('#cdiff');
  if (n === '') { el.textContent = 'System shows ' + countSystem() + ' pieces.'; el.className = ''; return; }
  const d = +n - countSystem();
  el.textContent = 'System shows ' + countSystem() + ' pieces. ' + (d == 0 ? 'Matches.' : d < 0 ? 'Missing ' + (-d) + ' pieces.' : d + ' more than the system.');
  el.className = d < 0 ? 'r' : d > 0 ? 'w' : 'g';
}

function logView(kind) {
  const w = kind == 'waste';
  const reasons = w ? ['Burnt', 'Damaged', 'Dropped', 'Spoiled', 'Preparation error', 'Other']
                    : ['Customer satisfaction', 'Promotional offer', 'Replacement for a defective item', 'Regular customer', 'Other'];
  $('#m').innerHTML = `<h2>${w ? 'Record Wastage' : 'Give Extra Pieces'}</h2><div class="card">${dtf()}${varSel()}
    ${fld('pc', 'Number of pieces', 'number', 'inputmode="numeric" min="1"')}${sel('rs', 'Reason', reasons)}
    ${fld('nt', w ? 'Notes' : 'Customer reference / notes')}<button class="p" id="go">Save</button></div><div class="card">${balHtml()}</div>`;
  $('#go').onclick = e => act(e.target, w ? 'addWaste' : 'addExtra', { date: val('dt'), variety: vv(), pieces: val('pc'), reason: val('rs'), notes: val('nt') }, 'Saved.');
}