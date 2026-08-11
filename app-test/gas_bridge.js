/* Namma MOI v296 — google.script.run compatibility bridge for own-domain frontend.
 * Keeps the existing client modules unchanged while replacing HTML-Service's
 * built-in google.script.run transport with Apps Script API scripts.run.
 */
(function () {
  'use strict';
  var cfg = window.NAMMAMOI_OPTION_B || {};
  var accessToken = '';
  var tokenExpiry = 0;
  var tokenClient = null;
  var authInFlight = false;
  var queue = [];

  function configured() {
    return cfg.CLIENT_ID && cfg.SCRIPT_DEPLOYMENT_ID &&
      cfg.CLIENT_ID.indexOf('PASTE_') !== 0 &&
      cfg.SCRIPT_DEPLOYMENT_ID.indexOf('PASTE_') !== 0;
  }
  function scopes() {
    return (cfg.OAUTH_SCOPES || []).filter(Boolean).join(' ');
  }
  function hasFreshToken() {
    return !!accessToken && Date.now() < (tokenExpiry - 360000); // refresh >=6 min early
  }
  function ensureGate() {
    var gate = document.getElementById('nmOptionBAuthGate');
    if (gate) return gate;
    gate = document.createElement('div');
    gate.id = 'nmOptionBAuthGate';
    gate.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fffaf7;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif';
    gate.innerHTML = '<div style="width:min(390px,100%);background:#fff;border:1px solid #ead9d0;border-radius:18px;padding:24px;box-shadow:0 12px 38px rgba(70,15,30,.14);text-align:center">' +
      '<div style="font-size:26px;font-weight:800;color:#681126;margin-bottom:8px">நம்ம மொய்</div>' +
      '<div id="nmOptionBAuthMsg" style="font-size:14px;line-height:1.6;color:#555;margin-bottom:16px">Google கணக்குடன் இணைக்கவும்</div>' +
      '<button id="nmOptionBAuthBtn" type="button" style="width:100%;border:0;border-radius:12px;padding:13px 16px;background:#681126;color:white;font-size:15px;font-weight:700">Continue with Google</button>' +
      '<div style="font-size:11px;color:#777;margin-top:12px">Own-domain secure connection</div></div>';
    document.body.appendChild(gate);
    gate.querySelector('#nmOptionBAuthBtn').addEventListener('click', function(){ requestToken(true); });
    return gate;
  }
  function setGateMessage(msg, isError) {
    var gate = ensureGate();
    var el = gate.querySelector('#nmOptionBAuthMsg');
    if (el) { el.textContent = msg; el.style.color = isError ? '#b42318' : '#555'; }
  }
  function hideGate() {
    var gate = document.getElementById('nmOptionBAuthGate');
    if (gate) gate.style.display = 'none';
  }
  function initTokenClient() {
    if (tokenClient || !window.google || !google.accounts || !google.accounts.oauth2) return !!tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cfg.CLIENT_ID,
      scope: scopes(),
      callback: function(resp) {
        authInFlight = false;
        if (!resp || resp.error || !resp.access_token) {
          setGateMessage((resp && (resp.error_description || resp.error)) || 'Google authorization முடியவில்லை.', true);
          return;
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (Number(resp.expires_in || 3600) * 1000);
        hideGate();
        drainQueue();
      },
      error_callback: function(err) {
        authInFlight = false;
        setGateMessage((err && (err.message || err.type)) || 'Google authorization முடியவில்லை.', true);
      }
    });
    return true;
  }
  function requestToken(interactive) {
    if (!configured()) {
      setGateMessage('Option B setup pending: OAuth Client ID + API Executable Deployment ID configure செய்ய வேண்டும்.', true);
      return;
    }
    if (authInFlight) return;
    if (!initTokenClient()) {
      setGateMessage('Google authorization service ஏற்றுகிறது…', false);
      setTimeout(function(){ requestToken(interactive); }, 250);
      return;
    }
    authInFlight = true;
    try { tokenClient.requestAccessToken({prompt: interactive ? 'consent' : ''}); }
    catch(e) { authInFlight=false; setGateMessage(e.message || 'Authorization error', true); }
  }
  function queueCall(call) {
    queue.push(call);
    ensureGate();
    if (!configured()) {
      setGateMessage('Option B setup pending: optionb_config.js-ல் credentials configure செய்ய வேண்டும்.', true);
      return;
    }
    if (!hasFreshToken()) requestToken(false);
    else drainQueue();
  }
  function normalizeApiError(data, httpStatus) {
    var detail = data && data.error && data.error.details && data.error.details[0];
    var msg = (detail && detail.errorMessage) ||
      (data && data.error && data.error.message) ||
      ('Apps Script API error' + (httpStatus ? ' ('+httpStatus+')' : ''));
    var err = new Error(msg);
    err.raw = data;
    return err;
  }
  async function execute(call) {
    try {
      if (!hasFreshToken()) { queue.unshift(call); requestToken(false); return; }
      var url = 'https://script.googleapis.com/v1/scripts/' + encodeURIComponent(cfg.SCRIPT_DEPLOYMENT_ID) + ':run';
      var response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          function: call.fn,
          parameters: call.args || [],
          devMode: !!cfg.DEV_MODE
        })
      });
      var data = await response.json().catch(function(){ return {}; });
      if (response.status === 401) {
        accessToken=''; tokenExpiry=0; queue.unshift(call); requestToken(false); return;
      }
      if (!response.ok || data.error) throw normalizeApiError(data, response.status);
      var result = data && data.response ? data.response.result : undefined;
      if (typeof call.success === 'function') call.success(result, call.userObject);
    } catch(e) {
      if (typeof call.failure === 'function') call.failure(e, call.userObject);
      else console.error('[NammaMoi Option B]', call.fn, e);
    }
  }
  function drainQueue() {
    if (!hasFreshToken()) return;
    var pending = queue.splice(0, queue.length);
    pending.forEach(execute);
  }
  function makeRunner(state) {
    state = state || {};
    return new Proxy({}, {
      get: function(_target, prop) {
        if (prop === 'withSuccessHandler') return function(fn){ var s=Object.assign({},state,{success:fn}); return makeRunner(s); };
        if (prop === 'withFailureHandler') return function(fn){ var s=Object.assign({},state,{failure:fn}); return makeRunner(s); };
        if (prop === 'withUserObject') return function(obj){ var s=Object.assign({},state,{userObject:obj}); return makeRunner(s); };
        if (prop === 'then') return undefined;
        return function(){
          queueCall({fn:String(prop), args:Array.prototype.slice.call(arguments), success:state.success, failure:state.failure, userObject:state.userObject});
        };
      }
    });
  }

  // Preserve Google Identity Services namespace and add only script.run.
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner();

  window.NammaMoiOptionB = {
    requestGoogleAccess: function(){ requestToken(true); },
    clearToken: function(){ accessToken=''; tokenExpiry=0; ensureGate().style.display='flex'; },
    isConfigured: configured
  };

  document.addEventListener('DOMContentLoaded', function(){
    // Always show an explicit manual auth path on cold load. Silent token
    // acquisition may be blocked or delayed by browser privacy settings,
    // but the user must never be left waiting without a visible action.
    ensureGate();
    if (!configured()) {
      setGateMessage('Option B setup pending: credentials configure செய்ய வேண்டும்.', true);
    } else {
      setGateMessage('Google கணக்குடன் இணைக்கவும்', false);
    }
  });
})();
