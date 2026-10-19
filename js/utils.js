/* Shared state and helpers. Loaded first. */
const app = document.getElementById('app');
function ist() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
function uid() { return 'UM-' + ist().replace(/-/g, '') + '-' + (Math.random().toString(36) + '000000000').slice(2, 11).toUpperCase(); }

let API = localStorage.getItem('um_api') || '';
let TK = sessionStorage.getItem('um_t') || '';
let ST = null;          // latest state from the Google Sheet
let V = 'dash';         // current view
let BD = ist();         // selected business date
let Q = {};             // quick-sale quantities by variety name
let SK = uid();         // idempotency key (order ID) for the order being entered
let EID = '', ED = {};  // expense being edited
let RD = null;          // last report

const $ = s => document.querySelector(s);
const inr = n => (n < 0 ? '-' : '') + '₹' + Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const val = id => $('#' + id).value;
const fld = (id, label, type = 'text', extra = '') => `<label>${label}<input id="${id}" type="${type}" ${extra}></label>`;
const sel = (id, label, opts, cur) => `<label>${label}<select id="${id}">${opts.map(x => `<option ${x == cur ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
const dtf = reload => fld('dt', 'Business date', 'date', `value="${BD}" max="${ist()}"` + (reload ? ' onchange="BD=this.value;load()"' : ''));
const varSel = () => ST.set.mode == 'separate' ? sel('vr', 'Variety', ST.bases) : '';
const vv = () => ST.set.mode == 'separate' ? val('vr') : 'ALL';
const tbl = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
const balHtml = () => ST.set.mode == 'shared'
  ? `Shared stock: <b>${ST.bal.ALL || 0}</b> pieces`
  : ST.bases.map(b => `${esc(b)}: <b>${ST.bal[b] || 0}</b> pieces`).join('<br>');

function toast(text, bad) {
  const e = $('#toast');
  e.textContent = text;
  e.className = (bad ? 'r' : 'g') + ' show';
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { e.className = ''; }, 4500);
}