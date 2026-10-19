/* Stock, Wastage and Extra Pieces screens. */
function stockView() {
  $('#m').innerHTML = `<h2>Stock</h2><div class="card">${dtf()}${sel('ty', 'Type', ['purchase', 'opening', 'adjustment'])}${varSel()}
    ${fld('pc', 'Pieces (an adjustment may be negative)', 'number', 'inputmode="numeric"')}${fld('cost', 'Total purchase cost (₹)', 'number', 'step="0.01"')}
    ${fld('sup', 'Supplier')}${fld('nt', 'Notes (required for an adjustment)')}<button class="p" id="go">Save stock entry</button></div>
    <div class="card">${balHtml()}</div>
    <div class="card sc">${tbl(['Date', 'Type', 'Variety', 'Pieces', 'Notes'], ST.led.map(r => [r.date, r.type, r.variety, r.pcs, r.notes]))}</div>`;
  $('#go').onclick = e => act(e.target, 'addStock', { date: val('dt'), type: val('ty'), variety: vv(), pieces: val('pc'), cost: val('cost'), supplier: val('sup'), notes: val('nt') }, 'Stock saved.');
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