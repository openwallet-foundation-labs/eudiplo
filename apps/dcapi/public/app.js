// ---------- On-screen console ----------
let autoScroll = true;

function $(sel){ return document.querySelector(sel); }
function now(){ return new Date().toISOString().replace('T',' ').replace('Z',''); }

function fmtArg(arg){
  try {
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack||''}`;
    if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
    return String(arg);
  } catch { return String(arg); }
}

function writeLine(level, ...args){
  const c = $('#console'); if(!c) return;
  const p = document.createElement('div'); p.className = `ln ${level}`;
  const ts = document.createElement('span'); ts.className = 'ts'; ts.textContent = now();
  const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = level.toUpperCase();
  const msg = document.createElement('span');
  msg.textContent = ' ' + args.map(fmtArg).join(' ');
  p.appendChild(ts); p.appendChild(tag); p.appendChild(msg);
  c.appendChild(p);
  if (autoScroll) c.scrollTop = c.scrollHeight;
}

(function hookConsole(){
  const _log=console.log,_warn=console.warn,_err=console.error,_info=console.info;
  console.log=(...a)=>{ _log(...a); writeLine('log',...a); };
  console.warn=(...a)=>{ _warn(...a); writeLine('warn',...a); };
  console.error=(...a)=>{ _err(...a); writeLine('error',...a); };
  console.info=(...a)=>{ _info(...a); writeLine('log',...a); };
  window._uiConsole = {
    clear(){ $('#console').innerHTML=''; },
    copy(){
      const text = Array.from($('#console').querySelectorAll('.ln'))
        .map(n=>n.textContent).join('\n');
      navigator.clipboard.writeText(text).then(()=>writeLine('ok','Copied console to clipboard'));
    },
    toggleScroll(btn){
      autoScroll = !autoScroll;
      btn.textContent = autoScroll ? 'Autoscroll: ON' : 'Autoscroll: OFF';
    }
  };
})();

// ---------- App logic ----------
async function requestCredential(){
  const btn = $('#btn'); const badge = $('#status');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Requesting…';
  badge.textContent = 'Working…';

  try {
    // Call Worker endpoint for sensitive logic
    console.log('Requesting credential from backend…');
    const res = await fetch('/api/request-credential');
    if (!res.ok) throw new Error("Failed to get credential request from backend");
    const { uri, session } = await res.json();
    console.log('Backend response:', { uri, session });

    const url = new URL(uri.replace("openid4vp://?", "https://dummy?"));
    const requestUri = url.searchParams.get("request_uri");
    const method = (url.searchParams.get("request_uri_method") || "GET").toUpperCase();
    console.log('Resolving request_uri…', { requestUri, method });

    const reqFetch = await fetch(decodeURIComponent(requestUri), {
      method,
      headers: { "Accept": "application/oauth-authz-req+jwt, application/jwt, text/plain, application/json" }
    });
    if (!reqFetch.ok) throw new Error(`Failed to fetch request object (${reqFetch.status})`);
    let raw = (await reqFetch.text() || "").trim();
    let requestJwt = raw;
    if (!raw.includes(".")) {
      try {
        const asJson = JSON.parse(raw);
        requestJwt = asJson.request || asJson.request_object || asJson.jwt || "";
      } catch { /* keep raw */ }
    }
    if (typeof requestJwt !== "string" || requestJwt.split(".").length < 3) {
      throw new Error("Resolved request object is not a JWT");
    }
    console.log('Request JWS (first 120 chars):', requestJwt.slice(0,120) + '…');

    if (!("credentials" in navigator) || !("get" in navigator.credentials) || !("DigitalCredential" in window)) {
      console.warn("Digital Credentials API not available — handing off via deep link.");
      window.location.href = uri;
      return;
    }

    console.log('Calling Digital Credentials API (signed)…');
    const dcResponse = await navigator.credentials.get({
      mediation: "required",
      digital: { requests: [{ protocol: "openid4vp-v1-signed", data: { request: requestJwt } }] }
    });

    console.log('Wallet/DC-API raw response:', dcResponse);
    if (dcResponse?.data?.error) {
      console.error('Wallet protocol error:', dcResponse.data.error, dcResponse.data);
      throw new Error(dcResponse.data.error);
    }

    // Submit VP to verifier backend (still safe to do from frontend)
    const instance = "https://service.eudi-wallet.dev";
    console.log('Submitting VP to verifier backend…');
    const submitRes = await fetch(`${instance}/${session}/oid4vp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dcResponse.data, sendResponse: true })
    });
    const verified = await submitRes.json();
    console.log('Verifier response:', verified);

    // Show verified values on screen
    $('#verified').innerHTML = `<div class="badge">Verified</div>`;
    $('#verified-json').textContent = JSON.stringify(verified, null, 2);

    badge.textContent = 'Done';
    writeLine('ok', 'Presentation submitted & verified.');
  } catch (err) {
    console.error(err);
    const msg = err?.message || String(err);
    $('#verified').innerHTML = `<span class="badge" style="background:#2a0d0f;color:#fecaca;border-color:#3b0f12">Error</span>`;
    $('#verified-json').textContent = msg;
  } finally {
    const btnEl = $('#btn');
    btnEl.disabled = false; btnEl.textContent = 'Request Credential';
  }
}

// ---------- Wire up UI ----------
window.addEventListener('DOMContentLoaded', () => {
  $('#btn').addEventListener('click', requestCredential);
  $('#btn-clear').addEventListener('click', () => window._uiConsole.clear());
  $('#btn-copy').addEventListener('click', () => window._uiConsole.copy());
  $('#btn-autoscroll').addEventListener('click', (e) => window._uiConsole.toggleScroll(e.currentTarget));
});