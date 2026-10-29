/* Talks to the Google Apps Script web app (the Google Sheet backend). */
async function call(action, data = {}) {
  const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action, token: TK, sd: BD, ...data }) });
  const j = await res.json();
  if (j.error == 'AUTH') { lock(); throw Error('Session expired. Enter the access code again.'); }
  if (j.error) throw Error(j.error);
  return j;
}

/* Save actions come back with fresh numbers attached: use them, so no second trip to the sheet is needed. */
async function apply(r) {
  if (r && r.state) { ST = r.state; draw(); } else await load();
}

/* Run a save action: disables the button, shows the result, shows a message. Returns true on success. */
async function act(btn, action, data, okMessage) {
  if (btn) btn.disabled = true;
  try { const r = await call(action, data); await apply(r); toast(okMessage); return true; }
  catch (e) { toast(e.message, 1); return false; }
  finally { if (btn) btn.disabled = false; }
}