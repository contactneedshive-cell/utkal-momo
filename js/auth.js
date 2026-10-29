/* Four-digit access gate. The code is checked only inside Apps Script. */
function gate(msg) {
  const saved = localStorage.getItem('um_api');
  app.innerHTML = `<div class="card gate"><h1>Utkal Momo</h1>
    ${saved ? '' : '<label>Web App URL (from your Apps Script deployment)<input id="api" placeholder="https://script.google.com/macros/s/.../exec"></label>'}
    <p>Enter the 4-digit access code</p>
    <div class="digits">${[0, 1, 2, 3].map(i => `<input class="d" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}">`).join('')}</div>
    <p class="r" role="alert">${esc(msg || '')}</p>
    ${saved ? '<button class="s" onclick="resetUrl()">Change Web App URL</button>' : ''}</div>`;
  const ds = [...document.querySelectorAll('.d')];
  ds[0].focus();
  ds.forEach((d, i) => {
    d.oninput = () => {
      d.value = d.value.replace(/\D/g, '');
      if (d.value && i < 3) ds[i + 1].focus();
      if (ds.every(x => x.value)) login(ds.map(x => x.value).join(''));
    };
    d.onkeydown = e => { if (e.key == 'Backspace' && !d.value && i > 0) ds[i - 1].focus(); };
  });
}

function resetUrl() { localStorage.removeItem('um_api'); API = ''; gate(); }

async function login(code) {
  const u = $('#api');
  if (u) API = u.value.trim();
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(API)) return gate('Paste the Apps Script Web App URL (it starts with https://script.google.com/).');
  try {
    const r = await call('login', { code });
    TK = r.token;
    sessionStorage.setItem('um_t', TK);
    localStorage.setItem('um_api', API);
    if (r.state && BD == ist()) { ST = r.state; draw(); } else await load();   // login brings the first screen's data with it
  } catch (e) { gate(e.message); }
}

function lock() {
  TK = ''; sessionStorage.removeItem('um_t');
  BD = ist(); Q = {}; EO = ''; EDISC = ''; EPAY = 'Cash'; EID = ''; ED = {}; RD = null;
  gate();
}