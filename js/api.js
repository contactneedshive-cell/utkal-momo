/* Talks to the Google Apps Script web app (the Google Sheet backend). */
async function call(action, data = {}) {
  const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action, token: TK, ...data }) });
  const j = await res.json();
  if (j.error == 'AUTH') { lock(); throw Error('Session expired. Enter the access code again.'); }
  if (j.error) throw Error(j.error);
  return j;
}

/* Run a save action: disables the button, reloads data, shows a message. Returns true on success. */
async function act(btn, action, data, okMessage) {
  if (btn) btn.disabled = true;
  try { await call(action, data); await load(); toast(okMessage); return true; }
  catch (e) { toast(e.message, 1); return false; }
  finally { if (btn) btn.disabled = false; }
}