/* Namma MOI v301 — google.script.run compatibility bridge for own-domain frontend.
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
  var TOKEN_KEY = 'nmOptionBAccessToken';
  var TOKEN_EXPIRY_KEY = 'nmOptionBTokenExpiry';

  function restoreSessionToken() {
    try {
      var t = sessionStorage.getItem(TOKEN_KEY) || '';
      var e = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
      if (t && e && Date.now() < (e - 360000)) { accessToken = t; tokenExpiry = e; return true; }
      sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch(_e) {}
    return false;
  }
  function persistSessionToken() {
    try { sessionStorage.setItem(TOKEN_KEY, accessToken); sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(tokenExpiry)); } catch(_e) {}
  }
  function clearSessionToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_EXPIRY_KEY); } catch(_e) {}
  }

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
  function authErrorText(err) {
    if (!err) return 'Google authorization முடியவில்லை.';
    var parts = [];
    if (err.type) parts.push('type=' + err.type);
    if (err.error) parts.push('error=' + err.error);
    if (err.error_description) parts.push(err.error_description);
    if (err.message && parts.indexOf(err.message) < 0) parts.push(err.message);
    return parts.length ? ('Google sign-in error: ' + parts.join(' · ')) : 'Google authorization முடியவில்லை.';
  }
  function showAuthError(err) {
    try { console.error('[NammaMoi Option B OAuth]', err); } catch(_e) {}
    setGateMessage(authErrorText(err), true);
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
          showAuthError(resp || {message:'No OAuth access token returned'});
          return;
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (Number(resp.expires_in || 3600) * 1000);
        persistSessionToken();
        hideGate();
        drainQueue();
      },
      error_callback: function(err) {
        authInFlight = false;
        showAuthError(err || {message:'Google Identity Services popup error'});
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
    try { tokenClient.requestAccessToken({prompt: ''}); }
    catch(e) { authInFlight=false; showAuthError(e); }
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
        // Do not auto-start OAuth again here. On mobile this can create a
        // Google -> app -> Google permission loop that hides the real API
        // authorization failure. Surface the 401 and let the user retry
        // explicitly from the auth gate instead.
        accessToken=''; tokenExpiry=0; clearSessionToken();
        ensureGate().style.display='flex';
        setGateMessage('Apps Script API authorization 401. Google permission loop நிறுத்தப்பட்டது. Continue with Google மூலம் ஒருமுறை retry செய்யவும்.', true);
        var authErr = normalizeApiError(data, response.status);
        authErr.code = 401;
        throw authErr;
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
    clearToken: function(){ accessToken=''; tokenExpiry=0; clearSessionToken(); ensureGate().style.display='flex'; },
    isConfigured: configured
  };

  // Mobile browsers can occasionally return focus to the page after the
  // Google account/2-step flow without delivering a token callback. Do not
  // leave the UI permanently stuck in an in-flight state; surface that exact
  // condition so it can be distinguished from a backend/CORS failure.
  window.addEventListener('focus', function(){
    if (!authInFlight || hasFreshToken()) return;
    setTimeout(function(){
      if (!authInFlight || hasFreshToken()) return;
      authInFlight = false;
      showAuthError({type:'oauth_returned_without_token', message:'Google sign-in முடிந்தது, ஆனால் access token app-க்கு திரும்பவில்லை. Retry செய்யவும்.'});
    }, 2500);
  });

  document.addEventListener('DOMContentLoaded', function(){
    // Always show an explicit manual auth path on cold load. Silent token
    // acquisition may be blocked or delayed by browser privacy settings,
    // but the user must never be left waiting without a visible action.
    ensureGate();
    if (!configured()) {
      setGateMessage('Option B setup pending: credentials configure செய்ய வேண்டும்.', true);
    } else if (restoreSessionToken()) {
      hideGate();
      drainQueue();
    } else {
      setGateMessage('Google கணக்குடன் இணைக்கவும்', false);
    }
  });
})();
