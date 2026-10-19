/* Reports, CSV export and print. */
const DH = ['Date', 'Opening', 'Added', 'Plates', 'Pieces sold', 'Wastage pcs', 'Free pcs', 'Closing', 'Revenue', 'Cost of sales', 'Gross profit', 'Wastage+free cost', 'Expenses', 'Net result', 'Cash', 'UPI', 'Other', 'Purchases', 'Net cash flow', 'Dine revenue', 'Parcel revenue', 'Dine profit', 'Parcel profit'];
const dayRow = d => [d.date, d.opening, d.added, d.plates, d.sold, d.waste, d.extra, d.closing, d.revenue, d.costOfSales, d.gross, d.lossCost, d.expenses, d.net, d.cash, d.upi, d.other, d.purchaseCost, d.cashFlow, d.types.Dine.revenue, d.types.Parcel.revenue, d.types.Dine.profit, d.types.Parcel.profit];

function repView() {
  $('#m').innerHTML = `<h2>Reports</h2><div class="card">${fld('rf', 'From', 'date', 'value="' + BD.slice(0, 8) + '01"')}${fld('rt', 'To', 'date', 'value="' + BD + '"')}<button class="p" id="go">Show report</button></div><div id="out"></div>`;
  $('#go').onclick = async e => {
    e.target.disabled = true;
    try { RD = await call('report', { from: val('rf'), to: val('rt') }); showRep(); } catch (x) { toast(x.message, 1); }
    e.target.disabled = false;
  };
  if (RD) showRep();
}

function showRep() {
  const sumOf = k => Math.round(RD.days.reduce((a, d) => a + Math.round(d[k] * 100), 0)) / 100;
  const K = (a, k, cls) => `<div class="card k"><small>${a}</small><b class="${cls || ''}">${inr(sumOf(k))}</b></div>`;
  $('#out').innerHTML = `<p><button class="s" onclick="csv()">Download CSV</button><button class="s" onclick="print()">Print</button></p>
<div class="grid">${K('Revenue', 'revenue', 'g')}${K('Cost of sales', 'costOfSales')}${K('Gross profit', 'gross', 'g')}${K('Wastage + free-piece cost', 'lossCost', 'r')}${K('Expenses', 'expenses', 'r')}${K('Net result', 'net', 'g')}
${K('Cash received', 'cash')}${K('UPI received', 'upi')}${K('Other received', 'other')}${K('Stock purchases', 'purchaseCost')}${K('Net cash flow', 'cashFlow')}</div>
<p class="w">Profit uses the cost per plate you set in Settings (saved with every sale). Net result = revenue − cost of sales − wastage and free-piece cost − expenses. Net cash flow = money received − expenses − stock purchases. Do not enter the same ingredient purchase as both a stock cost and an expense. Expenses and stock purchases are shared by Dine and Parcel, so net cash flow is shown for the whole business.</p>
<div class="card sc"><b>Dine vs Parcel</b>${tbl(['', 'Dine', 'Parcel'], [['Plates', RD.types.Dine.plates, RD.types.Parcel.plates], ['Revenue', inr(RD.types.Dine.revenue), inr(RD.types.Parcel.revenue)], ['Cost', inr(RD.types.Dine.cost), inr(RD.types.Parcel.cost)], ['Profit', inr(RD.types.Dine.profit), inr(RD.types.Parcel.profit)], ['Cash received', inr(RD.types.Dine.cash), inr(RD.types.Parcel.cash)], ['UPI received', inr(RD.types.Dine.upi), inr(RD.types.Parcel.upi)], ['Other received', inr(RD.types.Dine.other), inr(RD.types.Parcel.other)]])}</div>
<div class="card sc"><b>By variety</b>${tbl(['Variety', 'Plates', 'Momos', 'Revenue', 'Cost', 'Profit', 'Profit / plate'], Object.entries(RD.vs).map(([k, v]) => [k, v.plates, v.pieces, inr(v.rev), inr(v.cost), inr(v.profit), inr(v.plates ? Math.round(v.profit * 100 / v.plates) / 100 : 0)]))}</div>
<div class="card sc"><b>Day by day</b>${tbl(DH, RD.days.map(dayRow))}</div>
<div class="card sc"><b>Expenses by category</b>${tbl(['Category', 'Total'], Object.entries(RD.cs).map(([k, v]) => [k, inr(v)]))}</div>`;
}

function csv() {
  const text = [DH, ...RD.days.map(dayRow)].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = 'utkal-momo-report.csv';
  a.click();
}