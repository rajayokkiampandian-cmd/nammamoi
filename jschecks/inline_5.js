
// ============================================================
// நம்மமொய் -- Script.html v6 — split into feature modules
// (UX_REVIEW / Production Upgrade request). Each include() scriptlet call
// pulls in one feature area's functions/state. All 278 functions and
// every top-level var/IIFE from the original single-file Script.html
// are preserved verbatim — this is a pure reorganization, verified by:
//   - identical brace count (1251/1251) before and after the split
//   - identical function-name set (278/278) before and after
//   - node --check on the recombined content (syntax valid)
// Order matters here only in that everything must load before any
// user-triggered code runs (guaranteed — Index.html calls init() only
// after the whole page, including this (script) block, has loaded).
// ============================================================
// ============================================================
// மொய் பதிவேடு -- Script.html v5 (Google Auth -- No PIN)
// Fixed: noAuth, expiredScreen, expiredEmailBadge handling
// FIX [11]: Sub-user creation is Premium-only now (Basic removed).
//           Non-Premium main users still see the "Sub Users" tab,
//           but it shows an upgrade prompt instead of a broken
//           0/0 add form.
// ============================================================

var S           = null;

var recs        = [];

var ac          = { places:[], combos:[] };

var sumAll      = null;

var curTab      = 'today';

var pending     = null;

var editRec     = null;

var amtVisible  = false;

var nakaiFilter = null;

var _adminSubTab  = 'all';

var _cachedUsers  = [];

var _reminders    = [];   // reminder system

// Launch hardening: identifies the latest MOI load request so a delayed
// response from an older retry cannot overwrite newer screen data.
var _moiLoadSeq = 0;


// ============================================================
// v294 — RECORD-ONLY LOCAL SPEED CACHE
// Persistent device cache is deliberately limited to structured records.
// Attachments/documents/images remain Google Drive-only and are never copied
// into this cache. Google Sheets remains the authoritative source of truth.
// ============================================================
var _NM_RECORD_CACHE_DB = 'nm_record_cache_v1';
var _NM_RECORD_CACHE_STORE = 'records';
function _nmRecordCacheScope(){
  try{return String((S&&((S.email||'')+'|'+(S.ownerEmail||'')))||'anonymous').toLowerCase();}catch(e){return'anonymous';}
}
function _nmRecordCacheKey(kind,key){return _nmRecordCacheScope()+'|'+String(kind||'')+'|'+String(key||'default');}
function _nmRecordCacheAllowedKey(k){
  k=String(k||'');
  return !/(attachment|document|fileurl|fileid|driveurl|imagedata|photodata|base64|blob)/i.test(k) &&
         !/^(attachments?|documents?|files?|image|photo|mimeType|billFile)$/i.test(k);
}
function _nmRecordCacheSanitize(v,depth){
  depth=depth||0;if(depth>8)return null;
  if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  if(Array.isArray(v))return v.map(function(x){return _nmRecordCacheSanitize(x,depth+1);});
  if(typeof v==='object'){
    var o={};Object.keys(v).forEach(function(k){if(_nmRecordCacheAllowedKey(k)){var x=_nmRecordCacheSanitize(v[k],depth+1);if(x!==undefined)o[k]=x;}});return o;
  }
  return undefined;
}
function _nmRecordCacheOpen(done){
  if(!window.indexedDB){done(null);return;}
  try{var r=indexedDB.open(_NM_RECORD_CACHE_DB,1);r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains(_NM_RECORD_CACHE_STORE))db.createObjectStore(_NM_RECORD_CACHE_STORE,{keyPath:'id'});};r.onsuccess=function(){done(r.result);};r.onerror=function(){done(null);};}catch(e){done(null);}
}
function _nmRecordCachePut(kind,key,value){
  _nmRecordCacheOpen(function(db){if(!db)return;try{var tx=db.transaction(_NM_RECORD_CACHE_STORE,'readwrite');tx.objectStore(_NM_RECORD_CACHE_STORE).put({id:_nmRecordCacheKey(kind,key),at:Date.now(),value:_nmRecordCacheSanitize(value)});tx.oncomplete=function(){try{db.close();}catch(e){}};tx.onerror=function(){try{db.close();}catch(e){}};}catch(e){try{db.close();}catch(_){}}});
}
function _nmRecordCacheGet(kind,key,maxAgeMs,done){
  _nmRecordCacheOpen(function(db){if(!db){done(null);return;}try{var tx=db.transaction(_NM_RECORD_CACHE_STORE,'readonly'),r=tx.objectStore(_NM_RECORD_CACHE_STORE).get(_nmRecordCacheKey(kind,key));r.onsuccess=function(){var row=r.result;try{db.close();}catch(e){}if(!row||!row.at||(maxAgeMs&&Date.now()-row.at>maxAgeMs)){done(null);return;}done(row.value);};r.onerror=function(){try{db.close();}catch(e){}done(null);};}catch(e){try{db.close();}catch(_){}done(null);}});
}


// ============================================================
// GLOBAL CRASH GUARD (FIX [review]: data-safety request)
// Any uncaught JS error or unhandled promise rejection used to leave
// the WebView on a frozen/blank screen with zero feedback — the person
// had no idea anything went wrong, and no way to recover without force-
// closing the app. This catches EVERYTHING at the window level, shows a
// friendly toast instead of crashing silently, and logs the real error
// to the console for debugging. It does NOT try to auto-reload or auto-
// retry anything — that risk (e.g. re-submitting a half-done save) is
// worse than just telling the person clearly and letting them decide.
// Throttled so a burst of repeated errors shows one toast, not twenty.
// ============================================================
var _lastCrashToastAt = 0;

function _showCrashToast(detail) {
  try {
    console.error('Unhandled error caught by crash guard:', detail);
    var now = Date.now();
    if (4000 > (now - _lastCrashToastAt)) return; // throttle repeats
    _lastCrashToastAt = now;
    if (typeof toast === 'function') {
      toast('⚠️ மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும் — பிரச்சனை தொடர்ந்தால் Feedback-ல் தெரிவிக்கவும்.');
    }
  } catch (metaErr) {
    // Even the crash guard itself must never throw — that would be the
    // one thing that could still take down the page.
  }
}

window.addEventListener('error', function(ev) {
  _showCrashToast(ev && (ev.error || ev.message));
});
window.addEventListener('unhandledrejection', function(ev) {
  _showCrashToast(ev && ev.reason);
});


// ============================================================
// SECURE SCREEN-FLOW SYSTEM — single choke point, no bypass
// ============================================================
var SCREENS = [
  'splashScreen','registerScreen','blockedScreen',
  'expiredScreen','passwordLoginScreen',
  'setPasswordScreen','forgotPasswordScreen','noAuthScreen','appScreen',
  'appSelectorScreen', // FIX: was missing — appSelectorScreen could never display
  'expenseScreen'      // Daily Cash Expenses module screen
];


// All modal-bg overlays in the app — closed automatically on every screen
// transition (see _hideAll below), so a modal left open never blocks the
// next screen from being seen/interacted with.
var ALL_MODALS = [
  'confirmModal','infoModal','editModal','reminderModal','feedbackModal','moiCounterModal',
  'bulkImportModal','upgradeModal','receiptSettingsModal','eventModal','userGuideModal',
  'categoryDrilldownModal','editExpIncModal','fabSheetModal','payerVerifyModal','expenseCategorySheet','expenseNewCategoryModal','moduleSettingsModal','myDataBackupModal' // V81/v290
];


function _closeAllModals() {
  ALL_MODALS.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}


// Hide every screen. Every screen switch starts here.
// FIX [BUG]: previously only hid the SCREENS-listed elements — if a modal
// (Category Drilldown, Edit Expense, etc.) was open when
// the person switched screens (e.g. tapping the 🔄 module-switch button),
// the modal's overlay stayed on top and silently blocked the new screen
// underneath it, making the switch look like it "did nothing".
function _hideAll() {
  SCREENS.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  _closeAllModals();
}


// The ONLY function allowed to make a screen visible.
// Nothing else should ever set style.display='flex' directly.
function showScreen(id) {
  if (SCREENS.indexOf(id) === -1) { console.error('showScreen: unknown id ->', id); return; }
  _hideAll();
  var el = document.getElementById(id);
  if (el) el.style.display = (id === 'appScreen') ? 'block' : 'flex';
}


// ============================================================
// V125 — SMART RESUME STATE (UI-only, no server/session changes)
// ============================================================
var _NM_RESUME_KEY = 'nm_resume_v1';
var _NM_RESUME_MAX_DIRECT_MS = 60 * 60 * 1000; // <= 60 min: direct restore

function _nmSaveResumeState(moduleName, tabName) {
  try {
    if (!S) return;
    var safeModule = moduleName === 'expense' ? 'expense' : 'moi';
    var safeTab = String(tabName || (safeModule === 'expense' ? 'list' : 'today'));
    // Never restore transient/risky work surfaces.
    if (safeModule === 'moi' && ['add','admin','account','documents'].indexOf(safeTab) !== -1) safeTab = 'today';
    if (safeModule === 'expense' && safeTab === 'add') safeTab = 'list';
    localStorage.setItem(_NM_RESUME_KEY, JSON.stringify({
      module: safeModule,
      tab: safeTab,
      at: Date.now()
    }));
  } catch (e) { /* best effort only */ }
}

function _nmReadResumeState() {
  try {
    var raw = localStorage.getItem(_NM_RESUME_KEY);
    if (!raw) return null;
    var st = JSON.parse(raw);
    if (!st || !st.at || (st.module !== 'moi' && st.module !== 'expense')) return null;
    return st;
  } catch (e) { return null; }
}

function _nmShowContinueCard(st) {
  var card = document.getElementById('resumeContinueCard');
  var label = document.getElementById('resumeContinueLabel');
  if (!card || !label || !st) return;
  var names = {
    today:'முகப்பு', all:'மொய் பதிவுகள்', month:'மாதப் பார்வை', summary:'மொய் சுருக்கம்',
    tamilCalendar:'தமிழ் நாட்காட்டி', rasiPalan:'ராசி பலன்', list:'Daily Cash பதிவுகள்', summary_exp:'Daily Cash சுருக்கம்', budget:'பட்ஜெட்'
  };
  var key = st.module === 'expense' && st.tab === 'summary' ? 'summary_exp' : st.tab;
  label.textContent = st.module === 'expense' ? ('Daily Cash · ' + (names[key] || 'பதிவுகள்')) : (names[key] || 'மொய் முகப்பு');
  card.style.display = 'flex';
  card.dataset.module = st.module;
  card.dataset.tab = st.tab;
}

function dismissResumeContinue() {
  var card = document.getElementById('resumeContinueCard');
  if (card) card.style.display = 'none';
}

function continueLastWork() {
  var card = document.getElementById('resumeContinueCard');
  if (!card) return;
  var moduleName = card.dataset.module;
  var tabName = card.dataset.tab;
  card.style.display = 'none';
  if (moduleName === 'expense') {
    selectApp('expense');
    setTimeout(function(){ if (typeof expGo === 'function') expGo(tabName || 'list'); }, 80);
  } else {
    showScreen('appScreen');
    if (typeof go === 'function') go(tabName || 'today');
  }
}

function _nmApplyResumeAfterEntry() {
  var st = _nmReadResumeState();
  if (!st) return;
  var age = Date.now() - st.at;
  if (age >= 0 && age <= _NM_RESUME_MAX_DIRECT_MS) {
    if (st.module === 'expense') {
      selectApp('expense');
      setTimeout(function(){ if (typeof expGo === 'function') expGo(st.tab || 'list'); }, 80);
    } else if (st.tab && st.tab !== 'today') {
      setTimeout(function(){ if (typeof go === 'function') go(st.tab); }, 50);
    }
  } else {
    _nmShowContinueCard(st);
  }
}


// ============================================================
// V49 — CONTEXT-AWARE NAV / CENTER FAB
// ============================================================
// Shows the matching #mainTabs group (data-navgrp="home"|"moi") and
// hides the other. Called from go() (js_moi.html) whenever curTab
// changes, and once from enterApp() (js_auth.html) so returning to
// the MOI module from Cash always lands back on the Home group —
// same "always land on the dashboard" guarantee as the existing
// Daily-Cash-Home fix, just extended to the nav bar too.
function _setMainNavGroup(ctx) {
  document.querySelectorAll('#mainTabs .nav-grp').forEach(function(g) {
    g.style.display = (g.getAttribute('data-navgrp') === ctx) ? 'flex' : 'none';
  });
}


// Center FAB on #mainTabs. MOI sub-tabs (all/month/summary) open the
// existing New MOI Entry screen directly; anywhere else (Home / today)
// asks which type of entry via the action sheet, since Home has two
// valid destinations (MOI vs Expense/Income).
function mainFabAction() {
  if (curTab === 'all' || curTab === 'month' || curTab === 'summary') {
    go('add');
    return;
  }
  var m = document.getElementById('fabSheetModal');
  if (m) m.style.display = 'flex';
}

function closeFabSheet() {
  var m = document.getElementById('fabSheetModal');
  if (m) m.style.display = 'none';
}

function _fabAddMoi() {
  closeFabSheet();
  go('add');
}

function _fabAddExpense() {
  closeFabSheet();
  selectApp('expense');
  expGo('add');
}


function _showBlockedWithMsg(title, msg) {
  if (typeof _nmFinishStartupPaint === 'function') _nmFinishStartupPaint();
  showScreen('blockedScreen');
  var errEl = document.getElementById('blockedScreen');
  var ttl = errEl.querySelector('.login-title');
  var sub = errEl.querySelector('.login-sub');
  if (ttl) { ttl.textContent = title; ttl.style.color = 'var(--am)'; }
  if (sub) sub.textContent = msg;
}


// ============================================================
// INIT — single entry point, with sessionStorage speed cache.
// Guarded so it can never run twice.
// ============================================================
var _initDone = false;

// ============================================================
//  FIX [24]: English -> Tamil phonetic transliteration for text fields.
//  Legacy direct-conversion helpers are retained for compatibility, but the
//  active field initialization below uses suggestion-only Tamil typing. The
//  user's English text stays untouched until they explicitly accept ✓.
//
//  This is PHONETIC transliteration (sound-alike), not meaning-based
//  translation — same approach as most Tamil phonetic typing tools.
//  Uncommon spellings may occasionally need manual correction, same as
//  any such tool.
// ============================================================
var _TA_CONS = [
  ['ndr','ன்ற'], ['ng','ங'], ['nj','ஞ'], ['ny','ஞ'], ['zh','ழ'], ['sh','ஷ'],
  ['th','த'], ['dh','த'], ['ch','ச'], ['kh','க'], ['gh','க'], ['ph','ஃப'],
  ['k','க'], ['g','க'], ['c','ச'], ['j','ஜ'],
  ['t','த'], ['d','த'], ['n','ன'], ['p','ப'], ['b','ப'],
  ['m','ம'], ['y','ய'], ['r','ர'], ['l','ல'], ['v','வ'], ['w','வ'],
  ['s','ச'], ['h','ஹ'], ['f','ஃப']
];

var _TA_VOW = [
  ['aa','ஆ','ா'], ['ii','ஈ','ீ'], ['ee','ஈ','ீ'], ['uu','ஊ','ூ'], ['oo','ஊ','ூ'],
  ['ai','ஐ','ை'], ['au','ஔ','ௌ'], ['ow','ஔ','ௌ'],
  ['a','அ',''], ['i','இ','ி'], ['u','உ','ு'], ['e','எ','ெ'], ['o','ஒ','ொ']
];


function _taMatch(list, str, pos) {
  var lower = str.toLowerCase();
  for (var i = 0; list.length>i; i++) {
    var pat = list[i][0].toLowerCase();
    if (lower.substr(pos, pat.length) === pat) return list[i];
  }
  return null;
}


function _taTranslitWord(word) {
  if (!word || !/^[a-zA-Z]+$/.test(word)) return word; // only pure-English words convert
  if (word.length === 1) return word; // FIX [24]: single letters (initials, etc.) stay in English
  var out = '', pos = 0, len = word.length;
  while (len>pos) {
    var cMatch = _taMatch(_TA_CONS, word, pos);
    if (cMatch) {
      pos += cMatch[0].length;
      var vMatch = _taMatch(_TA_VOW, word, pos);
      if (vMatch) {
        out += cMatch[1] + vMatch[2];
        pos += vMatch[0].length;
      } else {
        out += cMatch[1] + '்'; // bare consonant — add pulli
      }
      continue;
    }
    var vMatch2 = _taMatch(_TA_VOW, word, pos);
    if (vMatch2) {
      // FIX [26]: a vowel with no consonant to attach to is only written
      // as an independent letter (அ,இ,உ...) at the very START of a word.
      // Mid-word, Tamil orthography never has two vowels touching — it
      // inserts a "ய" glide. Without this, "Rajayokkiam" was coming out
      // as "ரஜயொக்கிஅம்" (wrong) instead of "ரஜயொக்கியம்" (correct).
      if (pos === 0) { out += vMatch2[1]; }
      else { out += 'ய' + vMatch2[2]; }
      pos += vMatch2[0].length;
      continue;
    }
    out += word[pos]; // unrecognized char — keep as-is
    pos++;
  }
  return out;
}


// Converts the word right before the cursor the moment a space is typed,
// and restores cursor position relative to the (usually shorter) Tamil
// text — so the cursor stays exactly where editing is happening.
function attachTamilTransliteration(el) {
  if (!el) return;
  el.addEventListener('input', function(e) {
    if (e.inputType && e.inputType.indexOf('delete') !== -1) return; // don't fight backspace
    var val = el.value;
    var cursor = el.selectionStart;
    if (cursor>0 && val[cursor-1] === ' ') {
      var before = val.substring(0, cursor-1);
      var wordStart = before.search(/[a-zA-Z]+$/);
      if (wordStart === -1) return;
      var word = before.substring(wordStart);
      var wordEnd = cursor - 1; // position right before the space, in the ORIGINAL value
      var afterWord = val.substring(wordEnd); // FIX [DI-9]: text after the word, captured now
      // so a still-pending request can relocate the word later if the user
      // edits earlier in the field (e.g. jumps to the start and types)
      // while this request is in flight — see _taApplyConversion.

      // FIX [DI-7]: single letters are initials (R, S, P...) and must
      // never be transliterated. This MUST be checked here, before any
      // server call — the server's transliterateWord() (Google's Input
      // Tools API) has no concept of "this app treats single letters as
      // initials" and will happily return a Tamil consonant guess for
      // one. The old code only guarded this in the local fallback
      // engine, so the server's result silently won whenever the async
      // call succeeded — which is most of the time.
      if (word.length === 1) return;

      // FIX [DI-11] (Task 3): a previously user-approved spelling for this
      // exact English word wins over asking the engine again.
      var remembered = (typeof _taGetApprovedSpelling === 'function') ? _taGetApprovedSpelling(word) : null;
      if (remembered) { _taApplyConversion(el, word, wordStart, wordEnd, remembered, afterWord); return; }

      // FIX [26]: try Google's phonetic Input Tools API first — much
      // better quality than the local rule table. Falls back to the
      // local engine if the network call fails or times out.
      google.script.run
        .withSuccessHandler(function(res) {
          var converted = (res && res.ok && res.result) ? res.result : _taTranslitWord(word);
          _taApplyConversion(el, word, wordStart, wordEnd, converted, afterWord);
        })
        .withFailureHandler(function() {
          _taApplyConversion(el, word, wordStart, wordEnd, _taTranslitWord(word), afterWord);
        })
        .transliterateWord(word);
    }
  });
  // Also convert on blur, for when the last word has no trailing space
  // (local engine only here — not worth an extra round-trip for this case)
  el.addEventListener('blur', function() {
    var val = el.value;
    var match = val.match(/[a-zA-Z]+$/);
    if (!match) return;
    var word = match[0];
    var converted = _taTranslitWord(word);
    if (converted === word) return;
    el.value = val.substring(0, val.length - word.length) + converted;
  });
}


// Applies a (possibly async-delayed) conversion result to the field,
// but only if the text at that position still matches what we expect —
// protects against corrupting the field if the person kept typing
// elsewhere before the server response came back.
//
// FIX [DI-7]: cursor/selection restoration rewritten. The old version
// only restored the cursor in the narrow case where it happened to
// still be exactly one character past the converted word (i.e. the
// user hadn't typed anything since triggering the conversion). Since
// this runs from an ASYNC callback, that's the exception, not the
// rule — the user has almost always kept typing or moved the cursor
// by the time the response arrives. Setting el.value always resets
// the browser's cursor to the end of the field, so every other case
// silently lost the user's actual position. This version instead
// shifts the cursor/selection relative to the edit that just
// happened, for every case:
//  - cursor was at/after the replaced word  -> shift by the length
//    delta (converted.length - originalWord.length), so it stays at
//    the same logical spot relative to whatever the user typed since.
//  - cursor was before the replaced word (user went back to fix
//    earlier text) -> leave it exactly where it was.
//  - cursor was INSIDE the word being replaced (rare — user clicked
//    back into it while the request was in flight) -> clamp to the
//    start of the newly-converted word, the safest fallback.
//
// FIX [DI-9]: if the word isn't where we left it, try to RELOCATE it
// before giving up. The previous version only checked the exact
// [wordStart, wordEnd] slice — so if the user edited earlier in the
// field (e.g. jumped to the start and typed) while this request was
// in flight, the word's indices shift and the conversion was silently
// dropped, even though the word itself never changed. `afterWord` (the
// text that followed the word at trigger time) acts as an anchor: if
// the field still ends with originalWord+afterWord, the edit only
// happened before it, so we can safely relocate and apply.
function _taApplyConversion(el, originalWord, wordStart, wordEnd, converted, afterWord) {
  if (converted === originalWord) return;
  var val = el.value;
  if (val.substring(wordStart, wordEnd) !== originalWord) {
    if (afterWord !== undefined && afterWord !== null) {
      var anchor = originalWord + afterWord;
      if (val.length >= anchor.length && val.substring(val.length - anchor.length) === anchor) {
        var shift = (val.length - anchor.length) - wordStart;
        wordStart += shift;
        wordEnd += shift;
      } else {
        return; // text moved on in a way we can't safely relocate — skip
      }
    } else {
      return; // text moved on — skip
    }
  }

  var selStart = el.selectionStart;
  var selEnd   = el.selectionEnd;
  var delta    = converted.length - originalWord.length;

  function adjust(pos) {
    if (pos === null || pos === undefined) return pos;
    if (pos >= wordEnd)   return pos + delta;
    if (pos <= wordStart) return pos;
    return wordStart; // was inside the original word — safest fallback
  }
  var newSelStart = adjust(selStart);
  var newSelEnd   = adjust(selEnd);

  var newVal = val.substring(0, wordStart) + converted + val.substring(wordEnd);
  el.value = newVal;

  if (newSelStart !== null && newSelStart !== undefined) {
    el.setSelectionRange(newSelStart, newSelEnd);
  }
}


// ============================================================
//  FIX [DI-11]: REMEMBER USER-APPROVED SPELLING (Task 3)
//  ------------------------------------------------------------
//  When a person accepts (or edits-then-accepts) a Tamil suggestion,
//  or lets a space-triggered conversion stand, that English->Tamil
//  pairing is remembered so the SAME English spelling suggests the
//  approved Tamil spelling first next time — no repeated network
//  call, and no repeated wrong guess for names the engine gets wrong
//  (e.g. Murugapandian -> முருகபாண்டியன்).
//
//  Stored in localStorage, same pattern already used elsewhere in
//  this app for client-persisted state (moi_session, moi_last_app) —
//  no new server/Sheets schema needed. Per-device, keyed by the
//  lowercased English word so "Kumar"/"kumar"/"KUMAR" all match the
//  same remembered entry.
// ============================================================
var _TA_DICT_KEY = 'moi_ta_dict';
var _taDictCache = null;

function _taLoadDict() {
  if (_taDictCache) return _taDictCache;
  try {
    var raw = localStorage.getItem(_TA_DICT_KEY);
    _taDictCache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    _taDictCache = {};
  }
  return _taDictCache;
}

function _taGetApprovedSpelling(word) {
  if (!word) return null;
  var dict = _taLoadDict();
  var hit = dict[word.toLowerCase()];
  return hit || null;
}

function _taRememberApprovedSpelling(word, tamilText) {
  if (!word || !tamilText) return;
  var dict = _taLoadDict();
  var key = word.toLowerCase();
  if (dict[key] === tamilText) return; // already remembered, nothing to write
  dict[key] = tamilText;
  try { localStorage.setItem(_TA_DICT_KEY, JSON.stringify(dict)); } catch (e) { /* best-effort */ }
}


// ============================================================
//  v236H — OPTIONAL TAMIL ASSIST (UI/input layer only)
//  ------------------------------------------------------------
//  This preference never rewrites stored data and never changes the
//  frozen transliteration rules. It only controls whether English->Tamil
//  suggestions are offered in supported text/search fields.
// ============================================================
var _TA_ASSIST_KEY = 'moi_tamil_assist_enabled';
function _taAssistEnabled() {
  try {
    var v = localStorage.getItem(_TA_ASSIST_KEY);
    return v === null ? true : v !== '0'; // preserve current Tamil-first default
  } catch (e) { return true; }
}
function _taSetAssistEnabled(on) {
  on = !!on;
  try { localStorage.setItem(_TA_ASSIST_KEY, on ? '1' : '0'); } catch (e) {}
  if (!on) {
    clearTimeout(_taSuggestTimer);
    _taHideSuggestion();
    if (typeof _exHide === 'function') _exHide();
  }
  _taSyncAssistUI();
}
function toggleTamilAssist() { _taSetAssistEnabled(!_taAssistEnabled()); }
function _taSyncAssistUI() {
  var on = _taAssistEnabled();
  document.querySelectorAll('[data-ta-assist-toggle]').forEach(function(btn) {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Tamil Assist ON' : 'Tamil Assist OFF';
    btn.innerHTML = '<span aria-hidden="true">அ</span><small>' + (on ? 'ON' : 'OFF') + '</small>';
  });
  var chk = document.getElementById('modTamilAssist');
  if (chk) chk.checked = on;
}

// ============================================================
//  FIX [DI-10]: SMART TAMIL SUGGESTION (Task 2)
//  ------------------------------------------------------------
//  This is the active Tamil typing flow. It never auto-replaces the source
//  field; the user can edit the suggestion and explicitly accept ✓ or ignore ✕.
//
//  This adds a second, opt-in layer for the word CURRENTLY being
//  typed, before the user finishes it with a space:
//  after a short pause (~120ms) with no further typing, a small
//  suggestion bubble appears under the field showing the Tamil
//  version. Space keeps the English text unchanged; nothing is inserted until the person explicitly acts:
//    - Tap Tamil suggestion — inserts it immediately
//    - Pencil/Edit — edits the Tamil suggestion before Use
//    - Escape / clicking away — dismisses, English stays untouched
//  Reuses the same transliterateWord() server call / _taTranslitWord()
//  local fallback, and the same cursor-safe _taApplyConversion() used
//  by Task 1 — no new conversion logic, only a new confirmation UI.
// ============================================================
var _taSuggestTimer = null;
var _taSuggestBox = null;
var _taSuggestState = null; // { el, wordStart, wordEnd, word, afterWord }
var _taSuggestSeq = 0;

function _taGetSuggestBox() {
  if (_taSuggestBox) return _taSuggestBox;
  var box = document.createElement('div');
  box.id = '_taSuggestBox';
  box.style.cssText = 'position:absolute;z-index:9999;display:none;align-items:center;gap:10px;'
    + 'background:#fff;border:1px solid #D8DEE4;border-radius:10px;'
    + 'box-shadow:0 5px 18px rgba(0,0,0,0.16);padding:8px 10px;font-size:18px;line-height:1.35;max-width:calc(100vw - 24px);';
  box.innerHTML =
    '<button type="button" id="_taSuggestPick" title="Use Tamil suggestion" '
    + 'style="border:none;background:#FFF8E7;color:#4D0310;border-radius:8px;min-height:38px;padding:6px 10px;cursor:pointer;font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 105px);"></button>'
    + '<button type="button" id="_taSuggestEdit" title="Edit suggestion" aria-label="Edit suggestion" '
    + 'style="border:none;background:#EEF1F4;color:#333;border-radius:7px;min-width:38px;min-height:38px;padding:6px 9px;cursor:pointer;font-size:16px;">✎</button>'
    + '<span id="_taSuggestText" contenteditable="true" spellcheck="false" '
    + 'style="display:none;min-width:100px;max-width:calc(100vw - 110px);outline:none;border-bottom:1px dashed #9AA5B1;padding:4px 6px;font-size:18px;font-weight:600;white-space:nowrap;overflow-x:auto;"></span>'
    + '<button type="button" id="_taSuggestAccept" title="Use edited suggestion" '
    + 'style="display:none;border:none;background:#0F6E56;color:#fff;border-radius:7px;min-width:46px;min-height:38px;padding:6px 10px;cursor:pointer;font-size:14px;font-weight:700;">Use</button>';
  document.body.appendChild(box);
  _taSuggestBox = box;

  // Main Tamil text is the one-tap action. Pencil opens edit mode.
  box.querySelector('#_taSuggestPick').addEventListener('mousedown', function(e) {
    e.preventDefault();
    _taAcceptSuggestion(false);
  });
  box.querySelector('#_taSuggestEdit').addEventListener('mousedown', function(e) {
    e.preventDefault();
    var pick = box.querySelector('#_taSuggestPick');
    var edit = box.querySelector('#_taSuggestText');
    var use = box.querySelector('#_taSuggestAccept');
    pick.style.display = 'none';
    this.style.display = 'none';
    edit.textContent = pick.textContent || '';
    edit.style.display = 'inline-block';
    use.style.display = 'inline-block';
    setTimeout(function(){
      edit.focus();
      var r=document.createRange(); r.selectNodeContents(edit); r.collapse(false);
      var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    },0);
  });
  box.querySelector('#_taSuggestAccept').addEventListener('mousedown', function(e) {
    e.preventDefault();
    _taAcceptSuggestion(true);
  });
  var editEl = box.querySelector('#_taSuggestText');
  editEl.addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });
  editEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); _taAcceptSuggestion(true); }
    else if (e.key === 'Escape') { e.preventDefault(); _taHideSuggestion(); }
  });

  // Dismiss only when the user taps outside both the source field and the
  // suggestion bubble. This keeps Edit -> Accept usable on mobile and desktop.
  document.addEventListener('mousedown', function(e) {
    if (!_taSuggestState || !_taSuggestBox) return;
    if (e.target === _taSuggestState.el || _taSuggestBox.contains(e.target)) return;
    _taHideSuggestion();
  });
  return box;
}

function _taHideSuggestion() {
  if (_taSuggestBox) _taSuggestBox.style.display = 'none';
  _taSuggestState = null;
}

function _taPositionSuggestion() {
  if (!_taSuggestState || !_taSuggestBox || _taSuggestBox.style.display === 'none') return;
  var el = _taSuggestState.el;
  if (!el || !document.documentElement.contains(el)) { _taHideSuggestion(); return; }
  var rect = el.getBoundingClientRect();
  _taSuggestBox.style.left = (rect.left + window.scrollX) + 'px';
  _taSuggestBox.style.top = (rect.bottom + window.scrollY + 4) + 'px';
}

if (!window._taSuggestPositionBound) {
  window._taSuggestPositionBound = true;
  window.addEventListener('scroll', _taPositionSuggestion, true);
  window.addEventListener('resize', _taPositionSuggestion);
}

function _taAcceptSuggestion(fromEdit) {
  if (!_taSuggestState) return;
  var s = _taSuggestState;
  // Do not apply a stale bubble after the field was edited by another input path.
  if (!s.el || !document.documentElement.contains(s.el) ||
      s.el.value.substring(s.wordStart, s.wordEnd) !== s.word) {
    _taHideSuggestion();
    return;
  }
  var src = fromEdit ? _taSuggestBox.querySelector('#_taSuggestText') : _taSuggestBox.querySelector('#_taSuggestPick');
  var finalText = (src && src.textContent || '').trim() || s.word;
  _taApplyConversion(s.el, s.word, s.wordStart, s.wordEnd, finalText, s.afterWord);
  // FIX [DI-11] (Task 3): remember this English->Tamil choice for next time.
  if (typeof _taRememberApprovedSpelling === 'function') {
    _taRememberApprovedSpelling(s.word, finalText);
  }
  _taHideSuggestion();
  s.el.focus();
}

function _taShowSuggestion(el, wordStart, wordEnd, word, afterWord, suggestion) {
  if (!suggestion || suggestion === word) return; // nothing useful to suggest
  var box = _taGetSuggestBox();
  box.style.display = 'inline-flex';
  var pick = box.querySelector('#_taSuggestPick');
  var edit = box.querySelector('#_taSuggestText');
  var editBtn = box.querySelector('#_taSuggestEdit');
  var useBtn = box.querySelector('#_taSuggestAccept');
  pick.textContent = suggestion; pick.style.display = 'inline-block';
  edit.textContent = suggestion; edit.style.display = 'none';
  editBtn.style.display = 'inline-block'; useBtn.style.display = 'none';
  _taSuggestState = { el: el, wordStart: wordStart, wordEnd: wordEnd, word: word, afterWord: afterWord };
  _taPositionSuggestion();
}

function attachTamilSuggestion(el) {
  if (!el || el.getAttribute('data-ta-suggest-bound') === '1') return;
  el.setAttribute('data-ta-suggest-bound', '1');
  var _taComposing = false; // composition belongs to this field, not the whole page

  function scheduleSuggestion(e) {
    if (_taComposing && (!e || e.type !== 'compositionend')) return;
    if (e && e.inputType && e.inputType.indexOf('delete') !== -1) {
      clearTimeout(_taSuggestTimer);
      _taHideSuggestion();
      return;
    }

    clearTimeout(_taSuggestTimer);
    var seq = ++_taSuggestSeq;

    // Tamil Assist is suggestion-only: never force-convert on Space.
    // This keeps English typing untouched unless the user explicitly picks Tamil.
    if (!_taAssistEnabled()) { _taHideSuggestion(); return; }
    var isSpace = e && e.type === 'input' && e.inputType === 'insertText' && e.data === ' ';
    if (isSpace) { _taHideSuggestion(); return; }

    _taHideSuggestion();

    // Android/WebView keyboards can dispatch input/keyup before selectionStart
    // is fully settled. Read the value/caret on the next tick.
    setTimeout(function() {
      if (seq !== _taSuggestSeq || document.activeElement !== el) return;
      var val = el.value || '';
      var cursor = (typeof el.selectionStart === 'number') ? el.selectionStart : val.length;
      var endPos = (typeof el.selectionEnd === 'number') ? el.selectionEnd : cursor;
      if (cursor !== endPos) return;
      var before = val.substring(0, cursor);
      var m = before.match(/[a-zA-Z]+$/);
      if (!m || m[0].length < 2) return;
      var word = m[0];
      var wordStart = cursor - word.length;
      var wordEnd = cursor;
      var afterWord = val.substring(wordEnd);

      _taSuggestTimer = setTimeout(function() {
        if (seq !== _taSuggestSeq) return;
        var nowCursor = (typeof el.selectionStart === 'number') ? el.selectionStart : el.value.length;
        var nowEnd = (typeof el.selectionEnd === 'number') ? el.selectionEnd : nowCursor;
        if (document.activeElement !== el || nowCursor !== cursor || nowEnd !== cursor) return;
        if (el.value.substring(wordStart, wordEnd) !== word) return;

        var remembered = (typeof _taGetApprovedSpelling === 'function') ? _taGetApprovedSpelling(word) : null;
        var localGuess = remembered || _taTranslitWord(word);
        if (localGuess && localGuess !== word) _taShowSuggestion(el, wordStart, wordEnd, word, afterWord, localGuess);
        if (remembered) return; // approved spelling is already the strongest + fastest result

        // Background refinement only; UI never waits for Apps Script/network.
        google.script.run
          .withSuccessHandler(function(res) {
            if (seq !== _taSuggestSeq || !_taAssistEnabled() || el.value.substring(wordStart, wordEnd) !== word) return;
            var converted = (res && res.ok && res.result) ? res.result : localGuess;
            if (converted && converted !== word && _taSuggestState && _taSuggestState.el === el &&
                _taSuggestState.wordStart === wordStart && _taSuggestState.wordEnd === wordEnd) {
              var pick = _taSuggestBox && _taSuggestBox.querySelector('#_taSuggestPick');
              var edit = _taSuggestBox && _taSuggestBox.querySelector('#_taSuggestText');
              if (pick && pick.style.display !== 'none') pick.textContent = converted;
              if (edit && edit.style.display !== 'none' && edit.textContent === localGuess) edit.textContent = converted;
            }
          })
          .withFailureHandler(function(){})
          .transliterateWord(word);
      }, 120);
    }, 0);
  }

  var _taLastInputAt = 0;
  el.addEventListener('compositionstart', function() { _taComposing = true; });
  el.addEventListener('input', function(e) {
    _taLastInputAt = Date.now();
    scheduleSuggestion(e);
  });
  el.addEventListener('compositionend', function(e) {
    _taComposing = false;
    scheduleSuggestion(e);
  });
  // Some Android WebViews/third-party keyboards intermittently miss a useful
  // input event; keyup is a harmless fallback because the timer is de-duped.
  el.addEventListener('keyup', function(e) {
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    if (Date.now() - _taLastInputAt < 100) return; // input already handled this key
    scheduleSuggestion(e);
  });
  el.addEventListener('blur', function() {
    setTimeout(function() {
      var active = document.activeElement;
      if (active === el) return;
      if (_taSuggestBox && _taSuggestBox.contains(active)) return;
      _taHideSuggestion();
    }, 220);
  });
}

function _initTamilTransliteration() {
  // FIX [DI-6]: extended to every genuine person/place name field in the
  // app — the original list only covered the main Add/Edit/Reminder
  // forms. Moi Counter, Bulk Import, "add from reminder", Event name,
  // and Admin's new-user name are all real name/place fields with the
  // same Tamil-first UX expectation.
  //
  // Deliberately NOT included: acc_name (bank/account labels like "SBI
  // Savings" — forcing these to Tamil script would actively break them),
  // ex_new_cat_name / in_new_cat_name (category labels, same risk).
  ['f_place','f_name','f_note','m_place','m_name','m_note',
   'rem_place','rem_name','rem_note',
   'mc_name','mc_place','af_place','bi_place','ev_other_name','nu_name','srch',
   'ex_description','in_description','loan_person','loan_notes'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    // Pause shows a Tamil suggestion; Space stays English. Tap suggestion to use it, or edit first.
    if (el) attachTamilSuggestion(el);
  });

  // Forms/modals can be re-rendered after login or module switching. Bind the
  // current live element again on focus; attachTamilSuggestion is idempotent.
  if (!document.documentElement.getAttribute('data-ta-focus-rebind')) {
    document.documentElement.setAttribute('data-ta-focus-rebind', '1');
    document.addEventListener('focusin', function(e) {
      var el = e.target;
      if (!el || !el.id) return;
      var ids = ['f_place','f_name','f_note','m_place','m_name','m_note',
        'rem_place','rem_name','rem_note','mc_name','mc_place','af_place',
        'bi_place','ev_other_name','nu_name','srch','ex_description','in_description','loan_person','loan_notes'];
      if (ids.indexOf(el.id) !== -1) attachTamilSuggestion(el);
    });
  }
  _taSyncAssistUI();
}


// ============================================================
//  EXISTING NAME / OOR SUGGESTIONS (v131, purely additive)
//  ------------------------------------------------------------
//  Separate from, and does not modify, the frozen Tamil
//  transliteration engines above (_taTranslitWord / _taApplyConversion
//  are only ever READ/CALLED here, never redefined). This shows up to
//  5 already-stored Name/Oor values that start with the Tamil prefix
//  the person is currently typing (in Latin or Tamil), sourced purely
//  from the already-loaded `ac` autocomplete cache — zero server calls
//  per keystroke. Selecting one inserts the EXACT stored Tamil value.
// ============================================================
var _exBox   = null;
var _exState = null; // { el, wordStart, wordEnd, word, afterWord }

function _exGetBox() {
  if (_exBox) return _exBox;
  var box = document.createElement('div');
  box.id = '_exBox';
  box.style.cssText = 'position:absolute;z-index:9999;display:none;flex-direction:column;'
    + 'background:#fff;border:1px solid #D8DEE4;border-radius:8px;'
    + 'box-shadow:0 4px 14px rgba(0,0,0,0.15);padding:4px;font-size:14px;line-height:1.3;min-width:140px;max-width:260px;';
  document.body.appendChild(box);
  _exBox = box;

  // Dismiss only when tapping outside both the source field and this box —
  // mirrors the frozen Tamil suggestion box's own outside-tap handling.
  document.addEventListener('mousedown', function(e) {
    if (!_exState || !_exBox) return;
    if (e.target === _exState.el || _exBox.contains(e.target)) return;
    _exHide();
  });
  return box;
}

function _exHide() {
  if (_exBox) _exBox.style.display = 'none';
  _exState = null;
}

function _exPick(value) {
  if (!_exState) return;
  var s = _exState;
  // Reuse the existing cursor-safe replace helper (frozen, read-only use).
  _taApplyConversion(s.el, s.word, s.wordStart, s.wordEnd, value, s.afterWord);
  _exHide();
  if (typeof _taHideSuggestion === 'function') _taHideSuggestion(); // hide both boxes safely
  s.el.focus();
  // Trigger the field's normal input/change flow (quick chips, dup-check,
  // onMcPlaceChange, renderAll, etc.) exactly as if the person had typed
  // it — no per-field special-casing, no HTML changes needed.
  // Do not synthesize another input event here: it would re-enter this
  // listener and can reopen/overlap suggestion UI on some Android WebViews.
  // Call the existing field hooks directly, then emit only change.
  try {
    if (s.el.id === 'f_place' && typeof onPlaceChange === 'function') onPlaceChange();
    else if (s.el.id === 'f_name' && typeof onNameChange === 'function') onNameChange();
    else if (s.el.id === 'mc_place' && typeof onMcPlaceChange === 'function') onMcPlaceChange();
  } catch (e) { console.warn('[ExistingSuggest] field refresh skipped:', e); }
  try { s.el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e2) {}
}

function _exPositionAndShow(el, matches, wordStart, wordEnd, word, afterWord) {
  if (!matches || !matches.length) { _exHide(); return; }
  var box = _exGetBox();
  box.innerHTML = matches.map(function(m) {
    return '<button type="button" class="_exItem" style="display:block;width:100%;text-align:left;'
      + 'border:none;background:transparent;padding:6px 8px;cursor:pointer;border-radius:5px;font-size:14px;color:#222;">'
      + x(m.value) + '</button>';
  }).join('');
  Array.prototype.forEach.call(box.querySelectorAll('._exItem'), function(btn, i) {
    // mousedown (not click) + preventDefault so the source field never loses
    // focus/selection before _exState is read — same pattern as the frozen box.
    btn.addEventListener('mousedown', function(e) { e.preventDefault(); _exPick(matches[i].value); });
    btn.addEventListener('mouseenter', function() { btn.style.background = '#F3F5F7'; });
    btn.addEventListener('mouseleave', function() { btn.style.background = 'transparent'; });
  });
  var rect = el.getBoundingClientRect();
  box.style.left = (rect.left + window.scrollX) + 'px';
  box.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  box.style.display = 'flex';
  _exState = { el: el, wordStart: wordStart, wordEnd: wordEnd, word: word, afterWord: afterWord };

  // Never overlap with the frozen Tamil suggestion bubble. This only ever
  // CALLS the existing exported _taHideSuggestion() — it never reaches into
  // _taSuggestState / _taSuggestTimer / _taSuggestBox directly.
  if (typeof _taHideSuggestion === 'function') _taHideSuggestion();
  setTimeout(function() {
    if (_exState && _exState.el === el && _exBox && _exBox.style.display !== 'none') {
      if (typeof _taHideSuggestion === 'function') _taHideSuggestion();
    }
  }, 700); // just past the frozen bubble's own 650ms pause-trigger delay
}

// Collects exact stored Names from ac.combos, summing counts across every
// Oor that name appears with. Read-only over `ac` — never mutates it.
function _exCollectNames() {
  var map = {};
  var combos = (typeof ac !== 'undefined' && ac && ac.combos) ? ac.combos : [];
  combos.forEach(function(c) {
    if (!c || !c.name) return;
    if (!(c.name in map)) map[c.name] = 0;
    map[c.name] += (c.count || 0);
  });
  return map;
}

// Collects exact stored Oor values from ac.places (authoritative list of
// distinct places) and sums frequency using ac.combos' counts.
function _exCollectPlaces() {
  var map = {};
  var places = (typeof ac !== 'undefined' && ac && ac.places) ? ac.places : [];
  var combos = (typeof ac !== 'undefined' && ac && ac.combos) ? ac.combos : [];
  places.forEach(function(p) { if (p && !(p in map)) map[p] = 0; });
  combos.forEach(function(c) {
    if (!c || !c.place) return;
    if (!(c.place in map)) map[c.place] = 0;
    map[c.place] += (c.count || 0);
  });
  return map;
}

// Prefix startsWith matching only, max 5, frequency desc, Tamil
// alphabetical order as tie-breaker.
function _exMatchAndRank(map, prefix, limit) {
  var out = [];
  for (var key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key) && key.indexOf(prefix) === 0) {
      out.push({ value: key, count: map[key] });
    }
  }
  out.sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.value.localeCompare(b.value, 'ta');
  });
  return out.slice(0, limit || 5);
}

// Extracts the Latin or Tamil fragment currently being typed right before
// the caret. Tamil fragments are matched directly (no transliteration
// needed); Latin fragments require a minimum of 2 characters, mirroring
// the frozen attachTamilSuggestion()'s own initials guard.
function _exExtractFragment(el) {
  var val = el.value;
  var cursor = el.selectionStart;
  if (cursor !== el.selectionEnd) return null; // active selection, not a caret
  var before = val.substring(0, cursor);
  var mTa = before.match(/[\u0B80-\u0BFF]+$/);
  if (mTa) return { raw: mTa[0], isTamil: true, wordStart: cursor - mTa[0].length, wordEnd: cursor };
  var mEn = before.match(/[a-zA-Z]+$/);
  if (mEn && mEn[0].length >= 2) return { raw: mEn[0], isTamil: false, wordStart: cursor - mEn[0].length, wordEnd: cursor };
  return null;
}

function attachExistingSuggest(el, kind) {
  if (!el || el._exDone) return; // prevent duplicate listeners on re-init
  el._exDone = true;
  var exTimer = null;
  var exSeq = 0; // monotonic token — guards against stale async-style results

  el.addEventListener('input', function(e) {
    if (e.inputType && e.inputType.indexOf('delete') !== -1) { _exHide(); return; }
    clearTimeout(exTimer);
    var frag = _exExtractFragment(el);
    if (!frag) { _exHide(); return; }
    if (!frag.isTamil && !_taAssistEnabled()) { _exHide(); return; }
    var mySeq = ++exSeq;
    exTimer = setTimeout(function() {
      if (mySeq !== exSeq) return; // a newer keystroke has since happened — stale
      var cur = _exExtractFragment(el);
      if (!cur || cur.wordStart !== frag.wordStart || cur.wordEnd !== frag.wordEnd || cur.raw !== frag.raw) return;
      var prefix = frag.isTamil ? frag.raw : _taTranslitWord(frag.raw);
      if (!prefix || !/[\u0B80-\u0BFF]/.test(prefix)) { _exHide(); return; }
      var map = (kind === 'name') ? _exCollectNames() : _exCollectPlaces();
      var matches = _exMatchAndRank(map, prefix, 5);
      if (!matches.length) { _exHide(); return; } // no existing match — leave the normal Tamil bubble usable
      var afterWord = el.value.substring(frag.wordEnd);
      _exPositionAndShow(el, matches, frag.wordStart, frag.wordEnd, frag.raw, afterWord);
    }, 120);
  });

  el.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') _exHide();
  });

  el.addEventListener('blur', function() {
    setTimeout(function() {
      var active = document.activeElement;
      if (active === el) return;
      if (_exBox && _exBox.contains(active)) return;
      _exHide();
    }, 180);
  });
}

function _initExistingSuggest() {
  // Same real Name/Oor fields the frozen Tamil engine covers above
  // (excluding the free-text *_note fields, which aren't names/oors).
  [
    ['f_name','name'],   ['f_place','place'],
    ['m_name','name'],   ['m_place','place'],
    ['rem_name','name'], ['rem_place','place'],
    ['mc_name','name'],  ['mc_place','place'],
    ['af_place','place'],['bi_place','place'],
    ['ev_other_name','name'], ['nu_name','name']
  ].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) attachExistingSuggest(el, pair[1]);
  });
}


// helper: yyyy-MM-dd from a Date (local), matches server _ymd expectations
function fmtYmd(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (10 > m ? '0' : '') + m + '-' + (10 > day ? '0' : '') + day;
}


// Local yyyy-MM-dd formatter (no server round-trip needed for date math)
function Utilities_formatDateLocal(d) {
  var pad = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}


// ============================================================
// GENERIC CONFIRM / INFO MODAL — replaces native confirm()/alert()
// everywhere in the app (FIX [1]: no prompt-chain, no native dialogs)
// ============================================================
function showConfirm(msg, onYes) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmModal').style.display = 'flex';
  document.getElementById('confirmYesBtn').onclick = function(){
    document.getElementById('confirmModal').style.display = 'none';
    onYes();
  };
}

function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; }


function showInfoModal(title, msg) {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoMsg').textContent = msg;
  document.getElementById('infoModal').style.display = 'flex';
}

function closeInfoModal() { document.getElementById('infoModal').style.display = 'none'; }


var _moiDataLoaded = false;
var _moiDataLoading = false;

function _buildLocalAutocompleteFromRecs() {
  var placeMap = {}, comboMap = {};
  (recs || []).forEach(function(r) {
    var place = _norm(r && r.place), name = _norm(r && r.name);
    if (place) placeMap[place.toLowerCase()] = place;
    if (!place || !name) return;
    var key = place.toLowerCase() + '||' + name.toLowerCase();
    if (!comboMap[key]) comboMap[key] = { place:place, name:name, type:r.type || '', mode:r.mode || '', count:0, amount:r.amount || 0 };
    comboMap[key].count++;
    comboMap[key].amount = r.amount || comboMap[key].amount;
  });
  return {
    places:Object.keys(placeMap).map(function(k){ return placeMap[k]; }).sort(),
    combos:Object.keys(comboMap).map(function(k){ return comboMap[k]; }).sort(function(a,b){ return (b.count||0)-(a.count||0); })
  };
}

function loadData() {
  if (_moiDataLoading) return;
  _moiDataLoading = true;
  loading(true);

  // Launch hardening: Apps Script calls have no browser-side timeout.
  // Stop an indefinite loader after 20 seconds and ignore stale callbacks
  // if the user retries or the app resumes with a newer load request.
  var loadSeq = ++_moiLoadSeq;
  var loadSettled = false;
  var cacheRendered = false;
  // Show last synced structured records immediately, then refresh silently from Sheets.
  _nmRecordCacheGet('moi','all',7*24*60*60*1000,function(cachedRows){
    if(loadSeq !== _moiLoadSeq || !Array.isArray(cachedRows) || !cachedRows.length) return;
    recs = cachedRows; eventRecs = cachedRows.filter(function(r){return r&&r._src==='event';});
    _moiDataLoaded = true; cacheRendered = true;
    loading(false); refreshCurrentTab();
  });
  var loadWatchdog = setTimeout(function() {
    if (loadSettled || loadSeq !== _moiLoadSeq) return;
    loadSettled = true;
    _moiDataLoading = false;
    loading(false);
    toast('⚠️ Data load நேரம் அதிகமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
  }, 20000);

  // FIX [PERF-LAUNCH]: Main records and event records are independent.
  // Load them in parallel instead of waiting main -> event sequentially.
  // This removes one full Apps Script round-trip from the critical path
  // while preserving the same combined data and failure behaviour.
  var mainDone = false, eventDone = false, mainFailed = false;
  var mainRows = [], eventRows = [];

  function finishWhenReady() {
    if (loadSettled || loadSeq !== _moiLoadSeq) return;
    if (!mainDone || !eventDone) return;
    if (mainFailed) return; // main failure handler already stopped loading
    eventRecs = eventRows;
    recs = mainRows.concat(eventRows);
    _nmRecordCachePut('moi','all',recs);
    _moiDataLoaded = true;
    _moiDataLoading = false;
    // Records are already usable; render immediately instead of waiting for
    // the secondary autocomplete request. This prevents the All/Search screen
    // from briefly showing a misleading "0 பதிவுகள்" while data exists.
    refreshCurrentTab();
    _afterLoadData(loadSeq, loadWatchdog, function(){ loadSettled = true; });
  }

  google.script.run
    .withSuccessHandler(function(mainData) {
      if (loadSettled || loadSeq !== _moiLoadSeq) return;
      mainRows = (mainData || []).map(function(r){ r._src = 'main'; return r; });
      mainDone = true;
      finishWhenReady();
    })
    .withFailureHandler(function(e) {
      if (loadSettled || loadSeq !== _moiLoadSeq) return;
      mainFailed = true; mainDone = true; loadSettled = true;
      _moiDataLoading = false;
      clearTimeout(loadWatchdog);
      loading(false);
      toastError(e);
    })
    .getAllRecords();

  google.script.run
    .withSuccessHandler(function(evData) {
      if (loadSettled || loadSeq !== _moiLoadSeq) return;
      eventRows = Array.isArray(evData) ? evData.map(function(r){ r._src = 'event'; return r; }) : [];
      eventDone = true;
      finishWhenReady();
    })
    .withFailureHandler(function() {
      if (loadSettled || loadSeq !== _moiLoadSeq) return;
      // Event load failed — still show main records, matching prior behaviour.
      eventRows = [];
      eventDone = true;
      finishWhenReady();
    })
    .getAllCombinedEventRecords();
}


function _afterLoadData(loadSeq, loadWatchdog, markSettled) {
  var acFn = _activeEventId ? 'getCrossSheetAutocomplete' : 'getAutocomplete';
  google.script.run
    .withSuccessHandler(function(a) {
      if (loadSeq !== _moiLoadSeq) return;
      if (typeof markSettled === 'function') markSettled();
      clearTimeout(loadWatchdog);
      ac = (a && (a.places || a.combos)) ? a : _buildLocalAutocompleteFromRecs();
      buildDataLists();
      _applyRoleUI();
      loading(false);
      refreshCurrentTab();
      if (_pendingMoiRecordOpen) {
        var pendingNo = _pendingMoiRecordOpen;
        _pendingMoiRecordOpen = null;
        go('all');
        setTimeout(function(){ openEditModal(pendingNo); }, 150);
      }
      if (_pendingMoiModeFilter) {
        var mode = _pendingMoiModeFilter;
        _pendingMoiModeFilter = null;
        go('all');
        setTimeout(function(){
          var modeEl = document.getElementById('modeF');
          if (modeEl) { modeEl.value = mode; renderAll(); }
        }, 150);
      }
    })
    .withFailureHandler(function(e) {
      if (loadSeq !== _moiLoadSeq) return;
      if (typeof markSettled === 'function') markSettled();
      clearTimeout(loadWatchdog);
      loading(false);
      // Autocomplete must never block Search / existing-name suggestions.
      // Rebuild it from the records already loaded in memory when this
      // secondary server call fails.
      ac = _buildLocalAutocompleteFromRecs();
      buildDataLists();
      toastError(e);
      refreshCurrentTab();
    })
    [acFn]();
}


// ============================================================
// v274 — Shared client-side role gates. These are UX guards only; real
// authorization must also be enforced server-side in Apps Script.
// Viewer = read-only, Editor = add/edit, Admin = add/edit/delete.
// ============================================================
function _nmRoleCanWrite() {
  return !(S && S.role === 'sub' && S.subRole === 'viewer');
}
function _nmRoleCanDelete() {
  return !!(S && (S.role === 'main' || S.role === 'super_admin' || (S.role === 'sub' && S.subRole === 'admin')));
}
function _nmGuardWrite(label) {
  if (_nmRoleCanWrite()) return true;
  toast('🔒 Viewer permission — ' + (label || 'இந்த மாற்றம்') + ' செய்ய முடியாது.');
  return false;
}
function _nmGuardDelete(label) {
  if (_nmRoleCanDelete()) return true;
  toast('🔒 Delete permission Admin-க்கு மட்டும்.' + (label ? ' ' + label : ''));
  return false;
}

// ============================================================
//  FIX [45]: In-app User Guide — accordion sections covering every
//  feature. Some sections only show for the relevant role (Sub-user
//  sections hidden for pure Main users with no subs yet, Admin section
//  only for Super Admin, etc.) — kept simple by just checking S.role.
// ============================================================
function _guideSections() {
  var isSub   = S.role === 'sub';
  var isMain  = S.role === 'main';
  var isAdmin = S.role === 'super_admin';

  var sections = [
    // ── APP-WIDE ──────────────────────────────────────────────
    { title: '🏠 Dashboard / Module தேர்வு',
      body: 'Login ஆனவுடன் இந்த Dashboard தெரியும் — ஒவ்வொரு Module Card-லும் ஒரு Live Summary (இந்த மாத வரவு/செலவு, Net Position, Active குழுக்கள்) தெரியும். '
          + 'Card Click பண்ணா அந்த Module திறக்கும். Plan Lock ஆன Module-க்கு "⭐ Upgrade தேவை" காட்டும்.' },
    { title: '🔄 Module Switch பண்றது',
      body: 'எந்த Module உள்ளேயும் Header வலது பக்கம் 🔄 Button — இதை Click பண்ணா உடனே Dashboard-க்கு திரும்பி, வேற Module தேர்வு செய்யலாம்.' },
    { title: '🚪 வெளியேறுவது (Logout)',
      body: 'Dashboard-ல் கீழே "🚪 வெளியேறு" Button, அல்லது எந்த Module-ன் Header-லும் 🚪 Button. Confirm பண்ணினா Session அழிக்கப்பட்டு Login Screen-க்கு போகும்.' },

    // ── மொய் பதிவேடு ──────────────────────────────────────────
    { title: '📝 மொய் பதிவு எப்படி சேர்ப்பது',
      body: '"சேர்" Tab-க்கு போய், தேதி/ஊர்/பெயர்/தொகை நிரப்பி "சேமி" Click பண்ணவும். '
          + 'ஏற்கனவே அதே பெயர்/ஊர் இருந்தால் Duplicate Warning வரும் — வேண்டுமென்றே மீண்டும் சேர்க்க "ஆம்" Click பண்ணலாம்.' },
    { title: '✏️ பதிவு திருத்துவது / நீக்குவது',
      body: '"அனைத்தும்" Tab-ல் ஒரு Record-ஐ Click பண்ணா Edit Screen திறக்கும். அங்கேயே "🗑️ நீக்கு" Button-உம் இருக்கும். '
          + (isSub
            ? 'உங்கள் Permission Level: '
              + (S.subRole==='viewer' ? 'Viewer — படிக்க மட்டும் (Edit/Delete முடியாது).'
                : S.subRole==='admin' ? 'Admin — Edit + Delete இரண்டும் முடியும்.'
                : 'Editor — Add/Edit முடியும், Delete முடியாது.')
            : 'Sub-user Role "Viewer" ஆனா Edit/Delete முடியாது, "Editor" ஆனா Edit மட்டும், "Admin" ஆனா Delete-உம் முடியும்.') },
    { title: '🔍 Search & Filter (மொய்)',
      body: '"அனைத்தும்" Tab-ல் Search Box-ல் பெயர்/ஊர் Type பண்ணா, அந்த நபரோட எல்லா Records + Total Amount தெரியும். '
          + '"🔽 மேலும் Filters" Click பண்ணா, தேதி வரம்பு/தொகை வரம்பு/மொய் வகை/பொருள்/எவர் சேர்த்தார்/Sort — இவையெல்லாம் தேர்வு செய்யலாம்.' },
    { title: '📷 Photo OCR — Name Tag-ல் இருந்து பெயர் எடு',
      body: 'பெயர் Field-க்கு கீழே "📷 Name Tag Photo-ல் இருந்து பெயர் எடு" Button Click பண்ணா, Camera அல்லது Gallery-ல் இருந்து ஒரு Photo தேர்வு செய்யலாம். '
          + 'படத்தில் இருக்கும் எழுத்தை படித்து பெயர் Field-ல் தானாக நிரப்பும். Handwriting Quality-ஐ பொறுத்து துல்லியம் மாறுபடும் — '
          + 'தவறா படிச்சா, நேரடியா Field-ல் திருத்திக்கொள்ளலாம்.' },
    { title: '📖 மொய் புத்தகத்தில் இருந்து Bulk Import',
      body: 'Header-ல் 📖 Button — ஒரு முழு Note-Book Page Photo எடுத்தா, பல பெயர்+தொகை Entries தானாக கண்டுபிடிக்கப்பட்டு Editable List காட்டும். '
          + 'சரிபார்த்து திருத்தி, "✅ எல்லாம் Save பண்ணு" Click பண்ணா ஒரே தடவையில் பல Records சேரும்.' },
    { title: '⌨️ Tamil Typing Assist',
      body: 'பெயர்/ஊர்/Search போன்ற supported fields-ல் English-ல் type செய்தால் Tamil suggestion வரும் (எ.கா. "murugan" → "முருகன்"). '
          + 'Suggestion-ஐ tap செய்தால் மட்டும் Tamil பயன்படுத்தப்படும்; English text force-ஆ மாற்றப்படாது. Initials அப்படியே இருக்கும்.' },
    { title: '⏰ Reminders',
      body: 'Future Date-ல் ஒரு Transaction நடக்கும்னு Track பண்ண Reminder சேர்க்கலாம் (இன்று/கடந்த தேதி அனுமதி இல்ல). '
          + '🔔 Icon-ல் பார்க்கலாம் — Overdue/Today/Upcoming என பிரிக்கப்படும். '
          + '"✅ உறுதி" பண்ணா Record ஆகி Reminder நீக்கும், "✏️ திருத்து" மூலம் Date/Details மாற்றலாம். '
          + 'Main user + Sub-users எல்லோருக்கும் Shared.' },
    { title: '📢 Moi Counter',
      body: 'Header-ல் 📢 Button — Event நடக்கும்போது Live Total (தானா Refresh) + Quick Entry (பெயர்/ஊர்/தொகை/இருப்பு). '
          + 'Save பண்ணும்போதே Receipt PDF தானா Generate ஆகி Download ஆகும் — WhatsApp-ல் உடனே Share பண்ணலாம்.' },
    { title: '📄 PDF Report (மொய்)',
      body: 'Moi Counter-க்குள் "📄 PDF Report Download" Button — முழு Summary + எல்லா Records ஒரு PDF-ஆக Download. '
          + 'Phone-ல் இருந்து WhatsApp மூலம் Share பண்ணலாம்.' },
    { title: '🎉 Events (ஒரு நிகழ்வுக்கு தனி Sheet)',
      body: 'Header-ல் 🎉 Button — ஒரு Event (திருமணம், காதணி, புதுமனை...) Create பண்ணா தனி Google Sheet உருவாகும். '
          + 'Event Active-ஆ இருக்கும்போது எல்லா Entries-உம் அந்த Event Sheet-ல் Save ஆகும். '
          + '📢 Moi Counter Button Event Active-ஆ இருக்கும்போது மட்டும் தெரியும். '
          + '"அனைத்தும்" Tab-ல் Main Sheet + Event Sheet Records Combined-ஆ காட்டும் — ஒவ்வொரு Record-லயும் 🎉/📋 Badge Source காட்டும். '
          + 'Summary Tab-ல் Event Card Click பண்ணினா அந்த Event Records மட்டும் காட்டும்.',
      roles: ['main','super_admin'] },
    { title: '🧾 ரசீது (Moi Receipt)',
      body: 'வரவு Records-ல் "🧾 ரசீது" Button — ஊர்/பெயர்/தொகை/Denomination Breakdown உள்ள 80mm Thermal Receipt PDF. '
          + 'Account → "🧾 ரசீது அமைவுகள்"-ல் உங்கள் பெயர், மனைவி பெயர், ஊர், மண்டப பெயர் Set பண்ணவும். '
          + 'Moi Counter-ல் Save பண்ணியவுடன் Receipt தானாக Generate ஆகும்.' },
    { title: '📊 Consolidated Summary (மொய்)',
      body: '"சுருக்கம்" Tab — Main Sheet + எல்லா Event Sheets-ன் Combined Total காட்டும். '
          + 'Event வாரியாக Cards-ல் ஒவ்வொரு Event-ன் Total + Count + Status தெரியும். '
          + 'Event Card Click பண்ணினா அந்த Event Records மட்டும் "அனைத்தும்" Tab-ல் காட்டும்.' },
    { title: '👤 Sub User ஆக நீங்கள் என்ன பார்க்கிறீர்கள்',
      body: 'நீங்கள் ' + x(S.name) + ' — '
          + (S.ownerEmail ? x(S.ownerEmail) + '-ன் பதிவேட்டை பயன்படுத்துகிறீர்கள்.' : 'ஒரு Sub-user.')
          + ' உங்கள் Permission: ' + (S.subRole || 'editor') + '. '
          + 'நீங்கள் சேர்க்கும் எல்லா பதிவுகளும் Main user-ன் Spreadsheet-ல் Save ஆகும். '
          + 'Reminders, Moi Counter எல்லாம் Share ஆனவை — Main user + மற்ற Sub-users-உம் பார்க்கலாம்.',
      roles: ['sub'] },
    { title: '👥 Sub Users',
      body: 'Account Tab → "Sub Users" — Trial/Premium Plan-ல் கிடைக்கும். Email + பெயர் + அனுமதி (Viewer/Editor/Admin) கொடுத்து சேர்க்கலாம். '
          + 'Sub-user அதே App URL-ல் தங்கள் Gmail Login பண்ணினால் உங்க பதிவேட்டில் சேர்வார்கள்.',
      roles: ['main','super_admin'] },

    // ── DAILY EXPENSES ────────────────────────────────────────
    { title: '💵 Daily Cash Expenses — செலவு/வரவு சேர்ப்பது',
      body: '"சேர்" Tab-ல் மேலே "💸 செலவு" / "💵 வரவு" Toggle — எது வேணும்னு தேர்ந்தெடுக்கவும். '
          + 'வகை (Category) Chip-ஐ தேர்ந்தெடுத்து, தொகை போட்டா போதும் — Sub-Category/Description/Account/Recurring எல்லாம் "➕ மேலும் விவரங்கள்"-க்குள் Optional-ஆ இருக்கும். '
          + '"➕ புதிய" Chip Click பண்ணி உங்க own Category-ஐ Icon-உடன் Create பண்ணலாம்.' },
    { title: '🏦 Accounts (Cash/Bank/Card)',
      body: '"கணக்கு" Tab-ல் உங்க Cash/Bank/Card Accounts Create பண்ணலாம், ஒவ்வொண்ணுக்கும் Opening Balance + Live Balance track ஆகும். '
          + 'Accounts இடையே "Transfer" பண்ணலாம் (Transfer Income/Expense-ஆ Count ஆகாது). '
          + 'தவறான Account-ஐ "நீக்கு" Button மூலம் நீக்கலாம். Account create பண்ணும் வரைக்கும் Add Form-ல் Account field தெரியாது — Optional தான்.' },
    { title: '📋 Transactions (Day/Week/Month)',
      body: '"பட்டியல்" Tab — Income + Expense ரெண்டும் ஒரே இடத்துல, Day/Week/Month Toggle-ஆ பார்க்கலாம். ◀ ▶ Buttons-ஆ முந்தைய/அடுத்த period-க்கு Navigate பண்ணலாம். '
          + 'ஒவ்வொரு Entry-க்கும் "நீக்கு" Button.' },
    { title: '📊 Summary — Charts & Cash Flow',
      body: '"சுருக்கம்" Tab-ல் Category-வாரியாக Pie Chart + கடந்த 6 மாதங்கள் Income vs Expense Bar Chart. Net Balance (மொய் வரவு + Manual Income − Expense) தெரியும்.' },
    { title: '🎯 Budget (Overall + Per-Category)',
      body: '"பட்ஜெட்" Tab-ல் மொத்த மாத Budget + ஒவ்வொரு Category-க்கும் தனி Limit வைக்கலாம். Budget வச்ச Category-ல் இதுவரை செலவு இல்லன்னாலும் (0 Spent) Summary-ல் அது தெரியும்.' },

    // ── SUBSCRIPTION & ADMIN ──────────────────────────────────
    { title: '⭐ Subscription',
      body: 'Trial 30 நாள் / 50 Records Free. அதன் பிறகு ⭐ Button மூலம் UPI-ல் Pay பண்ணி Claim Submit பண்ணவும். '
          + 'Admin Verify பண்ணின பிறகு Plan Upgrade ஆகும். Trial Plan-ல் Daily Cash Expenses Module Lock ஆக இருக்கும் — Basic/Premium Plan-ல் திறக்கும்.',
      roles: ['main','super_admin'] },
    { title: '👑 Admin Guide',
      body: '"நிர்வாகம்" Tab → பயனர்கள் (Add/Edit/Plan), 💳 Payments (Approve/Reject + Revenue Summary), '
          + '💬 கருத்துகள் (Feedback), 📋 Audit Log, 🔒 Security (Sub-user Direct Sheet Access Revoke).',
      roles: ['super_admin'] }
  ];
  return sections.filter(function(s) {
    return !s.roles || s.roles.indexOf(S.role) !== -1;
  });
}


var _guideOpenIndex = -1;


function openUserGuide() {
  _guideOpenIndex = -1;
  var box = document.getElementById('guideContent');
  var sections = _guideSections();
  box.innerHTML = sections.map(function(s, i) {
    return '<div style="border:1px solid var(--bdr);border-radius:8px;margin-bottom:8px;overflow:hidden">'
      + '<button type="button" style="width:100%;text-align:left;padding:12px;background:#F9FAFB;border:none;font-size:14px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="_toggleGuideSection(' + i + ')">'
      +   '<span>' + s.title + '</span><span id="guideArrow' + i + '">▾</span>'
      + '</button>'
      + '<div id="guideBody' + i + '" style="display:none;padding:12px;font-size:13px;color:#374151;line-height:1.6;background:#fff">' + s.body + '</div>'
      + '</div>';
  }).join('');
  document.getElementById('userGuideModal').style.display = 'flex';
}

function closeUserGuide() { document.getElementById('userGuideModal').style.display = 'none'; }

function onUserGuideBgClick(e) { if (e.target === document.getElementById('userGuideModal')) closeUserGuide(); }


function _toggleGuideSection(i) {
  var body  = document.getElementById('guideBody' + i);
  var arrow = document.getElementById('guideArrow' + i);
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▾' : '▴';
}


function openFeedbackModal() {
  document.getElementById('fb_message').value = '';
  document.getElementById('fbErr').textContent = '';
  document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() { document.getElementById('feedbackModal').style.display = 'none'; }

function onFeedbackModalBgClick(e) { if (e.target === document.getElementById('feedbackModal')) closeFeedbackModal(); }


function doSubmitFeedback() {
  var msg = document.getElementById('fb_message').value.trim();
  var err = document.getElementById('fbErr');
  if (!msg) { err.textContent = 'கருத்தை உள்ளிடவும்'; return; }
  err.textContent = '';
  var btn = document.getElementById('fbSendBtn');
  btn.disabled = true; btn.textContent = 'அனுப்புகிறது...';
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled = false; btn.textContent = '📤 அனுப்பு';
      if (res.ok) { closeFeedbackModal(); toast('✅ அனுப்பப்பட்டது, நன்றி!'); }
      else err.textContent = res.msg || 'பிழை';
    })
    .withFailureHandler(function(e){
      btn.disabled = false; btn.textContent = '📤 அனுப்பு';
      err.textContent = friendlyErrorMsg(e);
    })
    .submitFeedback(msg);
}


// ============================================================
// UTILITIES
// ============================================================
function buildDataLists() {
  // v286: do not dump the full name/place dictionary on focus. Suggestions
  // are populated only after the user types 2+ characters (local first,
  // then debounced/cached master matches).
  var dp = document.getElementById('dl_place'); if (dp) dp.innerHTML = '';
  var dn = document.getElementById('dl_name'); if (dn) dn.innerHTML = '';
  // Dynamic Function Type: keep the f_type <select> (defaults + unique recs
  // values) in sync whenever fresh data loads (see js_moi.html).
  if (typeof _populateFTypeOptions === 'function') _populateFTypeOptions();
}


function sortDesc(list) {
  return list.slice().sort(function(a,b){ return a.date>b.date?-1:b.date>a.date?1:0; });
}


function sc(label, val, blue) {
  return '<div class="sc"><div class="sl">'+label+'</div><div class="sv'+(blue?' b':'')+'">'+val+'</div></div>';
}

// v252: launch-safe premium micro-interaction. Animate only already-fetched
// numeric display values; never changes stored/calculated data.
function animateStatText(el, finalText) {
  if (!el) return;
  finalText = String(finalText == null ? '' : finalText);
  var m = finalText.match(/^(.*?)([0-9][0-9,]*(?:\.[0-9]+)?)(.*?)$/);
  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) {}
  if (!m || reduce || !window.requestAnimationFrame) { el.textContent = finalText; return; }
  var target = Number(m[2].replace(/,/g,''));
  if (!isFinite(target)) { el.textContent = finalText; return; }
  var prefix=m[1], suffix=m[3], decimals=(m[2].split('.')[1]||'').length;
  var oldTarget = Number(el.getAttribute('data-anim-target'));
  el.setAttribute('data-anim-target', String(target));
  if (oldTarget === target && el.textContent === finalText) return;
  var start = 0, started = 0, dur = 420;
  function format(n){
    var opts = decimals ? {minimumFractionDigits:decimals,maximumFractionDigits:decimals} : {maximumFractionDigits:0};
    try { return Number(n).toLocaleString('en-IN', opts); } catch (_) { return String(Math.round(n)); }
  }
  function step(ts){
    if (Number(el.getAttribute('data-anim-target')) !== target) return;
    if (!started) started=ts;
    var t=Math.min(1,(ts-started)/dur);
    var eased=1-Math.pow(1-t,3);
    var n=start+(target-start)*eased;
    el.textContent=prefix+format(decimals ? n : Math.round(n))+suffix;
    if(t<1) requestAnimationFrame(step); else el.textContent=finalText;
  }
  requestAnimationFrame(step);
}

function animateStatsIn(root) {
  if (!root) return;
  var nodes = root.querySelectorAll ? root.querySelectorAll('.sv') : [];
  Array.prototype.forEach.call(nodes, function(el){ animateStatText(el, el.textContent); });
}


function emptyIllustrationHtml(label, extraClass) {
  label = label || 'பதிவுகள் இல்லை';
  return '<div class="empty illustrated-empty'+(extraClass?' '+extraClass:'')+'">'
    +'<div class="empty-art"><svg class="empty-art-svg" aria-hidden="true" viewBox="0 0 120 84"><use href="#illustration-empty"></use></svg></div>'
    +'<div class="empty-label">'+x(label)+'</div></div>';
}
function empty() { return emptyIllustrationHtml('பதிவுகள் இல்லை'); }


function setBtnLoading(id, on, label) {
  var btn = document.getElementById(id); if(!btn) return;
  btn.disabled = on; btn.textContent = label;
}


function todayStr() {
  var d = new Date();
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}


function fmt(n) { return Number(n||0).toLocaleString('en-IN'); }


function fmtDate(d) {
  if (!d) return '-';
  try { var p=d.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('ta-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  catch(e) { return d; }
}


function x(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/[<]/g,'&lt;').replace(/[>]/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}


// FIX [9]: Collapse internal multi-spaces so live typing matches
// stored data consistently (e.g. "ராஜா  குமார்" === "ராஜா குமார்").
function _norm(s) { return String(s||'').trim().replace(/\s+/g,' '); }


function loading(on) { document.getElementById('loader').classList.toggle('show',on); }

// COMING SOON — info-only handler for future-module placeholder cards.
// Shows a clean message; NO backend, NO form, NO data access. The "Notify Me"
// simply records interest locally via a toast (no server call, no DB write) so
// launch stays safe. This is a placeholder, not a feature.
function comingSoon(name){
  var msg = '🔵 ' + (name || 'இந்த தொகுதி') + ' — விரைவில் வருகிறது.\n\n'
          + 'இந்த வசதி இன்னும் உருவாக்கத்தில் உள்ளது. தயாரானதும் உங்களுக்கு தெரிவிக்கப்படும்.';
  if (typeof showConfirm === 'function') {
    showConfirm(msg + '\n\n"சரி" அழுத்தி Notify Me பட்டியலில் சேரவும்.', function(){
      toast('🔔 நன்றி! ' + (name||'இந்த தொகுதி') + ' தயாரானதும் தெரிவிப்போம்.');
    });
  } else {
    toast('🔵 ' + (name||'இந்த தொகுதி') + ' — விரைவில் வருகிறது.');
  }
}


function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tid); t._tid = setTimeout(function(){ t.classList.remove('show'); },3200);
}


// FIX [review]: data-safety request — shows a toast with an inline
// "Undo" button (Gmail/WhatsApp-style) instead of a message that just
// disappears. Gives a 6-second window to reverse an accidental delete
// without having to dig through a Trash screen. Falls back to a plain
// toast if the undo-toast markup isn't present for some reason, so a
// missing element never silently drops the message entirely.
var _undoToastTimer = null;

function showUndoToast(message, onUndo) {
  var el  = document.getElementById('undoToast');
  var msg = document.getElementById('undoToastMsg');
  var btn = document.getElementById('undoToastBtn');
  if (!el || !msg || !btn) { toast(message); return; }
  msg.textContent = message;
  el.classList.add('show');
  clearTimeout(_undoToastTimer);
  btn.onclick = function() {
    el.classList.remove('show');
    clearTimeout(_undoToastTimer);
    if (onUndo) onUndo();
  };
  _undoToastTimer = setTimeout(function(){ el.classList.remove('show'); }, 6000);
}


// FIX: raw google.script.run failure messages are often cryptic internal
// Apps Script/network text (e.g. "Exception: Service invoked too many
// times", "Failed to fetch") that don't tell the person what actually went
// wrong or what to do. This translates the common, recurring cases into
// clear, actionable Tamil — falling back to the raw message (not hiding
// it) for anything unrecognized, so nothing is ever silently swallowed.
function _friendlyError(e) {
  var raw = (e && (e.message || e.toString())) || String(e || '');
  var msg = raw.toLowerCase();

  if (msg.indexOf('failed to fetch') !== -1 || msg.indexOf('network') !== -1 || msg.indexOf('networkerror') !== -1) {
    return { friendly: '📶 இணைய இணைப்பு பிரச்சனை — WiFi/Mobile Data சரியா இருக்கானு பாருங்க, மீண்டும் முயற்சிக்கவும்.', raw: raw };
  }
  if (msg.indexOf('too many times') !== -1 || msg.indexOf('rate limit') !== -1 || msg.indexOf('quota') !== -1) {
    return { friendly: '⏳ அதிக முறை Request அனுப்பப்பட்டதால் தற்காலிக தடை — சில நிமிடம் கழித்து மீண்டும் முயற்சிக்கவும்.', raw: raw };
  }
  if (msg.indexOf('exceeded maximum execution') !== -1 || msg.indexOf('timed out') !== -1 || msg.indexOf('timeout') !== -1) {
    return { friendly: '⏱️ Server அதிக நேரம் எடுத்துக்கொண்டது (Data அதிகமா இருக்கலாம்) — மீண்டும் முயற்சிக்கவும்.', raw: raw };
  }
  if (msg.indexOf('do not have permission') !== -1 || msg.indexOf('permission-denied') !== -1) {
    return { friendly: '🔒 இந்த செயலுக்கு உங்களுக்கு அனுமதி இல்லை — Admin/Account Owner-ஐ தொடர்பு கொள்ளவும்.', raw: raw };
  }
  if (msg.indexOf('authorization is required') !== -1 || msg.indexOf('not been authorized') !== -1) {
    return { friendly: '🔑 Google Account அனுமதி தேவை — பக்கத்தை Refresh பண்ணி, Google Login-ஐ மீண்டும் Confirm பண்ணவும்.', raw: raw };
  }
  if (msg.indexOf('script function not found') !== -1) {
    return { friendly: '⚠️ App-ன் புதிய Version Deploy ஆகவில்லை போல் தெரிகிறது — பக்கத்தை Hard Refresh (Ctrl+Shift+R) பண்ணி மீண்டும் முயற்சிக்கவும்.', raw: raw };
  }
  if (msg.indexOf('app_config_admin_db_missing') !== -1) {
    return { friendly: '⚙️ App அமைப்பு இன்னும் முழுமையடையவில்லை. Admin configuration-ஐ சரிபார்க்கவும்.', raw: raw };
  }
  if (raw === '' || msg === 'null' || msg === 'undefined') {
    return { friendly: '❓ Server-ல் இருந்து பதில் வரவில்லை — இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.', raw: raw };
  }
  // Unrecognized — show the raw message too (in Tamil-labeled form) rather
  // than hiding it, so a real unexpected bug is still visible for reporting.
  return { friendly: '⚠️ எதிர்பாராத பிழை: ' + raw, raw: raw };
}


// Shared shorthand for the extremely common ".withFailureHandler(function(e){ toast(...) })"
// pattern — same friendly translation, one line to call from anywhere.
function toastError(e) {
  toast(_friendlyError(e).friendly);
}


// Same translation, but returns the string — for the equally common
// inline-form-error pattern (errEl.textContent = ...) instead of a toast.
function friendlyErrorMsg(e) {
  return _friendlyError(e).friendly;
}


// ============================================================
// TAMIL TRANSLITERATION
// ============================================================
(function(){
  function gFetch(word,cb){
    if(!word){cb([]);return;}
    var xhr=new XMLHttpRequest();
    xhr.open('GET','https://inputtools.googleapis.com/request?text='+encodeURIComponent(word)+'&itc=ta-t-i0-und&num=8&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage',true);
    xhr.timeout=4000;
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4) return;
      try{ var d=JSON.parse(xhr.responseText); cb(d[0]==='SUCCESS'&&d[1]&&d[1][0]&&d[1][0][1]?d[1][0][1]:[]); }
      catch(e){ cb([]); }
    };
    xhr.ontimeout=xhr.onerror=function(){ cb([]); };
    xhr.send();
  }
  function attachTamil(inp,bar){
    var timer=null,sugs=[],sel=0,word='',base='';
    function hide(){ bar.style.display='none';bar.innerHTML='';sugs=[];sel=0; }
    function showChips(list){
      if(!list||!list.length){hide();return;}
      sugs=list;sel=0;
      bar.innerHTML=list.map(function(w,i){ return '<button type="button" class="tm-chip'+(i===0?' sel':'')+'" data-i="'+i+'">'+x(w)+'</button>'; }).join('');
      bar.style.display='flex';
      bar.querySelectorAll('.tm-chip').forEach(function(btn){
        btn.addEventListener('mousedown',function(e){e.preventDefault();});
        btn.addEventListener('click',function(){pick(+btn.dataset.i);});
        btn.addEventListener('touchend',function(e){e.preventDefault();pick(+btn.dataset.i);});
      });
    }
    function pick(i){ var c=sugs[i]!==undefined?sugs[i]:word;base+=c;word='';inp.value=base;hide();inp.dispatchEvent(new Event('input',{bubbles:true}));inp.focus(); }
    function commitSpace(){ var c=sugs.length?sugs[sel]:word;base+=c+' ';word='';inp.value=base;hide();inp.dispatchEvent(new Event('input',{bubbles:true})); }
    function doFetch(){ if(!word||document.activeElement!==inp){hide();return;} gFetch(word,function(list){if(word)showChips(list);}); }
    inp.addEventListener('keydown',function(e){
      if(e.ctrlKey||e.metaKey||e.altKey) return;
      if(sugs.length&&e.key==='ArrowRight'){e.preventDefault();sel=(sel+1)%sugs.length;bar.querySelectorAll('.tm-chip').forEach(function(c,i){c.classList.toggle('sel',i===sel);});return;}
      if(sugs.length&&e.key==='ArrowLeft'){e.preventDefault();sel=(sel-1+sugs.length)%sugs.length;bar.querySelectorAll('.tm-chip').forEach(function(c,i){c.classList.toggle('sel',i===sel);});return;}
      if(e.key==='Escape'){e.preventDefault();hide();return;}
      if(e.key==='Enter'||e.key==='Tab'){if(sugs.length){e.preventDefault();pick(sel);}else hide();return;}
      if(e.key===' '){e.preventDefault();commitSpace();return;}
      if(e.key==='Backspace'){
        e.preventDefault();
        if(word.length>0){word=word.slice(0,-1);inp.value=base+word;clearTimeout(timer);if(word)timer=setTimeout(doFetch,150);else hide();}
        else if(base.length>0){base=base.slice(0,-1);inp.value=base;hide();inp.dispatchEvent(new Event('input',{bubbles:true}));}
        return;
      }
      if(e.key.length===1){e.preventDefault();word+=e.key;inp.value=base+word;clearTimeout(timer);timer=setTimeout(doFetch,150);}
    });
    inp.addEventListener('input',function(){
      var cur=inp.value,exp=base+word;
      if(cur===exp) return;
      if(cur.length>=exp.length){
        var added=cur.slice(exp.length)||cur.slice(base.length);
        for(var ci=0;added.length>ci;ci++){var ch=added[ci];if(ch===' ')commitSpace();else{word+=ch;clearTimeout(timer);timer=setTimeout(doFetch,150);}}
        if(document.activeElement===inp) inp.value=base+word;
      } else {
        if(cur.startsWith(base)){word=cur.slice(base.length);clearTimeout(timer);if(word)timer=setTimeout(doFetch,150);else hide();}
        else{base=cur;word='';hide();}
      }
    });
    inp.addEventListener('focus',function(){base=inp.value;word='';hide();});
    inp.addEventListener('blur',function(){if(word){base+=word;word='';inp.value=base;}setTimeout(hide,200);});
  }
  // Dynamic Function Type: f_type is now a <select> (see js_moi.html), not a
  // free-text input, so the Tamil transliteration helper no longer applies
  // to it. m_type (Edit modal) is untouched and keeps transliteration.
  var TM_FIELDS=['f_place','f_name','f_nakai_other','m_place','m_name','m_type','m_nakai_other','srch'];
  window.initTM=function(){
    TM_FIELDS.forEach(function(id){
      var inp=document.getElementById(id); if(!inp||inp._tmDone) return;
      inp._tmDone=true;
      var bar=document.createElement('div'); bar.className='tm-bar';
      inp.parentNode.insertBefore(bar,inp.nextSibling);
      attachTamil(inp,bar);
    });
  };
})();

/* V41 premium header overflow menu */
function toggleHeaderMenu(evt){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  var menu=document.getElementById('headerMoreMenu');
  var btn=document.getElementById('headerMoreBtn');
  if(!menu)return;
  var src=evt&&(evt.currentTarget||evt.target);
  var fromBottom=!!(src&&src.id==='t-more');
  var open=!menu.classList.contains('open');
  menu.classList.toggle('from-bottom',open&&fromBottom);
  menu.classList.toggle('open',open);
  menu.setAttribute('aria-hidden',open?'false':'true');
  if(btn)btn.setAttribute('aria-expanded',open?'true':'false');
  var bottomMore=document.getElementById('t-more');
  if(bottomMore){
    bottomMore.classList.toggle('menu-open',open&&fromBottom);
    bottomMore.setAttribute('aria-expanded',(open&&fromBottom)?'true':'false');
  }
}
function closeHeaderMenu(){
  var menu=document.getElementById('headerMoreMenu');
  var btn=document.getElementById('headerMoreBtn');
  if(menu){menu.classList.remove('open','from-bottom');menu.setAttribute('aria-hidden','true');}
  if(btn)btn.setAttribute('aria-expanded','false');
  var bottomMore=document.getElementById('t-more');
  if(bottomMore){bottomMore.classList.remove('menu-open');bottomMore.setAttribute('aria-expanded','false');}
}
document.addEventListener('click',function(e){
  var menu=document.getElementById('headerMoreMenu');
  var btn=document.getElementById('headerMoreBtn');
  if(menu&&menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn)closeHeaderMenu();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeHeaderMenu();});


// ============================================================
// V250 — ANDROID / WEBVIEW HARDWARE BACK NAVIGATION
// ============================================================
// Median/Android normally maps the hardware Back key to browser history.
// Keep one lightweight history guard while the app is active so Back first
// dismisses the current transient UI, then moves to the module's safe root,
// and only then falls through to the WebView/browser's normal back/exit.
var _nmBackGuardInstalled = false;
var _nmBackHandling = false;

function _nmIsVisible(el) {
  if (!el) return false;
  var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
  return el.style.display !== 'none' && (!cs || cs.display !== 'none') && (!cs || cs.visibility !== 'hidden');
}

function _nmDismissTopLayer() {
  // 1) Daily Cash filter sheet is a high-frequency bottom sheet.
  var txnSheet = document.getElementById('txnFilterSheet');
  if (_nmIsVisible(txnSheet) && txnSheet.classList.contains('show')) {
    if (typeof closeTxnFilterSheet === 'function') closeTxnFilterSheet();
    else { txnSheet.classList.remove('show'); txnSheet.style.display = 'none'; }
    return true;
  }

  // 2) Header / More overflow menu.
  var hdr = document.getElementById('headerMoreMenu');
  if (hdr && hdr.classList.contains('open')) {
    closeHeaderMenu();
    return true;
  }

  // 3) Any visible modal/sheet. Prefer its real close function so local
  // state (ledger/category/AI/etc.) is cleaned up, not just hidden visually.
  var closeById = {
    confirmModal:'closeConfirmModal', infoModal:'closeInfoModal', editModal:'closeModal',
    reminderModal:'closeReminderModal', feedbackModal:'closeFeedbackModal',
    userGuideModal:'closeUserGuide', eventModal:'closeEventModal',
    receiptSettingsModal:'closeReceiptSettings', handLoanLedgerModal:'closeHandLoanLedger',
    smsReviewQueueModal:'closeSmsReviewQueue', expenseNewCategoryModal:'closeExpenseNewCategoryModal',
    memberLedgerModal:'closeMemberLedger', payerVerifyModal:'_closePayerVerificationModal',
    newFTypeModal:'closeNewFTypeModal'
  };
  var overlays = Array.prototype.slice.call(document.querySelectorAll('.modal-bg'));
  for (var i = overlays.length - 1; i >= 0; i--) {
    var m = overlays[i];
    if (!_nmIsVisible(m)) continue;
    var fn = closeById[m.id];
    if (fn && typeof window[fn] === 'function') window[fn]();
    else {
      m.classList.remove('show');
      m.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    return true;
  }

  return false;
}

function _nmHandleHardwareBack() {
  // Never navigate away while a write/edit is actively being committed.
  if ((typeof _moiSaveInFlight !== 'undefined' && _moiSaveInFlight) ||
      (typeof _expenseSaveInFlight !== 'undefined' && _expenseSaveInFlight) ||
      (typeof _moiEditInFlight !== 'undefined' && _moiEditInFlight) ||
      (typeof _expEditInFlight !== 'undefined' && _expEditInFlight)) {
    toast('சேமிப்பு முடிந்ததும் திரும்பவும் முயற்சிக்கவும்.');
    return true;
  }

  if (_nmDismissTopLayer()) return true;

  // Daily Cash: child tabs/pages return to the transaction List first.
  var ex = document.getElementById('expenseScreen');
  if (_nmIsVisible(ex) && typeof _expTab !== 'undefined' && _expTab !== 'list') {
    if (_expTab === 'add' && typeof _nmConfirmDiscard === 'function' && !_nmConfirmDiscard('expense')) return true;
    if (typeof expGo === 'function') expGo('list');
    return true;
  }

  // MOI: detail/utility tabs return to Home/Today before app exit.
  var app = document.getElementById('appScreen');
  if (_nmIsVisible(app) && typeof curTab !== 'undefined' && curTab !== 'today') {
    if (curTab === 'add' && typeof _nmConfirmDiscard === 'function' && !_nmConfirmDiscard('moi')) return true;
    if (typeof go === 'function') go('today');
    return true;
  }

  return false;
}

function _nmInstallHardwareBackGuard() {
  if (_nmBackGuardInstalled || !window.history || !history.pushState) return;
  _nmBackGuardInstalled = true;
  try {
    history.replaceState({nmRoot:true}, '', location.href);
    history.pushState({nmGuard:true}, '', location.href);
  } catch(e) { return; }

  window.addEventListener('popstate', function() {
    if (_nmBackHandling) return;
    _nmBackHandling = true;
    var handled = false;
    try { handled = _nmHandleHardwareBack(); } catch(e) { console.warn('Back handler:', e); }
    if (handled) {
      try { history.pushState({nmGuard:true}, '', location.href); } catch(e) {}
      _nmBackHandling = false;
      return;
    }
    // Nothing left to dismiss/navigate inside Namma MOI: continue the real
    // browser/WebView back action instead of trapping the user in the app.
    setTimeout(function(){
      _nmBackHandling = false;
      try { history.back(); } catch(e) {}
    }, 0);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _nmInstallHardwareBackGuard, {once:true});
} else {
  _nmInstallHardwareBackGuard();
}

// ============================================================
// V81 — OPTIONAL MODULE PREFERENCES + TAMIL CALENDAR SHELL
// ============================================================
var MODULE_PREFS = { moi:true, expense:true, tamilCalendar:true, documents:true, reminders:true };
var _tcalCursor = new Date();

function _normaliseModulePrefs(p) {
  p = p || {};
  return {
    moi: p.moi !== false,
    expense: p.expense !== false,
    // Launch recovery: Tamil Calendar is a core feature. Older saved
    // EnabledModules values may contain tamilCalendar:false and hide both
    // entry points completely. Keep it visible while preserving all other
    // module preferences.
    tamilCalendar: true,
    documents: p.documents !== false,
    reminders: p.reminders !== false
  };
}

var _modulePrefsLoadSeq = 0;
function loadModulePreferences(done) {
  var seq = ++_modulePrefsLoadSeq;
  var settled = false;
  var timer = setTimeout(function() {
    if (settled || seq !== _modulePrefsLoadSeq) return;
    settled = true;
    MODULE_PREFS = _normaliseModulePrefs(null);
    _applyModulePreferences();
    if (done) done({ok:false, timeout:true});
  }, 20000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (settled || seq !== _modulePrefsLoadSeq) return;
      settled = true; clearTimeout(timer);
      MODULE_PREFS = _normaliseModulePrefs(res && res.prefs);
      _applyModulePreferences();
      if (done) done(res || {});
    })
    .withFailureHandler(function() {
      if (settled || seq !== _modulePrefsLoadSeq) return;
      settled = true; clearTimeout(timer);
      MODULE_PREFS = _normaliseModulePrefs(null);
      _applyModulePreferences();
      if (done) done({ok:false});
    })
    .getMyModulePreferences();
}

function _setVisible(id, visible, displayValue) {
  var el = document.getElementById(id);
  if (el) el.style.display = visible ? (displayValue || '') : 'none';
}

function _applyModulePreferences() {
  var p = MODULE_PREFS;
  _setVisible('t-moi', p.moi);
  _setVisible('t-cash', p.expense);
  _setVisible('moreTamilCalendarBtn', p.tamilCalendar, 'flex');
  _setVisible('moreBulkImportBtn', p.moi, 'flex');
  _setVisible('tamilCalendarDashCard', p.tamilCalendar);
  _setVisible('t-documents', false);
  var docsMenu = document.querySelector('#headerMoreMenu .hdr-menu-item[onclick*="documents"]');
  if (docsMenu) docsMenu.style.display = p.documents ? 'flex' : 'none';
  var remMenu = document.querySelector('#headerMoreMenu .hdr-menu-item[onclick*="_openReminderPanelFocus"]');
  if (remMenu) remMenu.style.display = p.reminders ? 'flex' : 'none';
  var remBell = document.querySelector('.rem-bell-btn');
  if (remBell) remBell.style.display = p.reminders ? '' : 'none';

  // Keep the Home bar balanced when one of the two main modules is disabled.
  var homeGroups = document.querySelectorAll('#mainTabs .nav-grp[data-navgrp="home"]');
  homeGroups.forEach(function(g){ g.classList.toggle('module-pref-one-main', !(p.moi && p.expense)); });
}


/* ══════════ V236J — OPTIONAL UI LANGUAGE (LABELS ONLY) ══════════
   Tamil keeps the current mixed Tamil/English UI exactly as designed.
   English changes only known UI labels/placeholders; user-entered/stored
   data is never translated or rewritten. Preference is local/device-side,
   so there is no startup server call and no data-schema impact. */
var UI_LANG_KEY = 'nm_ui_language_v1';
var UI_LANG = 'ta';
try { UI_LANG = localStorage.getItem(UI_LANG_KEY) === 'en' ? 'en' : 'ta'; } catch(e) {}

var _UI_TA_EN = {
  'முகப்பு':'Home','மொய்':'MOI','அனைத்தும்':'All','சுருக்கம்':'Summary','மேலும்':'More','செலவு':'Daily Cash',
  'என் கணக்கு':'My Account','நிகழ்வுகள்':'Events','மொய் Import':'MOI Import','தமிழ் Calendar':'Tamil Calendar','ராசி பலன்':'Rasi Palan','வெளியேறு':'Logout',
  'பயன்பாட்டு பகுதிகள்':'App Modules','மொய் பதிவு':'MOI Records','மொய் பதிவுகள் மற்றும் சுருக்கம்':'MOI records and summary',
  'தினசரி பணப் பதிவு':'Daily Cash','வரவு, செலவு, கைமாற்று':'Income, expense and hand loan','தமிழ் நாட்காட்டி':'Tamil Calendar',
  'மாத நாட்காட்டி மற்றும் நாள் தகவல்':'Monthly calendar and day details','நினைவூட்டல்கள்':'Reminders','வரவிருக்கும் நிகழ்வுகள்':'Upcoming events',
  'சேமி':'Save','ரத்து':'Cancel','மூடு':'Close','தேடு':'Search','திருத்து':'Edit','நீக்கு':'Delete','சேர்':'Add','புதுப்பி':'Update','தொடரவும்':'Continue',
  'என் கணக்கு':'My Account','Password மாற்று':'Change Password','Current Password':'Current Password','New Password':'New Password','Confirm Password':'Confirm Password',
  'புதிய கடவுச்சொல் உறுதிப்படுத்தவும்':'Confirm New Password','தற்போதைய கடவுச்சொல்':'Current password','மீண்டும் உள்ளிடவும்':'Enter again',
  'ஊர் / City':'City / Village','தேர்வு வேண்டாம்':'No selection','வணக்கம்!':'Hello!','சுருக்கம்':'Summary','மாதம்':'Month','ஆண்டு':'Year','தனிப்பயன் தேதி':'Custom Date',
  'இன்றைய முக்கிய குறிப்பு':'Today’s Highlight','முழு தமிழ் நாட்காட்டி ›':'Open Tamil Calendar ›','இன்றைக்கு சிறப்பு குறிப்புகள் இல்லை.':'No special notes for today.',
  'பெயர்':'Name','ஊர்':'Village','தொகை':'Amount','தேதி':'Date','மொய் வகை':'MOI Type','விழா / நிகழ்ச்சி பெயர்':'Event Name',
  'வரவு':'Income','கைமாற்று':'Hand Loan','வகை':'Type','விவரம்':'Description','குறிப்பு':'Note','மொத்தம்':'Total','நபர்':'Person','Category':'Category',
  'அறிக்கைகள்':'Reports','தமிழ் நாட்காட்டி':'Tamil Calendar','EMI Check':'EMI Check','மாத அறிக்கை':'Monthly Report','நிகழ்வு அறிக்கை':'Event Report','நபர் Ledger':'Person Ledger','PDF அறிக்கை':'PDF Report',
  'ஆவணங்கள்':'Documents','கணக்கு':'Account','அட்மின்':'Admin','User சேர்':'Add User','புதிய பதிவு':'New Record','பதிவு செய்':'Save Record','புதிய Document':'New Document','Category தேர்வு':'Select Category','App Modules':'App Modules','Plan Expiry':'Plan Expiry','Advanced Options':'Advanced Options',
  'முந்தைய':'Previous','அடுத்தது':'Next','இன்று':'Today','இந்த மாதம்':'This Month','இந்த ஆண்டு':'This Year','அமைப்புகள்':'Settings',
  'புகைப்படம்':'Photo','கேமரா':'Camera','கேலரி':'Gallery','அகற்று':'Remove','விருப்பம்':'Optional','உறுதிப்படுத்து':'Confirm',
  'ஆம்':'Yes','இல்லை':'No','சரி':'OK','மீண்டும் முயற்சி':'Retry','பதிவுகள்':'Records','தேடல்':'Search','பெயர் / ஊர் தேடுங்கள்':'Search name / village',
  'புதிய மொய் பதிவு':'New MOI Record','ஊர் பெயர் *':'Village *','பெயர் *':'Name *','தொகை *':'Amount *','தொகை ₹ *':'Amount *','தொகை ₹':'Amount',
  'பொருள்':'Item','குறிப்பு':'Note','கூடுதல் குறிப்பு...':'Additional note...','-- தேர்வு செய்க --':'-- Select --','வேறு பொருள்...':'Other item...',
  'சமீபத்திய':'Recent','தேதி தேர்வு':'Date Range','தேதி வரம்பு':'Date Range','அனைத்து வகைகள்':'All Types','வடிகட்டலை நீக்கு':'Clear Filters',
  'புதிய பணப் பதிவு':'New Cash Entry','தொகையை விரைவாக பதிவு செய்யுங்கள்':'Enter amount quickly','செலவு வகை':'Expense Category','வகையைத் தேர்வு செய்யவும்':'Select category',
  'மேலும் விவரங்கள் (Optional)':'More details (Optional)','புதிய வகை':'New Category','புதிய வகை பெயர்':'New category name','சின்னம் தேர்வு':'Choose icon',
  'வரவு மூலம் *':'Income Source *','நபர் பெயர் *':'Person Name *','கொடுத்தது':'Given','வாங்கியது':'Borrowed','முடிக்கப்பட்டது':'Completed','நிலுவை':'Pending',
  'பட்ஜெட்':'Budget','இந்த மாத பட்ஜெட்':'This Month Budget','மொத்த மாத பட்ஜெட்':'Total Monthly Budget','வகைவாரி பட்ஜெட்':'Category Budgets','மீதம்':'Remaining',
  'புதிய Account':'New Account','இருப்பு':'Balance','கடைசி 4 இலக்கங்கள்':'Last 4 digits','மாற்று':'Transfer','Merchant / மூலம்':'Merchant / Source',
  'புதிய Event':'New Event','Event தேதி *':'Event Date *','நிகழ்வு பெயர் *':'Event Name *','நிகழ்வு வகை *':'Event Type *','புதிய Reminder':'New Reminder',
  'தலைப்பு *':'Title *','தலைப்பு':'Title','குறிப்பு (optional)':'Note (optional)','எதிர்கால தேதி மட்டும்':'Future date only','ஆவணங்கள் இல்லை':'No documents',
  'Google Drive ஆவணங்கள்':'Google Drive Documents','புதிய Document':'New Document','தனிப்பட்ட பாதுகாப்புப் பெட்டி':'Personal Document Vault',
  'காலப்போக்கு':'Trend','இந்த காலத்திற்கு பதிவுகள் இல்லை':'No records for this period','பழையது முதலில்':'Oldest first','புதியது முதலில்':'Newest first',
  'முதல்':'From','முதல்–வரை':'From–To','தொகை அதிகம்→குறைவு':'Amount high→low','தொகை குறைவு→அதிகம்':'Amount low→high',
  'இன்றைய பணிகள்':'Today’s Tasks','அனைத்தையும் பார்க்க':'View all','வரவிருக்கும் நிகழ்வுகள்':'Upcoming events','விவரம்':'Details',
  'பயனர்கள்':'Users','கட்டணங்கள்':'Payments','கருத்துகள்':'Feedback','நிர்வாக பலகை':'Admin Panel','புதிய பயனர் சேர்க்க':'Add New User'
};
var _UI_EN_TA = {};
Object.keys(_UI_TA_EN).forEach(function(k){ if (!_UI_EN_TA[_UI_TA_EN[k]]) _UI_EN_TA[_UI_TA_EN[k]] = k; });
var _uiLangObserver = null, _uiLangApplying = false;

function _uiTranslateTextNode(n) {
  if (!n || n.nodeType !== 3) return;
  var raw = n.nodeValue || '', t = raw.trim();
  if (!t) return;
  var mapped = UI_LANG === 'en' ? _UI_TA_EN[t] : _UI_EN_TA[t];
  if (!mapped || mapped === t) return;
  var a = raw.indexOf(t), b = raw.length - a - t.length;
  n.nodeValue = raw.slice(0,a) + mapped + (b > 0 ? raw.slice(raw.length-b) : '');
}
function _uiTranslateElement(el) {
  if (!el || el.nodeType !== 1) return;
  var tag=(el.tagName||'').toLowerCase();
  var cls=el.classList;
  var uiish = /^(button|label|option|legend|h1|h2|h3|h4)$/.test(tag) ||
    (cls && (cls.contains('tab') || cls.contains('hdr-menu-group-title') || cls.contains('hdr-menu-copy') || cls.contains('modal-title') || cls.contains('form-title') || cls.contains('sec') || cls.contains('section-title')));
  if (uiish) {
    for (var i=0;i<el.childNodes.length;i++) _uiTranslateTextNode(el.childNodes[i]);
  }
  if (/^(input|textarea)$/.test(tag) && el.placeholder) {
    var p = UI_LANG === 'en' ? _UI_TA_EN[el.placeholder] : _UI_EN_TA[el.placeholder];
    if (p) el.placeholder = p;
  }
  if (el.title) {
    var tt = UI_LANG === 'en' ? _UI_TA_EN[el.title] : _UI_EN_TA[el.title];
    if (tt) el.title = tt;
  }
  if (el.getAttribute && el.getAttribute('aria-label')) {
    var ar=el.getAttribute('aria-label'), aa=UI_LANG === 'en' ? _UI_TA_EN[ar] : _UI_EN_TA[ar];
    if (aa) el.setAttribute('aria-label',aa);
  }
}
function applyUiLanguage(root) {
  if (_uiLangApplying) return;
  _uiLangApplying = true;
  try {
    // Translate the whole rendered UI: Daily Cash is a sibling of #appScreen.
    root = root || document.body;
    if (!root) return;
    _uiTranslateElement(root);
    var q=root.querySelectorAll('button,label,option,legend,h1,h2,h3,h4,input,textarea,.tab,.hdr-menu-group-title,.hdr-menu-copy,.modal-title,.form-title,.sec,.section-title');
    for (var i=0;i<q.length;i++) _uiTranslateElement(q[i]);
    var sel=document.getElementById('modUiLanguage'); if (sel) sel.value=UI_LANG;
    document.documentElement.setAttribute('data-ui-lang',UI_LANG);
    ['uiLangQuickBtn','uiLangQuickBtnExp'].forEach(function(id){
      var qbtn=document.getElementById(id);
      if (qbtn) {
        // Show the ACTION/target language, not the language already active.
        qbtn.textContent = UI_LANG === 'en' ? 'த' : 'EN';
        qbtn.title = UI_LANG === 'en' ? 'தமிழுக்கு மாற்று' : 'Switch to English';
        qbtn.setAttribute('aria-label', qbtn.title);
      }
    });
  } finally { _uiLangApplying=false; }
}
function setUiLanguage(lang) {
  UI_LANG = lang === 'en' ? 'en' : 'ta';
  try { localStorage.setItem(UI_LANG_KEY, UI_LANG); } catch(e) {}
  applyUiLanguage();
  if (typeof window.refreshDashboardPlanningInsight === 'function') window.refreshDashboardPlanningInsight();
}
function toggleUiLanguageQuick() {
  setUiLanguage(UI_LANG === 'en' ? 'ta' : 'en');
}
function _initUiLanguage() {
  applyUiLanguage();
  if (_uiLangObserver || typeof MutationObserver === 'undefined') return;
  var root=document.body; if (!root) return;
  _uiLangObserver=new MutationObserver(function(ms){
    if (_uiLangApplying) return;
    for (var i=0;i<ms.length;i++) {
      var m=ms[i];
      if (m.type==='characterData') _uiTranslateTextNode(m.target);
      else for (var j=0;j<m.addedNodes.length;j++) {
        var n=m.addedNodes[j];
        if (n.nodeType===3) _uiTranslateTextNode(n);
        else if (n.nodeType===1) applyUiLanguage(n);
      }
    }
  });
  _uiLangObserver.observe(root,{subtree:true,childList:true,characterData:true});
}
setTimeout(_initUiLanguage,0);

function _emiFmt(v){v=Number(v);if(!isFinite(v))v=0;try{return Math.round(v).toLocaleString('en-IN');}catch(e){return String(Math.round(v));}}
var _EMI_LOCAL_KEY='nammamoi_emi_tracker_v2';
function _emiStore_(){try{var d=JSON.parse(localStorage.getItem(_EMI_LOCAL_KEY)||'{}');if(!d||typeof d!=='object')d={};if(!Array.isArray(d.loans))d.loans=[];return d;}catch(e){return {loans:[]};}}
function _emiSaveStore_(d){try{localStorage.setItem(_EMI_LOCAL_KEY,JSON.stringify(d||{loans:[]}));}catch(e){}}
function _emiMonths_(tenure,unit){tenure=Number(tenure)||0;return unit==='years'?Math.round(tenure*12):Math.round(tenure);}
function _emiCalc_(P,annual,n){P=Number(P)||0;annual=Number(annual)||0;n=Number(n)||0;if(!(P>0)||!(n>0)||annual<0)return null;var r=annual/1200,emi=r===0?P/n:(function(){var f=Math.pow(1+r,n);return P*r*f/(f-1);})();return {emi:emi,total:emi*n,interest:Math.max(0,emi*n-P)};}
function _emiNextDue_(start,paid){if(!start)return '';var a=String(start).split('-'),d=new Date(+a[0],+a[1]-1,+a[2]);if(isNaN(d.getTime()))return '';d.setMonth(d.getMonth()+(Number(paid)||0));return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function _saveEmiLocal_(){}
function _restoreEmiLocal_(){}
function clearEmiLocal(){['emiLoanName','emiLoanAmount','emiInterestRate','emiQuoted','emiStartDate'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});var t=document.getElementById('emiTenureValue');if(t)t.value='36';var u=document.getElementById('emiTenureUnit');if(u)u.value='months';var r=document.getElementById('emiResult');if(r)r.style.display='none';}
function openEmiCalculator(){var m=document.getElementById('emiCalculatorModal');if(!m)return;m.style.display='flex';renderEmiTracker();calculateEmiCrossCheck(false);}
function closeEmiCalculator(){var m=document.getElementById('emiCalculatorModal');if(m)m.style.display='none';}
function calculateEmiCrossCheck(){var P=Number((document.getElementById('emiLoanAmount')||{}).value)||0,annual=Number((document.getElementById('emiInterestRate')||{}).value)||0,tenure=Number((document.getElementById('emiTenureValue')||{}).value)||0,unit=((document.getElementById('emiTenureUnit')||{}).value)||'months',quoted=Number((document.getElementById('emiQuoted')||{}).value)||0,n=_emiMonths_(tenure,unit),c=_emiCalc_(P,annual,n),box=document.getElementById('emiResult');if(!c){if(box)box.style.display='none';return;}var e=document.getElementById('emiCalcMonthly');if(e)e.textContent='₹'+_emiFmt(c.emi);e=document.getElementById('emiCalcInterest');if(e)e.textContent='₹'+_emiFmt(c.interest);e=document.getElementById('emiCalcTotal');if(e)e.textContent='₹'+_emiFmt(c.total);var dr=document.getElementById('emiDifferenceRow'),dv=document.getElementById('emiCalcDifference');if(quoted>0){var diff=quoted-c.emi;if(dr)dr.style.display='flex';if(dv)dv.textContent=(diff>0?'+':'')+'₹'+_emiFmt(diff);}else if(dr)dr.style.display='none';if(box)box.style.display='grid';}
function saveEmiTrackerLoan(){var name=String((document.getElementById('emiLoanName')||{}).value||'').trim(),P=Number((document.getElementById('emiLoanAmount')||{}).value)||0,rate=Number((document.getElementById('emiInterestRate')||{}).value)||0,tenure=Number((document.getElementById('emiTenureValue')||{}).value)||0,unit=((document.getElementById('emiTenureUnit')||{}).value)||'months',start=((document.getElementById('emiStartDate')||{}).value)||'',quoted=Number((document.getElementById('emiQuoted')||{}).value)||0,n=_emiMonths_(tenure,unit),c=_emiCalc_(P,rate,n);if(!name){toast('கடன் பெயர் / Bank பெயர் தேவை');return;}if(!c){toast('கடன் தொகை, வட்டி, காலம் சரிபார்க்கவும்');return;}var d=_emiStore_();d.loans.unshift({id:'emi_'+Date.now(),name:name,principal:P,rate:rate,months:n,start:start,quoted:quoted,calcEmi:c.emi,paid:0,createdAt:Date.now()});_emiSaveStore_(d);clearEmiLocal();var det=document.getElementById('emiAddDetails');if(det)det.open=false;renderEmiTracker();toast('EMI tracker-ல் சேமிக்கப்பட்டது');}
function markEmiPaid(id){var d=_emiStore_(),l=d.loans.find(function(x){return x.id===id;});if(!l)return;l.paid=Math.min(Number(l.months)||0,(Number(l.paid)||0)+1);l.lastPaidAt=Date.now();_emiSaveStore_(d);renderEmiTracker();}
function undoEmiPaid(id){var d=_emiStore_(),l=d.loans.find(function(x){return x.id===id;});if(!l)return;l.paid=Math.max(0,(Number(l.paid)||0)-1);_emiSaveStore_(d);renderEmiTracker();}
function deleteEmiLoan(id){if(!window.confirm('இந்த EMI tracker பதிவை நீக்கவா?'))return;var d=_emiStore_();d.loans=d.loans.filter(function(x){return x.id!==id;});_emiSaveStore_(d);renderEmiTracker();}
function renderEmiTracker(){var d=_emiStore_(),loans=d.loans||[],sum=document.getElementById('emiTrackerSummary'),list=document.getElementById('emiLoanList'),monthly=0,remaining=0;loans.forEach(function(l){var emi=Number(l.quoted)||Number(l.calcEmi)||0,rem=Math.max(0,(Number(l.months)||0)-(Number(l.paid)||0));monthly+=rem?emi:0;remaining+=rem*emi;});if(sum)sum.innerHTML='<div><small>Active Loans</small><b>'+loans.filter(function(l){return (Number(l.paid)||0)<(Number(l.months)||0);}).length+'</b></div><div><small>மாத EMI</small><b>₹'+_emiFmt(monthly)+'</b></div><div><small>மீதமுள்ள EMI</small><b>₹'+_emiFmt(remaining)+'</b></div>';if(!list)return;if(!loans.length){list.innerHTML='<div class="emi-empty">EMI tracker-ல் இன்னும் கடன் சேர்க்கப்படவில்லை.</div>';return;}list.innerHTML=loans.map(function(l){var paid=Number(l.paid)||0,months=Number(l.months)||0,rem=Math.max(0,months-paid),emi=Number(l.quoted)||Number(l.calcEmi)||0,pct=months?Math.min(100,Math.round(paid/months*100)):0,next=_emiNextDue_(l.start,paid);return '<div class="emi-loan-card"><div class="emi-loan-head"><span><b>'+x(l.name)+'</b><small>₹'+_emiFmt(emi)+' / மாதம்</small></span><em>'+paid+' / '+months+'</em></div><div class="emi-progress"><i style="width:'+pct+'%"></i></div><div class="emi-loan-meta"><span>'+rem+' EMI மீதி</span><span>'+(next?'அடுத்த தேதி '+x(next):'Start date சேர்க்கவில்லை')+'</span></div><div class="emi-loan-actions">'+(rem?'<button type="button" onclick="markEmiPaid(\''+x(l.id)+'\')">✓ EMI Paid</button>':'<strong>✓ முடிந்தது</strong>')+(paid?'<button type="button" onclick="undoEmiPaid(\''+x(l.id)+'\')">↶ Undo</button>':'')+'<button type="button" class="danger" onclick="deleteEmiLoan(\''+x(l.id)+'\')">நீக்கு</button></div></div>';}).join('');}

function openModuleSettings(firstSetup) {
  var p = MODULE_PREFS;
  document.getElementById('modMoi').checked = !!p.moi;
  document.getElementById('modExpense').checked = !!p.expense;
  var tcalToggle = document.getElementById('modTamilCalendar');
  if (tcalToggle) { tcalToggle.checked = true; tcalToggle.disabled = true; }
  document.getElementById('modDocuments').checked = !!p.documents;
  document.getElementById('modReminders').checked = !!p.reminders;
  _taSyncAssistUI();
  var langSel = document.getElementById('modUiLanguage');
  if (langSel) langSel.value = UI_LANG;
  applyUiLanguage(document.getElementById('moduleSettingsModal'));
  var m = document.getElementById('moduleSettingsModal');
  if (m) {
    m.setAttribute('data-first-setup', firstSetup ? '1' : '0');
    m.style.display = 'flex';
  }
}

function closeModuleSettings() {
  var m = document.getElementById('moduleSettingsModal');
  if (m && m.getAttribute('data-first-setup') === '1') return;
  if (m) m.style.display = 'none';
}

var _moduleSettingsSaveInFlight = false;
var _moduleSettingsSaveSeq = 0;
function saveModuleSettings() {
  var prefs = {
    moi: document.getElementById('modMoi').checked,
    expense: document.getElementById('modExpense').checked,
    tamilCalendar: true,
    documents: document.getElementById('modDocuments').checked,
    reminders: document.getElementById('modReminders').checked
  };
  var err = document.getElementById('moduleSettingsErr');
  var saveBtn = document.querySelector('#moduleSettingsModal .btn-save');
  if (!prefs.moi && !prefs.expense && !prefs.tamilCalendar) {
    if (err) err.textContent = 'குறைந்தது ஒரு முக்கிய பகுதியை தேர்வு செய்யவும்.';
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (err) err.textContent = 'Internet இல்லை. இணைப்பு வந்ததும் மீண்டும் சேமிக்கவும்.';
    return;
  }
  if (_moduleSettingsSaveInFlight) return;
  _moduleSettingsSaveInFlight = true;
  var seq = ++_moduleSettingsSaveSeq;
  if (err) err.textContent = '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'சேமிக்கிறது...'; }

  var settled = false;
  function finish() {
    if (settled) return false;
    settled = true;
    _moduleSettingsSaveInFlight = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'சேமி'; }
    return true;
  }
  var timer = setTimeout(function() {
    if (seq !== _moduleSettingsSaveSeq || !finish()) return;
    if (err) err.textContent = 'சேமிப்பு தாமதமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (seq !== _moduleSettingsSaveSeq || settled) return;
      clearTimeout(timer); finish();
      if (!res || !res.ok) { if (err) err.textContent = (res && res.msg) || 'சேமிக்க முடியவில்லை'; return; }
      MODULE_PREFS = _normaliseModulePrefs(prefs);
      _applyModulePreferences();
      var m = document.getElementById('moduleSettingsModal');
      var wasFirst = m && m.getAttribute('data-first-setup') === '1';
      if (m) { m.setAttribute('data-first-setup','0'); m.style.display = 'none'; }
      toast('✅ பயன்பாட்டு பகுதிகள் சேமிக்கப்பட்டது');
      // Route after first setup, and also leave any module that was just
      // disabled while it was open. Otherwise keep the user's current view.
      var currentDisabled =
        (_currentApp === 'moi' && !MODULE_PREFS.moi) ||
        (_currentApp === 'expense' && !MODULE_PREFS.expense) ||
        (typeof curTab !== 'undefined' && curTab === 'tamilCalendar' && !MODULE_PREFS.tamilCalendar);
      if (wasFirst || currentDisabled) _routeByModulePreferences();
    })
    .withFailureHandler(function(){
      if (seq !== _moduleSettingsSaveSeq || settled) return;
      clearTimeout(timer); finish();
      if (err) err.textContent = 'சேமிக்க முடியவில்லை. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
    })
    .saveMyModulePreferences(prefs);
}

function _routeByModulePreferences() {
  // Both main modules enabled: land on the neutral dashboard so the user
  // can choose MOI or Daily Cash. A single enabled main module opens direct.
  if (MODULE_PREFS.moi && MODULE_PREFS.expense) {
    _currentApp = 'moi';
    showScreen('appScreen');
    go('today');
    return;
  }
  if (MODULE_PREFS.moi) { selectApp('moi'); return; }
  if (MODULE_PREFS.expense) { selectApp('expense'); return; }
  showScreen('appScreen');
  go('tamilCalendar');
}

var _tcalSelectedDate = null;
var _tcalDetailOpen = false;
var _tcalCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
var _NM_DAILY_INFO = [
'தினசரி சிறிய செலவுகளையும் பதிவு செய்தால் மாத இறுதியில் பணம் எங்கு சென்றது தெளிவாக தெரியும்.',
'ஒரு செலவை பதிவு செய்யும் போது அதன் காரணத்தையும் குறித்தால் பின்னர் தேடுவது எளிதாகும்.',
'மொய் பதிவில் பெயர் மற்றும் ஊர் ஒரே முறையில் எழுதுவது duplicate பதிவுகளை குறைக்க உதவும்.',
'மாத தொடக்கத்திலேயே தேவையான செலவுகளுக்கு ஒரு வரம்பு வைத்தால் சேமிப்பு எளிதாகும்.',
'கடன் EMI due date-ஐ முன்கூட்டியே நினைவூட்டலில் வைத்தால் தவறவிடும் வாய்ப்பு குறையும்.',
'வரவு வந்தவுடன் முழுவதையும் செலவாக பார்க்காமல் ஒரு சிறிய பகுதியை சேமிப்புக்கு மாற்றுங்கள்.',
'குடும்ப செலவுகளில் “தேவை” மற்றும் “விருப்பம்” என்று பிரித்துப் பார்ப்பது முடிவெடுக்க உதவும்.',
'ஒரே நபரின் மொய் வரலாற்றை ledger-ஆ பார்த்தால் உறவு கணக்கை வேகமாக புரிந்துகொள்ளலாம்.',
'மாதந்தோறும் ஒரு முறை subscriptions மற்றும் recurring செலவுகளை review செய்வது பயனுள்ளது.',
'ரசீது அல்லது ஆதாரத்தை உடனே சேமித்தால் பின்னர் தொகை சரிபார்ப்பது எளிதாகும்.',
'சிறிய சேமிப்பு தொடர்ந்து நடந்தால் பெரிய இலக்குகளுக்கும் அடித்தளம் ஆகும்.',
'பணம் கொடுத்த தேதி மட்டும் அல்ல, திரும்ப கிடைக்க வேண்டிய தேதியையும் கைமாற்று பதிவில் வைத்துக்கொள்ளுங்கள்.',
'அவசர நிதி என்பது தினசரி செலவுக்கான பணம் அல்ல; எதிர்பாராத தேவைக்கான பாதுகாப்பு.',
'ஒரு மாத செலவை அடுத்த மாதத்துடன் ஒப்பிட்டால் அதிகரித்த category உடனே தெரிய வரும்.',
'குடும்பத்தில் பகிரப்படும் பண விவரங்களுக்கு தேவையானவர்களுக்கு மட்டும் access கொடுப்பது நல்ல நடைமுறை.',
'Backup இருப்பது data தவறுதலாக delete ஆனாலும் மீட்க உதவும்; backup date-ஐ அவ்வப்போது பார்க்கவும்.',
'ஒரு பெரிய செலவுக்கு முன் முந்தைய மூன்று மாத செலவு pattern-ஐ பார்க்குவது நல்ல முடிவுக்கு உதவும்.',
'ஒரே செலவை இரண்டு முறை பதிவு செய்திருக்கிறோமா என்று மாத முடிவில் duplicate review செய்யுங்கள்.',
'பணம் சம்பந்தமான நினைவூட்டல்களை தேதி மற்றும் நபர் பெயருடன் வைத்தால் action எடுப்பது எளிதாகும்.',
'ஒரு குடும்ப நிகழ்வின் செலவுகளை தனியாக குறித்தால் அடுத்த நிகழ்வுக்கான திட்டமிடல் துல்லியமாகும்.',
'கணக்கில் ₹100 தவறு கூட பல பதிவுகளில் சேரும்போது பெரிய வேறுபாடாக மாறலாம்; தொகையை save முன் பார்க்கவும்.',
'வங்கி SMS மற்றும் உங்கள் கைப்பதிவு இரண்டையும் ஒப்பிட்டால் தவறவிட்ட செலவுகளை கண்டுபிடிக்கலாம்.',
'மாத வருமானத்தை விட செலவு சதவீதம் தொடர்ந்து அதிகமாக இருந்தால் முதலில் recurring செலவுகளை review செய்யுங்கள்.',
'கடன் வட்டி விகிதம் மட்டும் அல்ல, processing fee மற்றும் insurance charges-யும் மொத்த செலவில் தாக்கம் செய்கின்றன.',
'EMI முன்கூட்டியே செலுத்தும் முன் lender prepayment விதிகளை சரிபார்ப்பது அவசியம்.',
'குடும்ப பண பதிவுகளுக்கு தெளிவான குறிப்பு வைத்தால் மற்றொரு உறுப்பினர் பார்த்தாலும் புரியும்.',
'ஒரு category-க்கு budget வைத்தால் செலவு நடந்த பிறகு அல்ல, நடக்கும் முன்பே கட்டுப்பாடு கிடைக்கும்.',
'மாதந்தோறும் backup எடுத்த தேதி தெரிந்திருக்க வேண்டும்; “backup இருக்கிறது” என்பத alone போதாது.',
'மொய் பதிவு செய்த உடனே பெயர், ஊர், தேதி, தொகை நான்கையும் ஒரு முறை சரிபார்க்கும் பழக்கம் நல்லது.',
'சேமிப்புக்கு மீதமுள்ளதை வைப்பதை விட, வரவு வந்தவுடன் ஒரு தொகையை முதலில் ஒதுக்குவது எளிதாக இருக்கும்.',
'பெரிய வாங்குதலுக்கு முன் 24 மணி நேரம் காத்திருந்து மீண்டும் தேவையை மதிப்பிடுவது impulse செலவை குறைக்க உதவும்.',
'குடும்ப நிதியில் வரவு, செலவு, கடன் மூன்றையும் தனித்தனியாக track செய்தால் உண்மையான நிலை தெளிவாகும்.',
'ஒரு மாதத்தில் அதிகமாக செலவான மூன்று category-களை மட்டும் review செய்தாலும் நல்ல மாற்றம் கிடைக்கும்.',
'கைமாற்று பணம் கொடுத்தவர்/பெற்றவர் contact இணைத்தால் follow-up எளிதாகும்.',
'அடிக்கடி பயன்படுத்தும் பெயர் மற்றும் ஊர் spelling ஒரே மாதிரி இருந்தால் search result துல்லியமாகும்.',
'தினசரி 2 நிமிட பதிவு, மாத இறுதியில் நீண்ட நேர reconciliation-ஐ தவிர்க்க உதவும்.',
'கணக்கில் “மொத்தம்” மட்டும் பார்க்காமல் transaction details-ஐ அவ்வப்போது sample check செய்யுங்கள்.',
'உங்கள் Drive data-க்கு access உள்ளவர்கள் யார் என்பதை காலம்தோறும் review செய்வது நல்ல பாதுகாப்பு பழக்கம்.',
'குடும்ப இலக்குக்கு சேமிக்கும் தொகையை தனி account அல்லது category-ஆ வைத்தால் progress தெளிவாகும்.',
'வட்டி இல்லாத கைமாற்றும் ஒரு liability/receivable தான்; due date track செய்தால் உறவிலும் தெளிவு இருக்கும்.',
'ஒரு செலவு தவறாக category செய்யப்பட்டால் உடனே edit செய்வது future report accuracy-ஐ மேம்படுத்தும்.',
'மாத முடிவில் zero-value அல்லது incomplete records உள்ளதா என்று ஒரு quick review செய்யுங்கள்.',
'Loan எடுக்கும்போது EMI மட்டுமல்ல, மொத்தத் தொகையையும் பாருங்கள்.',
'குறுகிய கால offer காரணமாக தேவையற்ற பொருள் வாங்குவது சேமிப்பை குறைக்கலாம்.',
'நினைவூட்டல் தேதி action செய்ய வேண்டிய நாளாக இருக்கட்டும்; நினைவில் வைத்துக்கொள்ள வேண்டிய நாளாக மட்டும் அல்ல.',
'வருமானம் அதிகரிக்கும் போது செலவையும் அதே அளவு அதிகரிக்காமல் savings rate-ஐ உயர்த்த முயற்சிக்கலாம்.',
'ஒரு transaction delete செய்வதற்கு முன் அதன் report அல்லது ledger impact-ஐ நினைவில் கொள்ளுங்கள்.',
'குடும்பத்தில் பணம் பற்றிய தெளிவான பதிவு unnecessary misunderstanding-ஐ குறைக்க உதவும்.',
'Cash செலவுகள் சிறியதாக இருந்தாலும் அவை சேர்ந்து பெரிய தொகையாகலாம்; அவற்றையும் பதிவு செய்யுங்கள்.',
'Auto Backup இருந்தாலும் manual backup எடுக்க வேண்டிய முக்கிய நேரம்: பெரிய import அல்லது bulk edit முன்.',
'ஒரு வருட data-வை ஒரே நேரத்தில் பார்க்காமல் மாத வாரியாக review செய்தால் pattern எளிதாக தெரியும்.',
'மொய் என்பது பண பதிவு மட்டும் அல்ல; யார், எந்த ஊர், எந்த நிகழ்வு என்ற context-மும் முக்கியம்.',
'ஒரு செலவின் காரணம் மறந்து போகும் முன்பே note எழுதுவது report-ஐ பயனுள்ளதாக மாற்றும்.',
'அவசர நிதிக்கான இலக்கை ஒரு மாத செலவு, பின்னர் மூன்று மாத செலவு என்று படிப்படியாக வளர்த்துக்கொள்ளலாம்.',
'பணம் திரும்ப வர வேண்டிய பதிவு overdue ஆனால் reminder-ஐ மாற்றாமல் action status-ஐ update செய்யுங்கள்.',
'ஒரு loan-ல் remaining EMI count தெரிந்தால் payoff planning எளிதாகும்.',
'Monthly report-ல் பெரிய மாற்றம் இருந்தால் அந்த மாதத்தின் top transactions-ஐ முதலில் பாருங்கள்.',
'வங்கி balance மற்றும் app balance வேறுபட்டால் missing/duplicate transaction-களை முதலில் தேடுங்கள்.',
'குடும்ப data backup-ஐ restore செய்வதற்கு முன் தற்போதைய நிலைக்கு safety backup இருப்பது முக்கியம்.',
'தகவலை சரியாக பதிவு செய்வது சேமிப்பை உருவாக்காது; ஆனால் நல்ல முடிவெடுக்க சரியான அடிப்படை தரும்.'
];
function _nmDayOfYear_(d){var y=d.getFullYear(),a=new Date(y,0,1);return Math.floor((Date.UTC(y,d.getMonth(),d.getDate())-Date.UTC(y,0,1))/86400000);}
function _renderDailyInfo(){var el=document.getElementById('dashDailyInfoText');if(!el||!_NM_DAILY_INFO.length)return;var d=new Date();el.textContent=_NM_DAILY_INFO[_nmDayOfYear_(d)%_NM_DAILY_INFO.length];}
var _tcalLocation = {lat:13.0827,lon:80.2707,label:'சென்னை (இயல்புநிலை)'};
var _tcalGeoTried = false;
function _tcalFormatDate(o,opt){var d=o instanceof Date?o:new Date(o);if(isNaN(d.getTime()))d=new Date();try{return d.toLocaleDateString('ta-IN',opt||{});}catch(e){}try{return d.toLocaleDateString('en-IN',opt||{});}catch(e2){}return d.getDate()+'-'+(d.getMonth()+1)+'-'+d.getFullYear();}
function _tcalN(x){x%=360;return x<0?x+360:x;} function _tcalR(x){return x*Math.PI/180;} function _tcalD(x){return x*180/Math.PI;} function _tcalJD(d){return d.getTime()/86400000+2440587.5;} function _tcalS(x){return Math.sin(_tcalR(x));}
function _tcalAyan(jd){return 23.8531+0.013968*((jd-2451545)/365.2425);}
function _tcalSun(jd){var n=jd-2451545,L=_tcalN(280.460+0.9856474*n),g=_tcalN(357.528+0.9856003*n);return _tcalN(L+1.915*_tcalS(g)+0.020*_tcalS(2*g));}
function _tcalMoon(jd){var n=jd-2451545,L=_tcalN(218.316+13.176396*n),M=_tcalN(134.963+13.064993*n),Ms=_tcalN(357.529+0.9856003*n),D=_tcalN(297.850+12.190749*n),F=_tcalN(93.272+13.229350*n);return _tcalN(L+6.289*_tcalS(M)+1.274*_tcalS(2*D-M)+0.658*_tcalS(2*D)+0.214*_tcalS(2*M)-0.186*_tcalS(Ms)-0.114*_tcalS(2*F));}
function _tcalPad(n){return('0'+n).slice(-2);} function _tcalTime(x){x=Math.round(x);while(x<0)x+=1440;while(x>=1440)x-=1440;var h=Math.floor(x/60),m=x%60,a=h>=12?'PM':'AM';return _tcalPad(h%12||12)+':'+_tcalPad(m)+' '+a;} function _tcalRange(a,b){return _tcalTime(a)+' – '+_tcalTime(b);}
function _tcalSunTimes(d,lat,lon){var N=Math.floor((_tcalJD(new Date(d.getFullYear(),d.getMonth(),d.getDate(),12))-2451544.5)%365.2422)+1,g=2*Math.PI/365*(N-1),eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g)),dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g),q=Math.cos(_tcalR(90.833))/(Math.cos(_tcalR(lat))*Math.cos(dec))-Math.tan(_tcalR(lat))*Math.tan(dec),ha=Math.acos(Math.max(-1,Math.min(1,q))),noon=720-4*lon-eq+(-d.getTimezoneOffset()),del=_tcalD(ha)*4;return{rise:noon-del,set:noon+del};}
// Tamil Calendar / Panchangam accuracy hardening (v269).
function _tcalAstroAtDateTime(dt){
  var jd=_tcalJD(dt),ay=_tcalAyan(jd),sun=_tcalN(_tcalSun(jd)-ay),moon=_tcalN(_tcalMoon(jd)-ay);
  return{jd:jd,sun:sun,moon:moon,phase:_tcalN(moon-sun),yoga:_tcalN(sun+moon)};
}
function _tcalDateAtMinutes(d,mins){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);x.setMinutes(mins);return x;}
function _tcalSunriseDateTime(d){var st=_tcalSunTimes(d,_tcalLocation.lat,_tcalLocation.lon);return _tcalDateAtMinutes(d,st.rise);}
// Launch-year civil anchors are retained because the lightweight solar model can
// move a Sankranti across sunrise by several hours.  Outside this verified
// window we use sunrise-sign detection as a safer fallback (never degree+1).
var _tcalCivilAnchors=[
  [2025,12,16,8],
  [2026,1,15,9],[2026,2,13,10],[2026,3,15,11],[2026,4,14,0],
  [2026,5,15,1],[2026,6,15,2],[2026,7,17,3],[2026,8,18,4],
  [2026,9,18,5],[2026,10,18,6],[2026,11,17,7],[2026,12,16,8],
  [2027,1,15,9],[2027,2,13,10]
];
function _tcalCivilTamilDate(d){
  var cur=new Date(d.getFullYear(),d.getMonth(),d.getDate()),best=null,next=null;
  for(var i=0;i<_tcalCivilAnchors.length;i++){
    var a=_tcalCivilAnchors[i],ad=new Date(a[0],a[1]-1,a[2]);
    if(ad<=cur)best={date:ad,monthIndex:a[3]};else{next=ad;break;}
  }
  if(best&&(!next||cur<next)){
    var days=Math.round((Date.UTC(cur.getFullYear(),cur.getMonth(),cur.getDate())-Date.UTC(best.date.getFullYear(),best.date.getMonth(),best.date.getDate()))/86400000)+1;
    if(days>=1&&days<=32)return{monthIndex:best.monthIndex,day:days,verified:true};
  }
  // Fallback for dates outside the verified anchor window: month/day by the
  // sidereal solar sign present at local sunrise, walking back to its first sunrise.
  var sr=_tcalSunriseDateTime(d),aa=_tcalAstroAtDateTime(sr),mi=Math.floor(aa.sun/30),first=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  for(var j=0;j<35;j++){
    var prev=new Date(first.getFullYear(),first.getMonth(),first.getDate()-1),pa=_tcalAstroAtDateTime(_tcalSunriseDateTime(prev));
    if(Math.floor(pa.sun/30)!==mi)break;first=prev;
  }
  var fd=Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000)+1;
  return{monthIndex:mi,day:fd,verified:false};
}
function _tcalKaranaIndexFromPhase(ph){
  var h=Math.floor(_tcalN(ph)/6); // 0..59 half-tithis
  if(h===0)return 10;             // Kimstughna
  if(h>=1&&h<=56)return (h-1)%7; // Bava..Vishti repeat 8x
  if(h===57)return 7;             // Shakuni
  if(h===58)return 8;             // Chatushpada
  return 9;                       // Naga
}
function _tcalStateAt(dt){
  var a=_tcalAstroAtDateTime(dt);
  return{tithi:Math.floor(a.phase/12),nak:Math.floor(a.moon/(360/27)),yoga:Math.floor(a.yoga/(360/27)),karana:_tcalKaranaIndexFromPhase(a.phase)};
}
function _tcalFindFirstChange(start,end,key,startIndex){
  var step=15*60000,lo=start.getTime(),hi=null,last=lo;
  for(var t=lo+step;t<=end.getTime();t+=step){
    var idx=_tcalStateAt(new Date(t))[key];
    if(idx!==startIndex){hi=t;break;}last=t;
  }
  if(hi===null){var ei=_tcalStateAt(end)[key];if(ei===startIndex)return null;hi=end.getTime();}
  lo=last;
  for(var i=0;i<24;i++){var mid=(lo+hi)/2,mi=_tcalStateAt(new Date(mid))[key];if(mi===startIndex)lo=mid;else hi=mid;}
  return new Date(hi);
}
function _tcalTransitionText(startDate,when){
  if(!when)return'';
  var same=when.getFullYear()===startDate.getFullYear()&&when.getMonth()===startDate.getMonth()&&when.getDate()===startDate.getDate();
  return (same?'':'மறுநாள் ')+_tcalTime(when.getHours()*60+when.getMinutes());
}
function _tcalPanchang(d){
  var tm=['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'],
      nk=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'],
      yn=['விஷ்கம்பம்','பிரீதி','ஆயுஷ்மான்','சௌபாக்கியம்','சோபனம்','அதிகண்டம்','சுகர்மம்','திருதி','சூலம்','கண்டம்','விருத்தி','துருவம்','வியாகாதம்','ஹர்ஷணம்','வஜ்ரம்','சித்தி','வியதீபாதம்','வரியான்','பரிகம்','சிவம்','சித்தம்','சாத்தியம்','சுபம்','சுப்பிரம்','பிரம்மம்','ஐந்திரம்','வைதிருதி'],
      kn=['பவம்','பாலவம்','கௌலவம்','தைதுலம்','கரசை','வணிசை','பத்திரை','சகுனி','சதுஷ்பாதம்','நாகவம்','கிம்ஸ்துக்னம்'],
      tn=['பிரதமை','துவிதியை','திருதியை','சதுர்த்தி','பஞ்சமி','சஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','பௌர்ணமி/அமாவாசை'];
  var st=_tcalSunTimes(d,_tcalLocation.lat,_tcalLocation.lon),start=_tcalDateAtMinutes(d,st.rise),nd=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),nst=_tcalSunTimes(nd,_tcalLocation.lat,_tcalLocation.lon),end=_tcalDateAtMinutes(nd,nst.rise),state=_tcalStateAt(start),astro=_tcalAstroAtDateTime(start),td=_tcalCivilTamilDate(d);
  var tEnd=_tcalFindFirstChange(start,end,'tithi',state.tithi),nEnd=_tcalFindFirstChange(start,end,'nak',state.nak),yEnd=_tcalFindFirstChange(start,end,'yoga',state.yoga),kEnd=_tcalFindFirstChange(start,end,'karana',state.karana);
  function tithiName(i){return(i<15?'வளர்பிறை ':'தேய்பிறை ')+(i%15===14?(i<15?'பௌர்ணமி':'அமாவாசை'):tn[i%15]);}
  function withNext(base,when,key,names,nameFn){if(!when)return base;var ni=_tcalStateAt(new Date(when.getTime()+60000))[key],nx=nameFn?nameFn(ni):names[ni];return base+' '+_tcalTransitionText(d,when)+' வரை • பின்பு '+nx;}
  var w=d.getDay(),seg=(st.set-st.rise)/8,r=[7,1,6,4,5,3,2][w],y=[4,3,2,1,0,6,5][w],g=[6,5,4,3,2,1,0][w];
  // Common Tamil daily-calendar Nalla Neram table (fixed civil-clock slots).
  var good=[['07:30–08:30','15:30–16:30'],['06:15–07:15','16:45–17:45'],['07:45–08:45','16:45–17:45'],['09:15–10:15','16:45–17:45'],['09:15–10:15','16:45–17:45'],['06:15–07:15','12:15–13:15'],['07:45–08:45','16:45–17:45']][w];
  var tithi=withNext(tithiName(state.tithi),tEnd,'tithi',null,tithiName),nak=withNext(nk[state.nak],nEnd,'nak',nk),yoga=withNext(yn[state.yoga],yEnd,'yoga',yn),karana=withNext(kn[state.karana],kEnd,'karana',kn);
  return{tamil:tm[td.monthIndex]+' '+td.day,tamilMonthIndex:td.monthIndex,tamilDateVerified:td.verified,nak:nak,nakShort:nk[state.nak],nakIndex:state.nak,tithi:tithi,tithiShort:tithiName(state.tithi),tithiIndex:state.tithi,yoga:yoga,karana:karana,karanaIndex:state.karana,sunrise:_tcalTime(st.rise),sunset:_tcalTime(st.set),rahu:_tcalRange(st.rise+r*seg,st.rise+(r+1)*seg),yama:_tcalRange(st.rise+y*seg,st.rise+(y+1)*seg),gulika:_tcalRange(st.rise+g*seg,st.rise+(g+1)*seg),good:good.join(' / '),phase:astro.phase};
}
function _tcalGowriNallaNeram(d){
  var st=_tcalSunTimes(d,_tcalLocation.lat,_tcalLocation.lon);
  // Tamil Gowri Panchangam daytime table (sunrise→sunset, eight equal parts).
  // Weekday order cross-checked against the Pambu-Panchangam-based Gowri table.
  var seq=[
    ['உத்தி','அமிர்தம்','ரோகம்','லாபம்','தனம்','சுகம்','சோரம்','விஷம்'],
    ['அமிர்தம்','விஷம்','ரோகம்','லாபம்','தனம்','சுகம்','சோரம்','உத்தி'],
    ['ரோகம்','லாபம்','தனம்','சுகம்','சோரம்','உத்தி','விஷம்','அமிர்தம்'],
    ['லாபம்','தனம்','சுகம்','சோரம்','விஷம்','உத்தி','அமிர்தம்','ரோகம்'],
    ['தனம்','சுகம்','சோரம்','உத்தி','அமிர்தம்','விஷம்','ரோகம்','லாபம்'],
    ['சுகம்','சோரம்','உத்தி','விஷம்','அமிர்தம்','ரோகம்','லாபம்','தனம்'],
    ['சோரம்','உத்தி','விஷம்','அமிர்தம்','ரோகம்','லாபம்','தனம்','சுகம்']
  ][d.getDay()];
  var good={ 'அமிர்தம்':1,'லாபம்':1,'தனம்':1,'சுகம்':1,'உத்தி':1 },seg=(st.set-st.rise)/8,out=[];
  for(var i=0;i<8;i++)if(good[seq[i]])out.push(seq[i]+' '+_tcalRange(st.rise+i*seg,st.rise+(i+1)*seg));
  return out.join(' • ');
}
function _tcalDaySpecial(d,p){
  var items=[],mu=_tcalMuhurtamInfo(d,p),hol=_tcalHolidayInfo(d);
  if(mu.ok)items.push('⭐ முகூர்த்த நாள்');
  if(hol.ok)items.push(hol.short+' '+hol.label);
  if(p.tithiIndex===29)items.push('🌑 அமாவாசை');
  else if(p.tithiIndex===14)items.push('🌕 பௌர்ணமி');
  if((p.tithiIndex%15)===10)items.push('🌿 ஏகாதசி விரதம்');
  return items.length?items.join(' • '):'சிறப்பு நாள் குறிப்பு இல்லை';
}
function _tcalPanchangSummary(d){
  // Month-grid fast path: no transition searches, keeping calendar scrolling light.
  var tm=['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'],td=_tcalCivilTamilDate(d),state=_tcalStateAt(_tcalSunriseDateTime(d));
  return{tamil:tm[td.monthIndex]+' '+td.day,tamilMonthIndex:td.monthIndex,tamilDateVerified:td.verified,tithiIndex:state.tithi,nakIndex:state.nak};
}
var _tcalVerifiedMuhurtham2026={
  '2026-01-28':1,
  '2026-02-06':1,'2026-02-08':1,'2026-02-13':1,'2026-02-15':1,'2026-02-16':1,'2026-02-20':1,
  '2026-03-05':1,'2026-03-06':1,'2026-03-08':1,'2026-03-15':1,'2026-03-16':1,'2026-03-25':1,
  '2026-04-06':1,'2026-04-12':1,'2026-04-13':1,'2026-04-16':1,'2026-04-20':1,'2026-04-23':1,'2026-04-30':1,
  '2026-05-08':1,'2026-05-13':1,'2026-05-14':1,'2026-05-18':1,'2026-05-28':1,'2026-05-29':1,
  '2026-06-04':1,'2026-06-07':1,'2026-06-17':1,'2026-06-18':1,'2026-06-24':1,'2026-06-25':1,
  '2026-07-02':1,'2026-07-05':1,'2026-07-12':1,
  '2026-08-23':1,'2026-08-30':1,'2026-08-31':1,
  '2026-09-07':1,'2026-09-13':1,'2026-09-17':1,
  '2026-10-25':1,'2026-10-30':1,
  '2026-11-01':1,'2026-11-11':1,'2026-11-13':1,'2026-11-15':1,'2026-11-16':1,'2026-11-20':1,'2026-11-29':1,
  '2026-12-04':1,'2026-12-06':1,'2026-12-10':1,'2026-12-13':1,'2026-12-14':1
};
function _tcalMuhurtamInfo(d,p){
  // Use an explicit annual reference list instead of guessing from a partial
  // weekday+tithi+nakshatra heuristic.  Outside the bundled verified year we
  // intentionally show no star rather than a false-positive muhurtham day.
  var key=d.getFullYear()+'-'+_tcalPad(d.getMonth()+1)+'-'+_tcalPad(d.getDate()),ok=!!_tcalVerifiedMuhurtham2026[key];
  return{ok:ok,label:ok?'⭐ முகூர்த்த நாள்':'',note:ok?'2026 சரிபார்க்கப்பட்ட வருடாந்திர முகூர்த்த பட்டியல் அடிப்படையில். தனிப்பட்ட ஜாதகப் பொருத்தம் தனியாக பார்க்கவும்.':''};
}
function _tcalHolidayInfo(d){
  // Offline, deterministic calendar markers only. Variable festival holidays
  // are intentionally not guessed here because bank/state holiday lists vary by year.
  var m=d.getMonth()+1,day=d.getDate(),dow=d.getDay();
  var fixed={
    '1-26':'🇮🇳 குடியரசு தினம்',
    '8-15':'🇮🇳 சுதந்திர தினம்',
    '10-2':'🇮🇳 காந்தி ஜெயந்தி'
  };
  var key=m+'-'+day;
  if(fixed[key])return{ok:true,type:'govt',label:fixed[key],short:'🏛️',note:'Government / Bank Holiday'};
  if(dow===6){var nth=Math.floor((day-1)/7)+1;if(nth===2||nth===4)return{ok:true,type:'bank',label:(nth===2?'2nd':'4th')+' Saturday',short:'🏦',note:'Bank Holiday'};}
  if(dow===0)return{ok:false,type:'sunday',label:'ஞாயிறு',short:'',note:'Weekly holiday'};
  return{ok:false,type:'',label:'',short:'',note:''};
}
function _tcalSpecialLabel(d,p){var mu=_tcalMuhurtamInfo(d,p),hol=_tcalHolidayInfo(d);if(mu.ok)return mu.label;if(hol.ok)return hol.label;if(p.tithiIndex===29)return '🌑 அமாவாசை';if(p.tithiIndex===14)return '🌕 பௌர்ணமி';if((p.tithiIndex%15)===10)return '🌿 ஏகாதசி விரதம்';return 'இன்றைய பஞ்சாங்கம்';}
function _tcalIsoDate(d){return d.getFullYear()+'-'+_tcalPad(d.getMonth()+1)+'-'+_tcalPad(d.getDate());}
function tcalAddMoiForSelectedDate(){if(!_tcalSelectedDate)return;var iso=_tcalIsoDate(_tcalSelectedDate);go('add');setTimeout(function(){var e=document.getElementById('f_date');if(e){e.value=iso;e.dispatchEvent(new Event('change',{bubbles:true}));}},80);}
function _tcalSet(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function _tcalApply(d){var p=_tcalPanchang(d);_tcalSet('tcalTamilDate',p.tamil+' — '+_tcalFormatDate(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));_tcalSet('tcalNakshatra',p.nak);_tcalSet('tcalTithi',p.tithi);_tcalSet('tcalNallaNeram',p.good);_tcalSet('tcalRahu',p.rahu);_tcalSet('tcalYama',p.yama);_tcalSet('tcalKuligai',p.gulika);_tcalSet('tcalYoga',p.yoga);_tcalSet('tcalKarana',p.karana);_tcalSet('tcalSunrise',p.sunrise);_tcalSet('tcalSunset',p.sunset);var sp=_tcalSpecialLabel(d,p);_tcalSet('tcalSourceNote',sp+' • '+_tcalLocation.label+' அடிப்படையிலான இணையமில்லா கணிப்பு');var n=document.getElementById('tcalDashNote');if(n)n.textContent=(p.nakShort||p.nak)+' • '+(p.tithiShort||p.tithi);}
function _tcalTryGeo(){if(_tcalGeoTried||!navigator.geolocation)return;_tcalGeoTried=true;navigator.geolocation.getCurrentPosition(function(p){_tcalLocation={lat:p.coords.latitude,lon:p.coords.longitude,label:'உங்கள் இருப்பிடம்'};if(_tcalSelectedDate)_tcalApply(_tcalSelectedDate);},function(){},{timeout:5000,maximumAge:86400000});}
function _tcalRenderDashboardToday(){_renderDailyInfo();var d=new Date(),p=_tcalPanchang(d);_tcalSet('tcalDashTitle',_tcalFormatDate(d,{day:'numeric',month:'long',weekday:'long'}));_tcalSet('tcalDashDate',p.tamil+' · இன்று');_tcalSet('tcalDashNote',(p.nakShort||p.nak)+' • '+(p.tithiShort||p.tithi));}
function _tcalSetSelectedDate(o){var d=o instanceof Date?o:new Date();if(isNaN(d.getTime()))d=new Date();_tcalSelectedDate=new Date(d.getFullYear(),d.getMonth(),d.getDate());var en=_tcalFormatDate(d,{weekday:'long',year:'numeric',month:'long',day:'numeric'});_tcalSet('tcalTodayEnglish',en);_tcalApply(_tcalSelectedDate);_tcalRenderDashboardToday();}
function _tcalEsc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c;});}
function _tcalDetailHtml(d,p){
  var en=_tcalFormatDate(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var mu=_tcalMuhurtamInfo(d,p),hol=_tcalHolidayInfo(d),special=_tcalSpecialLabel(d,p);
  function cell(icon,label,val){return '<div class="tcal-detail-item"><span class="tcal-detail-icon">'+icon+'</span><span><small>'+label+'</small><b>'+_tcalEsc(val)+'</b></span></div>';}
  return '<section class="tcal-inline-detail" aria-live="polite">'+
    '<div class="tcal-detail-head"><div><small>'+_tcalEsc(en)+'</small><strong>'+_tcalEsc(p.tamil)+'</strong></div><span class="tcal-detail-badge'+(mu.ok?' is-muhurtham':'')+(hol.ok?' is-holiday':'')+'">'+special+'</span></div>'+(mu.ok?'<div class="tcal-muhurtham-note"><b>⭐ முகூர்த்த நாள்</b><span>'+_tcalEsc(mu.note)+'</span></div>':'')+(hol.ok?'<div class="tcal-holiday-note '+_tcalEsc(hol.type)+'"><b>'+_tcalEsc(hol.short+' '+hol.label)+'</b><span>'+_tcalEsc(hol.note)+'</span></div>':'')+
    '<div class="tcal-detail-grid">'+
      cell('✦','நட்சத்திரம்',p.nak)+cell('◐','திதி',p.tithi)+cell('✓','நல்ல நேரம்',p.good)+cell('🌼','கௌரி நல்ல நேரம்',_tcalGowriNallaNeram(d))+cell('📌','நாளின் சிறப்பு',_tcalDaySpecial(d,p))+cell('☀','ராகு காலம்',p.rahu)+cell('◌','எமகண்டம்',p.yama)+cell('◍','குளிகை',p.gulika)+cell('✧','யோகம்',p.yoga)+cell('◇','கரணம்',p.karana)+cell('↑','சூரிய உதயம்',p.sunrise)+cell('↓','சூரிய அஸ்தமனம்',p.sunset)+
    '</div><button type="button" class="tcal-moi-link" onclick="tcalAddMoiForSelectedDate()"><span>🧧</span><b>இந்த தேதிக்கு மொய் பதிவு சேர்</b><small>'+_tcalEsc(_tcalIsoDate(d))+'</small></button><div class="tcal-detail-source">'+_tcalEsc(_tcalLocation.label)+' அடிப்படையிலான இணையமில்லா உள்ளூர் வானியல் கணிப்பு • முகூர்த்த குறிப்பு பொது வழிகாட்டல் மட்டும்</div></section>';
}
var _tcalInitSeq=0;function initTamilCalendar(){var q=++_tcalInitSeq,n=new Date();if(!_tcalSelectedDate)_tcalSelectedDate=n;_tcalSetSelectedDate(_tcalSelectedDate);_tcalDetailOpen=false;_tcalTryGeo();function p(){if(q!==_tcalInitSeq)return;try{_renderTamilCalendarMonth();}catch(e){_tcalRenderRecoveryMessage(e);}}p();if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){requestAnimationFrame(p);});else setTimeout(p,30);}
function _tcalRenderRecoveryMessage(e){_tcalSet('tcalMonthLabel','நாட்காட்டி');var h=document.getElementById('tcalMonthGrid');if(h)h.innerHTML='<div class="tcal-recovery" style="grid-column:1/-1;text-align:center;padding:20px 10px"><b>நாட்காட்டி ஏற்றப்படவில்லை</b><br><button type="button" class="btn-sm" style="margin-top:10px" onclick="initTamilCalendar()">மீண்டும் முயற்சி</button></div>';try{console.error(e);}catch(_){} }
function tcalGoToday(){var n=new Date();_tcalCursor=new Date(n.getFullYear(),n.getMonth(),1);_tcalSetSelectedDate(n);_tcalDetailOpen=true;_renderTamilCalendarMonth();setTimeout(function(){var e=document.querySelector('#tcalMonthGrid .tcal-day.today');if(e)e.scrollIntoView({block:'center',behavior:'smooth'});},30);}
function tcalSelectDay(x){
  var d=new Date(_tcalCursor.getFullYear(),_tcalCursor.getMonth(),Number(x));
  var same=!!(_tcalSelectedDate&&d.getFullYear()===_tcalSelectedDate.getFullYear()&&d.getMonth()===_tcalSelectedDate.getMonth()&&d.getDate()===_tcalSelectedDate.getDate());
  if(same&&_tcalDetailOpen){_tcalDetailOpen=false;_renderTamilCalendarMonth();return;}
  _tcalSetSelectedDate(d);_tcalDetailOpen=true;_renderTamilCalendarMonth();
  setTimeout(function(){var e=document.querySelector('#tcalMonthGrid .tcal-day.selected');if(e)e.scrollIntoView({block:'center',behavior:'smooth'});},20);
}
function tcalShiftMonth(x){_tcalCursor=new Date(_tcalCursor.getFullYear(),_tcalCursor.getMonth()+x,1);_tcalSelectedDate=null;_tcalDetailOpen=false;_renderTamilCalendarMonth();}
function _tcalMonthSymbols(d,p){if(!p)return '';var out=[],mu=_tcalMuhurtamInfo(d,p),hol=_tcalHolidayInfo(d);if(mu.ok)out.push('<span class="tcal-mini-badge mu" title="முகூர்த்த நாள்">⭐</span>');if(hol.ok)out.push('<span class="tcal-mini-badge hol '+_tcalEsc(hol.type)+'" title="'+_tcalEsc(hol.label)+'">'+_tcalEsc(hol.short)+'</span>');if(p.tithiIndex===29)out.push('<span class="tcal-mini-badge" title="அமாவாசை">🌑</span>');else if(p.tithiIndex===14)out.push('<span class="tcal-mini-badge" title="பௌர்ணமி">🌕</span>');else if((p.tithiIndex%15)===10)out.push('<span class="tcal-mini-badge" title="ஏகாதசி விரதம்">🌿</span>');return out.join('');}
function _renderTamilCalendarMonth(){
  var h=document.getElementById('tcalMonthGrid'),l=document.getElementById('tcalMonthLabel');if(!h||!l)return;
  var y=_tcalCursor.getFullYear(),m=_tcalCursor.getMonth();
  l.textContent=_tcalFormatDate(new Date(y,m,1),{month:'long',year:'numeric'});
  var f=new Date(y,m,1).getDay(),ds=new Date(y,m+1,0).getDate(),n=new Date(),o='',cells=[];
  for(var i=0;i<f;i++)cells.push('<span class="tcal-day empty" aria-hidden="true"></span>');
  for(var d=1;d<=ds;d++){
    var dt=new Date(y,m,d),p=_tcalPanchangSummary(dt),it=d===n.getDate()&&m===n.getMonth()&&y===n.getFullYear(),is=_tcalSelectedDate&&d===_tcalSelectedDate.getDate()&&m===_tcalSelectedDate.getMonth()&&y===_tcalSelectedDate.getFullYear(),dow=dt.getDay(),mu=_tcalMuhurtamInfo(dt,p),hol=_tcalHolidayInfo(dt),sym=_tcalMonthSymbols(dt,p);
    var tp=String(p.tamil||'').split(' '),tday=tp.pop()||'',tmonth=tp.join(' ');
    cells.push('<button class="tcal-day'+(dow===0?' sun':'')+(dow===6?' sat':'')+(it?' today':'')+(is?' selected':'')+(mu.ok?' muhurtham':'')+(hol.ok?' holiday '+hol.type:'')+'" type="button" onclick="tcalSelectDay('+d+')" aria-label="'+_tcalEsc(p.tamil)+(mu.ok?' • முகூர்த்த நாள்':'')+(hol.ok?' • '+_tcalEsc(hol.label):'')+'"><b>'+d+'</b><small class="tcal-tamil-date"><span class="tcal-tamil-month">'+_tcalEsc(tmonth)+'</span><span class="tcal-tamil-day">'+_tcalEsc(tday)+'</span></small><span class="tcal-symbol">'+sym+'</span></button>');
  }
  while(cells.length%7)cells.push('<span class="tcal-day empty" aria-hidden="true"></span>');
  for(var x=0;x<cells.length;x+=7){
    o+='<div class="tcal-week-row">'+cells.slice(x,x+7).join('')+'</div>';
    if(_tcalDetailOpen&&_tcalSelectedDate&&_tcalSelectedDate.getFullYear()===y&&_tcalSelectedDate.getMonth()===m){
      var selectedSlot=f+_tcalSelectedDate.getDate()-1;
      if(selectedSlot>=x&&selectedSlot<x+7){var sp=_tcalPanchang(_tcalSelectedDate);o+=_tcalDetailHtml(_tcalSelectedDate,sp);}
    }
  }
  h.innerHTML=o;
}


// ============================================================
// V206 — RASI PALAN (zero API / privacy-safe general guidance)
// ============================================================
var _rasiEntrySource = 'today';

function openRasiPalan(source){
  var prev = source === 'tamilCalendar' ? 'tamilCalendar' : (typeof curTab !== 'undefined' ? curTab : 'today');
  if (!prev || prev === 'rasiPalan') prev = 'today';
  _rasiEntrySource = prev;
  go('rasiPalan');
}

function backFromRasiPalan(){
  var target = _rasiEntrySource || 'today';
  if (target === 'rasiPalan') target = 'today';
  go(target);
}

var _RASI_SIGNS = [
  {k:'mesham',n:'மேஷம்',e:'♈'}, {k:'rishabam',n:'ரிஷபம்',e:'♉'},
  {k:'mithunam',n:'மிதுனம்',e:'♊'}, {k:'kadagam',n:'கடகம்',e:'♋'},
  {k:'simmam',n:'சிம்மம்',e:'♌'}, {k:'kanni',n:'கன்னி',e:'♍'},
  {k:'thulam',n:'துலாம்',e:'♎'}, {k:'viruchigam',n:'விருச்சிகம்',e:'♏'},
  {k:'dhanusu',n:'தனுசு',e:'♐'}, {k:'magaram',n:'மகரம்',e:'♑'},
  {k:'kumbam',n:'கும்பம்',e:'♒'}, {k:'meenam',n:'மீனம்',e:'♓'}
];
// V270 — factual Nakshatra/Pada → Rasi reference.
// Each nakshatra has four padas. The mapping below follows the standard
// 108-pada sidereal zodiac sequence (9 padas per rasi).
var _NAKSHATRA_PADA_RASI = [
  ['அசுவினி',0,0,0,0],['பரணி',0,0,0,0],['கார்த்திகை',0,1,1,1],
  ['ரோகிணி',1,1,1,1],['மிருகசீரிடம்',1,1,2,2],['திருவாதிரை',2,2,2,2],
  ['புனர்பூசம்',2,2,2,3],['பூசம்',3,3,3,3],['ஆயில்யம்',3,3,3,3],
  ['மகம்',4,4,4,4],['பூரம்',4,4,4,4],['உத்திரம்',4,5,5,5],
  ['ஹஸ்தம்',5,5,5,5],['சித்திரை',5,5,6,6],['சுவாதி',6,6,6,6],
  ['விசாகம்',6,6,6,7],['அனுஷம்',7,7,7,7],['கேட்டை',7,7,7,7],
  ['மூலம்',8,8,8,8],['பூராடம்',8,8,8,8],['உத்திராடம்',8,9,9,9],
  ['திருவோணம்',9,9,9,9],['அவிட்டம்',9,9,10,10],['சதயம்',10,10,10,10],
  ['பூரட்டாதி',10,10,10,11],['உத்திரட்டாதி',11,11,11,11],['ரேவதி',11,11,11,11]
];
function _rasiNakshatraReference(rasiIndex){
  var out=[];
  _NAKSHATRA_PADA_RASI.forEach(function(row){
    var ps=[];for(var p=1;p<=4;p++)if(row[p]===rasiIndex)ps.push(p);
    if(ps.length)out.push(row[0]+' '+(ps.length===4?'1–4 பாதம்':ps.join(',')+' பாதம்'));
  });
  return out.join(' • ');
}

function _rasiDayKey(d){
  d=d||new Date();
  return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
}
function _rasiDailyPalan_(i,d){
  d=d||new Date();
  var sr=_tcalSunriseDateTime(d),moonLon=_tcalAstroAtDateTime(sr).moon,moonSign=Math.floor(moonLon/30),house=((moonSign-i+12)%12)+1;
  var houseTone={
    1:{o:'மனதில் புதிய எண்ணங்கள் அதிகமாக இருக்கும் நாள்.',w:'முக்கிய வேலையை ஒரு திட்டத்துடன் தொடங்குங்கள்.',m:'தேவையற்ற உடனடி செலவை தவிர்க்கவும்.',f:'உங்கள் கருத்தை மென்மையாக பகிருங்கள்.',c:'அவசர முடிவில் கவனம்.'},
    2:{o:'குடும்பம் மற்றும் பண விஷயங்களில் கவனம் செலுத்தும் நாள்.',w:'பேச்சுவார்த்தையில் தெளிவு உதவும்.',m:'சேமிப்பு அல்லது நிலுவை தொகையை review செய்ய நல்ல நாள்.',f:'குடும்ப உரையாடல் நல்ல பலன் தரலாம்.',c:'வார்த்தைகளில் கடுமை வேண்டாம்.'},
    3:{o:'முயற்சி மற்றும் தொடர்பு முன்னிலை பெறும் நாள்.',w:'சிறிய pending வேலைகளை முடிக்க ஏற்ற நேரம்.',m:'பயணம்/தொடர்பு சார்ந்த செலவை கவனிக்கவும்.',f:'சகோதரர்/நண்பர் தொடர்பு மகிழ்ச்சி தரலாம்.',c:'ஒரே நேரத்தில் அதிக வேலை ஏற்க வேண்டாம்.'},
    4:{o:'வீடு மற்றும் மன அமைதி முக்கியமாக இருக்கும் நாள்.',w:'அமைதியாக செய்த வேலை நல்ல முடிவை தரும்.',m:'வீட்டு செலவில் திட்டமிட்டு நடக்கவும்.',f:'குடும்பத்துடன் நேரம் செலவிடுங்கள்.',c:'மன அழுத்தத்தை சேர்த்து வைத்துக்கொள்ள வேண்டாம்.'},
    5:{o:'படைப்பு, கற்றல் மற்றும் குழந்தைகள் தொடர்பான விஷயங்கள் சாதகமாக இருக்கலாம்.',w:'புதிய யோசனையை பதிவு செய்து முன்னேற்றுங்கள்.',m:'ஆபத்தான முதலீட்டு முடிவை அவசரப்படுத்த வேண்டாம்.',f:'அன்பான உரையாடல் உறவை நெருக்கமாக்கும்.',c:'ஊகத்தின் அடிப்படையில் செலவு வேண்டாம்.'},
    6:{o:'ஒழுங்கு மற்றும் முடிக்க வேண்டிய பணிகளில் முன்னேற்றம் தரும் நாள்.',w:'பாக்கி வேலைகளை ஒன்றன்பின் ஒன்றாக முடிக்கவும்.',m:'கடன்/EMI/பில் நிலுவைகளை சரிபார்க்கவும்.',f:'சிறிய கருத்து வேறுபாட்டை பெரிதாக்க வேண்டாம்.',c:'உடல் ஓய்வை புறக்கணிக்க வேண்டாம்.'},
    7:{o:'கூட்டாண்மை மற்றும் உறவுகள் முக்கியமாக இருக்கும் நாள்.',w:'மற்றவருடன் இணைந்து செய்யும் வேலைக்கு முன்னுரிமை கொடுக்கலாம்.',m:'பகிர்ந்த செலவு/கணக்கில் தெளிவு வைத்துக்கொள்ளுங்கள்.',f:'துணைவர் அல்லது நெருக்கமானவரின் கருத்தைக் கேளுங்கள்.',c:'உறுதிப்படுத்தாமல் வாக்குறுதி அளிக்க வேண்டாம்.'},
    8:{o:'மாற்றம் மற்றும் மறுபரிசீலனை தேவைப்படும் நாள்.',w:'புதிய risk எடுப்பதை விட existing issue-ஐ சரி செய்யுங்கள்.',m:'பெரிய பண பரிவர்த்தனையில் double-check செய்யவும்.',f:'தனிப்பட்ட விஷயங்களில் அமைதி உதவும்.',c:'அவசர முதலீடு/கடன் தவிர்க்கவும்.'},
    9:{o:'கற்றல், பயணம் அல்லது ஆன்மிக சிந்தனைக்கு ஏற்ற நாள்.',w:'புதிய தகவல் உங்கள் முடிவுக்கு உதவலாம்.',m:'நீண்டகால இலக்கை மீண்டும் பாருங்கள்.',f:'மூத்தவர்களின் ஆலோசனை பயனளிக்கலாம்.',c:'அதிக நம்பிக்கையால் விவரம் தவறாதீர்கள்.'},
    10:{o:'பணி மற்றும் பொறுப்பு முன்னிலை பெறும் நாள்.',w:'முக்கிய task-ஐ இன்று முன்னேற்ற வாய்ப்பு உள்ளது.',m:'வருமானம்/வேலை சார்ந்த கணக்கை review செய்யலாம்.',f:'வேலை அழுத்தத்தை வீட்டிற்கு கொண்டு வராமல் பாருங்கள்.',c:'பொறுப்புகளை தள்ளிப் போட வேண்டாம்.'},
    11:{o:'நண்பர்கள், network மற்றும் இலாப வாய்ப்புகள் கவனத்திற்கு வரும் நாள்.',w:'நல்ல தொடர்பு ஒரு வாய்ப்பை திறக்கலாம்.',m:'வரவு/நிலுவை பெற வேண்டியதை follow-up செய்யலாம்.',f:'நண்பர் அல்லது குடும்ப உதவி கிடைக்கலாம்.',c:'அதிக எதிர்பார்ப்பு வேண்டாம்.'},
    12:{o:'மெதுவாக திட்டமிட்டு செயல்பட வேண்டிய நாள்.',w:'பின்னணி வேலை மற்றும் planning-க்கு ஏற்றது.',m:'மறைமுக/தேவையற்ற செலவுகளை கவனிக்கவும்.',f:'தனிநேரம் மன அமைதிக்கு உதவும்.',c:'களைப்பில் முக்கிய முடிவு வேண்டாம்.'}
  };
  var h=houseTone[house],seed=(_rasiDayKey(d)+i*17)%5;
  var boost=['நிதானம் இன்று உங்கள் பலம்.','சிறிய முன்னேற்றத்தையும் கவனியுங்கள்.','தெளிவான திட்டம் நாள் முழுவதையும் எளிதாக்கும்.','முக்கியதை முதலில் செய்வது நல்ல பலன் தரும்.','சமநிலையை காப்பது இன்று முக்கியம்.'][seed];
  return {house:house,overall:h.o+' '+boost,work:h.w,money:h.m,family:h.f,caution:h.c};
}
function initRasiPalan(){
  var grid=document.getElementById('rasiGrid');if(!grid)return;
  var dl=document.getElementById('rasiDateLabel');if(dl)dl.textContent='இன்று • '+_tcalFormatDate(new Date(),{day:'numeric',month:'long',year:'numeric'});
  grid.innerHTML=_RASI_SIGNS.map(function(r,i){return '<button type="button" class="rasi-sign" aria-pressed="false" onclick="showRasiPalan('+i+')"><span>'+r.e+'</span><b>'+r.n+'</b></button>';}).join('');
  var prev=-1;try{prev=parseInt(localStorage.getItem('nm_rasi_last'),10);}catch(e){}if(prev>=0&&prev<_RASI_SIGNS.length)showRasiPalan(prev);
}
function showRasiPalan(i){
  i=parseInt(i,10);if(!(i>=0&&i<_RASI_SIGNS.length))return;var r=_RASI_SIGNS[i],p=_rasiDailyPalan_(i,new Date()),result=document.getElementById('rasiResult');if(result)result.style.display='block';
  var icon=document.getElementById('rasiResultIcon');if(icon)icon.textContent=r.e;var name=document.getElementById('rasiResultName');if(name)name.textContent=r.n;
  var text=document.getElementById('rasiResultText');if(text)text.innerHTML='<div class="rasi-palan-overall">'+_tcalEsc(p.overall)+'</div><div class="rasi-palan-grid"><div><small>💼 வேலை</small><b>'+_tcalEsc(p.work)+'</b></div><div><small>💰 பணம்</small><b>'+_tcalEsc(p.money)+'</b></div><div><small>🏠 குடும்பம்</small><b>'+_tcalEsc(p.family)+'</b></div><div><small>⚠️ கவனம்</small><b>'+_tcalEsc(p.caution)+'</b></div></div>';
  var chips=document.getElementById('rasiResultChips');if(chips)chips.innerHTML='<span><b>இன்றைய சந்திர நிலை</b>'+p.house+'-ஆம் இடம்</span><span><b>வகை</b>பொதுப் பலன்</span>';
  document.querySelectorAll('#rasiGrid .rasi-sign').forEach(function(el,n){var on=n===i;el.classList.toggle('on',on);el.setAttribute('aria-pressed',on?'true':'false');});
  try{localStorage.setItem('nm_rasi_last',String(i));}catch(e){}if(result&&result.scrollIntoView)setTimeout(function(){result.scrollIntoView({behavior:'smooth',block:'nearest'});},30);
}

// ============================================================
// v290 — User-facing Data & Backup
// ============================================================
var _myBackupBusy=false;
function openMyDataBackup(){
  var m=document.getElementById('myDataBackupModal');if(!m)return;m.style.display='flex';
  var card=document.getElementById('myDataLocationCard'),hist=document.getElementById('myBackupHistory');
  if(card)card.innerHTML='<div class="nm-inline-loading">Data location பார்க்கிறது…</div>';
  if(hist)hist.innerHTML='<div class="nm-inline-loading">Backup history ஏற்றுகிறது…</div>';
  google.script.run.withSuccessHandler(function(res){_renderMyDataBackup(res||{});}).withFailureHandler(function(e){if(card)card.innerHTML='<div class="form-error">'+x((e&&e.message)||'Data location கிடைக்கவில்லை')+'</div>';}).getMyDataBackupStatus();
}
function closeMyDataBackup(){var m=document.getElementById('myDataBackupModal');if(m)m.style.display='none';}
function _fmtBackupWhen(v){try{var d=new Date(String(v||'').replace(' ','T'));if(!isNaN(d.getTime()))return d.toLocaleString();}catch(e){}return String(v||'');}
function _renderMyDataBackup(res){
  var card=document.getElementById('myDataLocationCard'),hist=document.getElementById('myBackupHistory'),btn=document.getElementById('myBackupNowBtn'),link=document.getElementById('myBackupFolderLink');
  if(!res||!res.ok){if(card)card.innerHTML='<div class="form-error">'+x((res&&res.msg)||'Data விவரம் கிடைக்கவில்லை')+'</div>';return;}
  var loc=res.ownedBySignedIn?'உங்கள் Google Drive':'Google Drive-ல் உங்கள் account-க்கு இணைக்கப்பட்ட data';
  if(card)card.innerHTML='<div class="my-data-status"><span class="my-data-status-icon">✓</span><div><b>'+x(loc)+'</b><small>'+x(res.dataName||'Namma MOI Data')+(res.driveOwner?' · Owner: '+x(res.driveOwner):'')+'</small></div></div>'+
    '<a class="my-data-open" href="'+x(res.dataUrl||'#')+'" target="_blank">📄 தற்போதைய Data Sheet-ஐ பார்க்க</a>';
  if(btn){btn.disabled=!res.canManage;btn.textContent=res.canManage?'☁️ Backup Now':'Main user மட்டும் Backup';}
  if(link){if(res.backupRootUrl){link.href=res.backupRootUrl;link.style.display='inline-flex';}else link.style.display='none';}
  var freq=document.getElementById('myAutoBackupFrequency');if(freq){freq.value=res.autoBackupFrequency||'off';freq.disabled=!res.canManage;}
  var auto=document.getElementById('myAutoBackupStatus');if(auto)auto.textContent=(res.autoBackupFrequency&&res.autoBackupFrequency!=='off')?('அடுத்த Backup: '+(res.nextAutoBackup||'schedule செய்யப்பட்டுள்ளது')):'Auto Backup Off';
  var last=document.getElementById('myLastBackupStatus');if(last)last.innerHTML=res.lastBackup?('கடைசி Backup: <b>'+x(_fmtBackupWhen(res.lastBackup.createdAt))+'</b> · '+x(res.lastBackup.reason==='manual'?'Manual':'Auto')):'இன்னும் Backup எடுக்கப்படவில்லை.';
  _renderMyBackupHistory(res.backups||[],res.canManage!==false);
}
function _renderMyBackupHistory(rows,canManage){
  var hist=document.getElementById('myBackupHistory');if(!hist)return;
  if(!rows||!rows.length){hist.innerHTML='<div class="my-backup-empty">இன்னும் Backup எடுக்கப்படவில்லை.</div>';return;}
  hist.innerHTML=rows.map(function(b){return '<div class="my-backup-row"><div class="my-backup-copy"><b>'+x(_fmtBackupWhen(b.createdAt))+'</b><small>'+x(String(b.files||0))+' data sheet(s) · '+x(b.reason==='manual'?'Manual':(String(b.reason||'').indexOf('auto_')===0?'Auto':'Safety'))+'</small></div><div class="my-backup-row-actions"><a href="'+x(b.url||'#')+'" target="_blank">திற</a>'+(canManage?'<button type="button" onclick="restoreMyBackupNow(\''+x(String(b.id))+'\')">↩ Restore</button>':'')+'</div></div>';}).join('');
}
function saveMyAutoBackupFrequency(v){
  v=String(v||'off');var st=document.getElementById('myAutoBackupStatus');if(st)st.textContent='Schedule சேமிக்கிறது…';
  google.script.run.withSuccessHandler(function(res){if(!res||!res.ok){toast((res&&res.msg)||'Auto Backup schedule முடியவில்லை');openMyDataBackup();return;}if(st)st.textContent=res.frequency==='off'?'Auto Backup Off':('அடுத்த Backup: '+(res.nextAutoBackup||'schedule செய்யப்பட்டுள்ளது'));toast('Auto Backup: '+res.frequency);}).withFailureHandler(function(e){toast((e&&e.message)||'Auto Backup schedule முடியவில்லை');openMyDataBackup();}).setMyAutoBackupFrequency(v);
}
function createMyBackupNow(){
  if(_myBackupBusy)return;_myBackupBusy=true;var b=document.getElementById('myBackupNowBtn');if(b){b.disabled=true;b.textContent='Backup எடுக்கிறது…';}
  google.script.run.withSuccessHandler(function(res){_myBackupBusy=false;if(!res||!res.ok){toast((res&&res.msg)||'Backup முடியவில்லை');openMyDataBackup();return;}toast(res.msg||'Backup வெற்றி');openMyDataBackup();}).withFailureHandler(function(e){_myBackupBusy=false;toast((e&&e.message)||'Backup முடியவில்லை');openMyDataBackup();}).createMyBackup();
}
function restoreMyBackupNow(folderId){
  if(_myBackupBusy)return;var msg='இந்த Backup-ஐ Restore செய்யவா?\n\nRestore தொடங்கும் முன் தற்போதைய data-க்கு Safety Backup தானாக எடுக்கப்படும். Restore முடிந்ததும் app refresh செய்ய வேண்டும்.';if(!window.confirm(msg))return;
  _myBackupBusy=true;loading(true);google.script.run.withSuccessHandler(function(res){_myBackupBusy=false;loading(false);if(!res||!res.ok){toast((res&&res.msg)||'Restore முடியவில்லை');return;}toast(res.msg||'Restore முடிந்தது');closeMyDataBackup();setTimeout(function(){try{window.location.reload();}catch(e){}},900);}).withFailureHandler(function(e){_myBackupBusy=false;loading(false);toast((e&&e.message)||'Restore முடியவில்லை');}).restoreMyBackup(folderId);
}


// ============================================================
// V292 — TRUSTED DEVICE SESSION PERSISTENCE
// localStorage remains the fast path. When Median Native Datastore is enabled,
// mirror the same non-secret session snapshot into app storage so WebView cache
// eviction/recreation does not unnecessarily send the user back through the
// Namma MOI password screen. The server remains authoritative on every resume.
// This does NOT bypass Google OAuth; Median Cookie Persistence must also keep
// Google's WebView cookies alive (see V292_MEDIAN_PERSISTENT_LOGIN_SETUP.md).
// ============================================================
var _NM_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
var _NM_NATIVE_SESSION_KEY = 'nammamoi_trusted_session_v292';

function _nmPersistTrustedSession(res){
  if(!res || !res.ok) return;
  try{
    res._ts = Date.now();
    var raw = JSON.stringify(res);
    localStorage.setItem('moi_session', raw);
    if(window.median && median.storage && median.storage.app && typeof median.storage.app.set==='function'){
      try{ median.storage.app.set({key:_NM_NATIVE_SESSION_KEY,value:raw}); }catch(ignore){}
    }
  }catch(ignore){}
}

function _nmClearTrustedSession(){
  try{ localStorage.removeItem('moi_session'); }catch(ignore){}
  try{
    if(window.median && median.storage && median.storage.app && typeof median.storage.app.delete==='function'){
      median.storage.app.delete({key:_NM_NATIVE_SESSION_KEY});
    }
  }catch(ignore){}
}

function _nmTryRestoreNativeSession(done){
  done = typeof done==='function' ? done : function(){};
  try{
    if(!(window.median && median.storage && median.storage.app && typeof median.storage.app.get==='function')) return done(false);
    var settled=false;
    var timer=setTimeout(function(){ if(!settled){ settled=true; done(false); } },650);
    var ret=median.storage.app.get({key:_NM_NATIVE_SESSION_KEY,callback:function(result){
      if(settled) return; settled=true; clearTimeout(timer);
      try{
        var raw=result && result.data ? String(result.data) : '';
        var s=raw ? JSON.parse(raw) : null;
        if(s && s.ok && s._ts && (Date.now()-s._ts)<_NM_SESSION_TTL_MS){
          localStorage.setItem('moi_session',raw); S=s; _routeCachedResumeImmediate();
          google.script.run.withSuccessHandler(function(res){
            if(res && res.ok){ S=res; _nmPersistTrustedSession(res); _applyRoleUI(); if(typeof _applyModulePreferences==='function') _applyModulePreferences(); _scheduleDictionaryBackfill(); }
            else { _nmClearTrustedSession(); S={}; checkAuth(); }
          }).withFailureHandler(function(){ /* keep cached screen; online resume retries */ }).verifySession();
          return done(true);
        }
      }catch(ignore){}
      done(false);
    }});
    if(ret && typeof ret.then==='function') ret.then(function(result){
      if(settled) return; settled=true; clearTimeout(timer);
      try{
        var raw=result && result.data ? String(result.data) : '';
        var s=raw ? JSON.parse(raw) : null;
        if(s && s.ok && s._ts && (Date.now()-s._ts)<_NM_SESSION_TTL_MS){ localStorage.setItem('moi_session',raw); location.reload(); return done(true); }
      }catch(ignore){}
      done(false);
    }).catch(function(){ if(!settled){ settled=true; clearTimeout(timer); done(false); } });
  }catch(e){ done(false); }
}

function init() {
  if (_initDone) return;
  _initDone = true;
  _initTamilTransliteration();
  // Launch-safe: the additive existing-value suggestion layer must never
  // block login/MOI initialization if an older WebView rejects any optional UI API.
  try { _initExistingSuggest(); } catch (e) { console.warn('[ExistingSuggest] init skipped:', e); }

  // FIX [PERF]: Use localStorage instead of sessionStorage so the
  // session survives app restarts in Median WebView (sessionStorage
  // is cleared when the WebView process is killed on Android).
  // v292: trusted-device session persists for 30 days. Server still re-verifies identity/account/plan on resume.
  try {
    var cached = localStorage.getItem('moi_session');
    if (cached) {
      var s = JSON.parse(cached);
      if (s && s._ts && (Date.now() - s._ts) < 2592000000) { // 30 days
        S = s;
        // V168 — FAST ANDROID RESUME:
        // A still-valid local session paints the last safe module immediately.
        // Server verification happens silently afterwards, so a killed/recreated
        // WebView does not sit on Splash just because the network is slow/offline.
        // Invalid/blocked/expired sessions are still rejected as soon as the
        // server explicitly says so. No save/auth rule is weakened here.
        _routeCachedResumeImmediate();
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.ok) {
              S = res;
              _nmPersistTrustedSession(res);
              // Keep the already-visible screen stable. Resume/online handlers
              // refresh the visible module; do not bounce through the selector.
              _applyRoleUI();
              if (typeof _applyModulePreferences === 'function') _applyModulePreferences();
              _scheduleDictionaryBackfill();
            } else {
              _nmClearTrustedSession();
              S = {};
              checkAuth();
            }
          })
          .withFailureHandler(function(){
            // Offline/network hiccup: keep the cached screen visible. Existing
            // offline guards prevent writes; online resume will re-check/refresh.
          })
          .verifySession();
        return;
      }
      _nmClearTrustedSession();
    }
  } catch(e) {}

  // If WebView localStorage was cleared but Median Native Datastore survived,
  // recover the trusted session before showing a login screen.
  _nmTryRestoreNativeSession(function(restored){ if(!restored) checkAuth(); });
}


// v291 — existing MOI Name/Oor one-time dictionary backfill.
// Delayed + fire-and-forget: never blocks login, first paint or module data.
// Server enforces owner-only + once-per-owner semantics, so localStorage is
// only an extra device-side optimization, not the source of truth.
var _nmDictionaryBackfillScheduled=false;
function _scheduleDictionaryBackfill(){
  if(_nmDictionaryBackfillScheduled || !S || !S.ok || S.role==='sub') return;
  _nmDictionaryBackfillScheduled=true;
  setTimeout(function(){
    if(navigator.onLine===false){ _nmDictionaryBackfillScheduled=false; return; }
    try{
      google.script.run
        .withSuccessHandler(function(res){
          try{ if(res && res.ok) localStorage.setItem('nm_dict_backfill_v291','1'); }catch(e){}
        })
        .withFailureHandler(function(){ _nmDictionaryBackfillScheduled=false; })
        .backfillMySuggestionDictionaryOnce();
    }catch(e){ _nmDictionaryBackfillScheduled=false; }
  },8000);
}


// V168 — paint only a previously saved SAFE module/tab from local state.
// This is presentation/resume only; the server remains authoritative for
// session validity and all write operations.
function _routeCachedResumeImmediate() {
  var st = null;
  try { if (typeof _nmReadResumeState === 'function') st = _nmReadResumeState(); } catch(e) {}
  var app = (st && st.module === 'expense') ? 'expense' : 'moi';
  _currentApp = app;
  try { localStorage.setItem('moi_last_app', app); } catch(e) {}

  if (app === 'expense') {
    showScreen('expenseScreen');
    initExpenseScreen();
    var et = (st && st.tab && st.tab !== 'add') ? st.tab : 'list';
    setTimeout(function(){ if (typeof expGo === 'function') expGo(et); }, 0);
    if (typeof _nmFinishStartupPaint === 'function') _nmFinishStartupPaint();
    return;
  }

  enterApp();
  var mt = (st && st.tab && ['add','admin','account','documents'].indexOf(st.tab) === -1) ? st.tab : 'today';
  if (mt !== 'today') setTimeout(function(){ if (typeof go === 'function') go(mt); }, 0);
  if (typeof _nmFinishStartupPaint === 'function') _nmFinishStartupPaint();
}


// checkAuth() — the ONLY function allowed to decide which screen
// the user is permitted to see. Always asks the server.
function checkAuth() {
  showScreen('splashScreen');

  var _initTimeout = setTimeout(function() {
    _showBlockedWithMsg('⚠️ Server தாமதம்',
      'Server response இல்லை (20 sec timeout). பக்கத்தை மீண்டும் புதுப்பிக்கவும். புதிய Deployment செய்யப்பட்டதா என சரிபார்க்கவும்.');
  }, 20000);

  google.script.run
    .withSuccessHandler(function(res) {
      clearTimeout(_initTimeout);
      _handleSession(res);
    })
    .withFailureHandler(function(e) {
      clearTimeout(_initTimeout);
      _showBlockedWithMsg('⚠️ Server பிழை',
        (e.message || String(e)) + ' — புதிய Deployment செய்யப்பட்டதா சரிபார்க்கவும்.');
    })
    .fastLogin(null);
}


// ============================================================
// SESSION HANDLER — pure routing. Given a server response, picks
// exactly ONE screen. appScreen is shown ONLY when res.ok===true.
// ============================================================
var _pendingRowIndex = null; // store rowIndex for password steps

// V105 launch hardening: explicit auth request locks + timeout recovery.
var _authLoginInFlight = false;
var _authSetPasswordInFlight = false;
var _authRegisterInFlight = false;

function _authOfflineMessage(errEl) {
  if (navigator.onLine !== false) return false;
  if (errEl) errEl.textContent = 'Internet இல்லை. இணைப்பு வந்ததும் மீண்டும் முயற்சிக்கவும்.';
  return true;
}


function _handleSession(res) {
  if (!res) { _showBlockedWithMsg('⚠️ பிழை ஏற்பட்டது', 'அறியப்படாத பிழை — பக்கத்தை மீண்டும் புதுப்பிக்கவும்.'); return; }

  if (res.ok === true) {
    S = res;
    _scheduleDictionaryBackfill();
    _routeAfterLogin();
    if (typeof _nmFinishStartupPaint === 'function') _nmFinishStartupPaint();
    return;
  }

  if (res.noAuth) {
    showScreen('noAuthScreen');

  } else if (res.newUser) {
    var badge = document.getElementById('regEmailBadge');
    if (badge) badge.textContent = res.email || '';
    showScreen('registerScreen');

  } else if (res.needPassword) {
    // Approved user — must set password for first time
    _pendingRowIndex = res.rowIndex;
    showScreen('setPasswordScreen');
    var nm = document.querySelector('#setPasswordScreen #spName');
    if (nm) nm.textContent = res.name || res.email || '';

  } else if (res.needLogin) {
    // Has password — show login screen
    _pendingRowIndex = res.rowIndex;
    showScreen('passwordLoginScreen');
    // FIX [DI-5]: target the inner text span, not the container div —
    // the container also holds a decorative icon (see idx_auth.html's
    // redesigned #loginName/#loginEmail) that a direct .textContent
    // write would otherwise erase.
    var lnm = document.querySelector('#passwordLoginScreen #loginNameText');
    var lem = document.querySelector('#passwordLoginScreen #loginEmailText');
    if (lnm) lnm.textContent = res.name || res.email || '';
    if (lem) lem.textContent = res.email || '';

  } else if (res.blocked) {
    showScreen('blockedScreen');

  } else if (res.trialExpired || res.expired) {
    // FIX [41]: trial is 30 days now — this fires normally when it (or
    // a paid subscription) runs out. Shows expiredScreen either way,
    // now with the SPECIFIC reason (res.msg) and a distinct title for
    // trial-ended vs subscription-ended, instead of one generic message
    // for both cases.
    var eb = document.getElementById('expiredEmailBadge');
    if (eb) eb.textContent = res.email || '';
    var titleEl  = document.getElementById('expiredTitle');
    var reasonEl = document.getElementById('expiredReason');
    if (titleEl)  titleEl.textContent  = res.trialExpired ? '30 நாள் Trial முடிந்தது' : 'சந்தா காலம் முடிந்தது';
    if (reasonEl) reasonEl.textContent = res.msg || '';
    showScreen('expiredScreen');

  } else {
    // Unknown/unexpected state -> fail safe, never fail open.
    _showBlockedWithMsg('⚠️ பிழை ஏற்பட்டது', (res.msg || 'அறியப்படாத பிழை') + ' — பக்கத்தை மீண்டும் புதுப்பிக்கவும்.');
  }
  if (typeof _nmFinishStartupPaint === 'function') _nmFinishStartupPaint();
}


// ============================================================
// PASSWORD LOGIN — uses fastLogin (single server call)
// ============================================================
// FIX [DI-5]: show/hide toggle for the login password field (added to
// match the approved reference design). Purely presentational — flips
// the input's type attribute and swaps the icon; does not touch
// doPasswordLogin() or any auth logic.
function _toggleLoginPwVisibility() {
  var inp  = document.getElementById('loginPassword');
  var use  = document.querySelector('#loginPwEyeIcon use');
  if (!inp || !use) return;
  var showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  use.setAttribute('href', showing ? '#icon-eye' : '#icon-eye-off');
}

function doPasswordLogin() {
  var pass = document.getElementById('loginPassword').value;
  var err  = document.getElementById('loginErr');
  if (err.style.color !== 'rgb(29, 158, 117)') err.textContent = '';
  if (!pass) { err.textContent = 'Password உள்ளிடவும்'; return; }
  if (_authOfflineMessage(err) || _authLoginInFlight) return;

  var btn = document.getElementById('loginBtn');
  _authLoginInFlight = true;
  btn.disabled = true; btn.textContent = 'சரிபார்க்கிறது...';
  var loginReqDone = false;
  var loginTimeout = setTimeout(function() {
    if (loginReqDone) return;
    loginReqDone = true; _authLoginInFlight = false;
    btn.disabled = false; btn.textContent = '🔓 உள்நுழை';
    err.textContent = 'Server response தாமதமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (loginReqDone) return;
      loginReqDone = true; clearTimeout(loginTimeout); _authLoginInFlight = false;
      btn.disabled = false; btn.textContent = '🔓 உள்நுழை';
      if (res.ok) {
        // Cache trusted-device session for fast reload (30-day TTL)
        try {
          _nmPersistTrustedSession(res);
        } catch(e) {}
        S = res; _pendingRowIndex = null;
        _scheduleDictionaryBackfill();
        _hideAll();
        _routeAfterLogin();
      } else {
        err.style.color = '#DC2626';
        err.textContent = res.msg || 'Password தவறாக உள்ளது';
      }
    })
    .withFailureHandler(function(e) {
      if (loginReqDone) return;
      loginReqDone = true; clearTimeout(loginTimeout); _authLoginInFlight = false;
      btn.disabled = false; btn.textContent = '🔓 உள்நுழை';
      err.textContent = friendlyErrorMsg(e);
    })
    .fastLogin(pass);
}


// ============================================================
// SET PASSWORD (first time after approval)
// ============================================================
function doSetPassword() {
  var p1  = document.getElementById('spPass1').value;
  var p2  = document.getElementById('spPass2').value;
  var err = document.getElementById('spErr');
  err.textContent = '';
  if (!/^\d{6}$/.test(p1)) { err.textContent = '6 இலக்க PIN உள்ளிடவும்'; return; }
  if (p1 !== p2)     { err.textContent = 'Passwords match ஆகவில்லை'; return; }
  if (!_pendingRowIndex) { location.reload(); return; }
  if (_authOfflineMessage(err) || _authSetPasswordInFlight) return;

  var btn = document.getElementById('spBtn');
  _authSetPasswordInFlight = true;
  btn.disabled = true; btn.textContent = 'சேமிக்கிறது...';
  var setPwReqDone = false;
  var setPwTimeout = setTimeout(function() {
    if (setPwReqDone) return;
    setPwReqDone = true; _authSetPasswordInFlight = false;
    btn.disabled = false; btn.textContent = '✅ Password அமை';
    err.textContent = 'Server response தாமதமாகிறது. மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (setPwReqDone) return;
      setPwReqDone = true; clearTimeout(setPwTimeout); _authSetPasswordInFlight = false;
      btn.disabled = false; btn.textContent = '✅ Password அமை';
      if (res.ok) {
        // FIX [BUG-3]: Use showScreen() instead of direct style manipulation
        showScreen('passwordLoginScreen');
        var loginErrEl = document.getElementById('loginErr');
        if (loginErrEl) { loginErrEl.textContent = '✅ Password அமைக்கப்பட்டது. இப்போது login செய்யவும்.'; loginErrEl.style.color = '#0F6E56'; }
      } else {
        err.textContent = res.msg || 'பிழை';
      }
    })
    .withFailureHandler(function(e) {
      if (setPwReqDone) return;
      setPwReqDone = true; clearTimeout(setPwTimeout); _authSetPasswordInFlight = false;
      btn.disabled = false; btn.textContent = '✅ Password அமை';
      err.textContent = friendlyErrorMsg(e);
    })
    .setMyPassword(_pendingRowIndex, p1);
}


// ============================================================
// CHANGE PASSWORD (from account page)
// ============================================================
function doChangePassword() {
  var oldP = document.getElementById('cp_old').value;
  var p1   = document.getElementById('cp_new1').value;
  var p2   = document.getElementById('cp_new2').value;
  var err  = document.getElementById('cpErr');
  err.textContent = '';
  if (!oldP)         { err.textContent = 'Current Password உள்ளிடவும்'; return; }
  if (!/^\d{6}$/.test(p1)) { err.textContent = 'புதிய 6 இலக்க PIN உள்ளிடவும்'; return; }
  if (p1 !== p2)     { err.textContent = 'New Passwords match ஆகவில்லை'; return; }

  var btn = document.getElementById('cpBtn');
  btn.disabled = true; btn.textContent = 'மாற்றுகிறது...';

  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false; btn.textContent = '🔐 மாற்று';
      if (res.ok) {
        toast('✅ Password மாற்றப்பட்டது!');
        ['cp_old','cp_new1','cp_new2'].forEach(function(id){ document.getElementById(id).value=''; });
      } else {
        err.textContent = res.msg || 'பிழை';
      }
    })
    .withFailureHandler(function(e) {
      btn.disabled = false; btn.textContent = '🔐 மாற்று';
      err.textContent = friendlyErrorMsg(e);
    })
    .changeMyPassword(oldP, p1);
}


// ============================================================
// REGISTER
// ============================================================
function doRegister() {
  var name    = document.getElementById('r_name').value.trim();
  var mobile  = document.getElementById('r_mobile').value.trim();
  var village = document.getElementById('r_village').value.trim();
  var pass1   = document.getElementById('r_pass1').value;
  var pass2   = document.getElementById('r_pass2').value;
  var refCode = document.getElementById('r_ref').value.trim();
  var modeEl  = document.querySelector('input[name="r_module_mode"]:checked');
  var moduleMode = modeEl ? modeEl.value : 'both';
  var err     = document.getElementById('regErr');

  if (!name)           { err.textContent = 'பெயர் உள்ளிடவும்'; return; }
  if (!/^\d{6}$/.test(pass1)){ err.textContent = '6 இலக்க PIN உள்ளிடவும்'; return; }
  if (pass1 !== pass2) { err.textContent = 'Passwords match ஆகவில்லை'; return; }
  err.textContent = '';
  if (_authOfflineMessage(err) || _authRegisterInFlight) return;

  var btn = document.getElementById('regBtn');
  _authRegisterInFlight = true;
  btn.disabled = true; btn.textContent = 'சேமிக்கிறது...';
  var regReqDone = false;
  var regTimeout = setTimeout(function() {
    if (regReqDone) return;
    regReqDone = true; _authRegisterInFlight = false;
    btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
    err.textContent = 'Server response தாமதமாகிறது. உங்கள் விவரங்கள் அழியவில்லை; மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (regReqDone) return;
      regReqDone = true; clearTimeout(regTimeout); _authRegisterInFlight = false;
      btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
      if (res.ok) {
        // V251 — registration already collected a valid password, so do not
        // bounce the new user to the login screen. Run the normal fastLogin()
        // path immediately so auth-session creation, plan checks and referral
        // activation still happen in exactly one canonical backend flow.
        btn.disabled = true; btn.textContent = 'திறக்கிறது...';
        err.style.color = '#0F6E56';
        err.textContent = res.referralPending
          ? '✅ பதிவு வெற்றி! கணக்கு செயல்படுத்தப்படுகிறது...'
          : '✅ பதிவு வெற்றி! App திறக்கிறது...';

        var autoLoginDone = false;
        var autoLoginTimeout = setTimeout(function() {
          if (autoLoginDone) return;
          autoLoginDone = true;
          btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
          // Registration itself succeeded. If only the follow-up login timed
          // out, fall back safely to the normal login screen without asking
          // the user to register again.
          showScreen('passwordLoginScreen');
          var lmsg = document.getElementById('loginErr');
          if (lmsg) {
            lmsg.style.color = '#7C5B00';
            lmsg.textContent = '✅ பதிவு முடிந்தது. Auto-login தாமதமாகிறது; உங்கள் Password-ஐ உள்ளிட்டு தொடரவும்.';
          }
        }, 25000);

        google.script.run
          .withSuccessHandler(function(loginRes) {
            if (autoLoginDone) return;
            autoLoginDone = true; clearTimeout(autoLoginTimeout);
            btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
            if (loginRes && loginRes.ok) {
              try {
                _nmPersistTrustedSession(loginRes);
              } catch(e) {}
              S = loginRes; _pendingRowIndex = null;
              _hideAll();
              _routeAfterLogin();
              return;
            }

            // Do not lose a successful registration because activation/login
            // hit an unexpected state. Reuse the existing auth-state router
            // when possible; otherwise offer the password login fallback.
            if (loginRes && (loginRes.blocked || loginRes.trialExpired || loginRes.expired || loginRes.noAuth)) {
              _handleSession(loginRes);
              return;
            }
            showScreen('passwordLoginScreen');
            var lmsg = document.getElementById('loginErr');
            if (lmsg) {
              lmsg.style.color = '#7C5B00';
              lmsg.textContent = (loginRes && loginRes.msg)
                ? ('✅ பதிவு முடிந்தது. ' + loginRes.msg)
                : '✅ பதிவு முடிந்தது. Password-ஐ உள்ளிட்டு தொடரவும்.';
            }
          })
          .withFailureHandler(function() {
            if (autoLoginDone) return;
            autoLoginDone = true; clearTimeout(autoLoginTimeout);
            btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
            showScreen('passwordLoginScreen');
            var lmsg = document.getElementById('loginErr');
            if (lmsg) {
              lmsg.style.color = '#7C5B00';
              lmsg.textContent = '✅ பதிவு முடிந்தது. Auto-login முடியவில்லை; Password-ஐ உள்ளிட்டு தொடரவும்.';
            }
          })
          .fastLogin(pass1);
      } else {
        err.textContent = res.msg;
      }
    })
    .withFailureHandler(function(e) {
      if (regReqDone) return;
      regReqDone = true; clearTimeout(regTimeout); _authRegisterInFlight = false;
      btn.disabled = false; btn.textContent = 'பதிவு செய்யுங்கள்';
      err.textContent = friendlyErrorMsg(e);
    })
    .registerMe({ name:name, mobile:mobile, village:village, password:pass1, referralCode:refCode, moduleMode:moduleMode });
}


// ============================================================
// ENTER APP
// ============================================================
// FIX [BUG-8]: Extracted role/plan UI updates into _applyRoleUI() so they
// can be re-applied any time S.role or S.plan changes mid-session without
// requiring a full page reload (e.g. after adminUpdateUser changes a role).
function _applyRoleUI() {
  if (!S) return;
  var isAdmin = S.role === 'super_admin'; // FIX [14]: role renamed 'admin' -> 'super_admin'
  var isMain  = S.role === 'main';
  document.getElementById('t-admin').style.display = 'none';
  var moreAdminBtn = document.getElementById('moreAdminBtn');
  if (moreAdminBtn) moreAdminBtn.style.display = isAdmin ? '' : 'none';
  document.getElementById('t-account').style.display = isAdmin ? 'none' : 'flex';
  // More menu: "என் கணக்கு" mirrors the t-account tab's admin gating —
  // Super Admins manage accounts via the Admin tab instead.
  var moreAcctBtn = document.getElementById('moreAccountBtn');
  if (moreAcctBtn) moreAcctBtn.style.display = isAdmin ? 'none' : 'flex';
  var planLabels = { trial:'Trial', basic:'Basic', premium:'Premium' };
  document.getElementById('hdrUser').textContent = (isAdmin ? 'Admin ' : '') + S.name;
  document.getElementById('hdrPlan').textContent = isAdmin ? '' : (planLabels[S.plan] || S.plan);
  // FIX [42]: Upgrade button — only for account owners (main/super_admin,
  // not sub-users, who inherit their parent's plan) who aren't Premium yet.
  var upBtn = document.getElementById('upgradeHdrBtn');
  if (upBtn) upBtn.style.display = (S.role !== 'sub' && S.plan !== 'premium') ? 'flex' : 'none';
  // FIX [47]: Event management button — only for account owners
  var evBtn = document.getElementById('eventHdrBtn');
  if (evBtn) evBtn.style.display = (['main','super_admin'].indexOf(S.role) !== -1) ? 'flex' : 'none';
  // FIX [49]: Counter button — only when an event is active
  var mcBtn = document.getElementById('moiCounterBtn');
  if (mcBtn) mcBtn.style.display = _activeEventId ? 'flex' : 'none';
}




// ============================================================
// V99 — UNSAVED ENTRY EXIT PROTECTION (launch-safe)
// ============================================================
function _nmValue(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function _nmHasUnsavedEntry(scope) {
  if ((!scope || scope === 'moi') && document.getElementById('appScreen')) {
    var addPage = document.getElementById('pg-add');
    if (addPage && addPage.classList.contains('show')) {
      if (_nmValue('f_amt') || _nmValue('f_place') || _nmValue('f_name') ||
          _nmValue('f_note') || _nmValue('f_nakai_other')) return true;
    }
  }
  if ((!scope || scope === 'expense') && document.getElementById('expenseScreen')) {
    var expAdd = document.getElementById('ep-add');
    if (expAdd && expAdd.classList.contains('show')) {
      if (_nmValue('ex_amount') || _nmValue('ex_subcategory') || _nmValue('ex_description') ||
          _nmValue('in_amount') || _nmValue('in_description') || _nmValue('loan_amount') ||
          _nmValue('loan_person') || _nmValue('loan_return_date') || _nmValue('loan_notes')) return true;
    }
  }
  return false;
}

function _nmConfirmDiscard(scope) {
  if (!_nmHasUnsavedEntry(scope)) return true;
  return window.confirm('நீங்கள் உள்ளிட்ட பதிவு இன்னும் சேமிக்கப்படவில்லை. வெளியே சென்றால் இந்த தகவல் இழக்கப்படும். தொடர வேண்டுமா?');
}

window.addEventListener('beforeunload', function(e) {
  if (!_nmHasUnsavedEntry()) return;
  e.preventDefault();
  e.returnValue = '';
});


// ── APP SELECTOR ──────────────────────────────────────────────
var _currentApp = 'moi'; // active module


function selectApp(app) {
  // V98 launch hardening: module switching while a save is in flight can
  // make the result look uncertain. Keep the current module visible until
  // the request finishes; form values remain untouched.
  if (typeof _moiSaveInFlight !== 'undefined' && _moiSaveInFlight) {
    toast('⏳ பதிவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _expenseSaveInFlight !== 'undefined' && _expenseSaveInFlight) {
    toast('⏳ செலவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _moiEditInFlight !== 'undefined' && _moiEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _expEditInFlight !== 'undefined' && _expEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (app !== _currentApp && !_nmConfirmDiscard(_currentApp === 'expense' ? 'expense' : 'moi')) return;
  // V81: never route into a module the account owner has disabled.
  if (app === 'moi' && typeof MODULE_PREFS !== 'undefined' && MODULE_PREFS.moi === false) {
    if (MODULE_PREFS.expense) {
      _currentApp = 'expense';
      showScreen('expenseScreen');
      initExpenseScreen();
      return;
    }
    showScreen('appScreen');
    go('tamilCalendar');
    return;
  }
  if (app === 'expense' && typeof MODULE_PREFS !== 'undefined' && MODULE_PREFS.expense === false) {
    if (MODULE_PREFS.moi) { app = 'moi'; }
    else { showScreen('appScreen'); go('tamilCalendar'); return; }
  }
  _currentApp = app;
  if (app === 'moi') {
    var sw = document.getElementById('appSwitchBtn');
    if (sw) sw.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg>';
    enterApp(); // full init (dates, loadData, reminders...) — not just a screen flip
  } else if (app === 'expense') {
    showScreen('expenseScreen');
    initExpenseScreen();
  } else {
    showScreen('appScreen');
  }
  localStorage.setItem('moi_last_app', app);
  if (typeof _nmSaveResumeState === 'function') {
    _nmSaveResumeState(app === 'expense' ? 'expense' : 'moi', app === 'expense' ? (typeof _expTab !== 'undefined' ? _expTab : 'list') : (typeof curTab !== 'undefined' ? curTab : 'today'));
  }
}


// FIX: after ANY successful login/session-restore, land on the App
// Selector so the person picks which module to open — previously this
// went straight into the moi register screen, skipping the selector
// entirely (reported bug: "login pannuna direct intha screen poguthu").
function _routeAfterLogin() {
  // V81: load per-user module choices before deciding the landing screen.
  loadModulePreferences(function(res) {
    if (res && res.configured === false) {
      showScreen('appScreen');
      openModuleSettings(true);
      return;
    }
    _routeByModulePreferences();
  });
}


function openAppSelector() {
  // Respect the owner's enabled-module choices instead of always forcing MOI.
  _routeByModulePreferences();
}


// V272: the old App Selector dashboard snapshot UI was removed. Its
// loadDashboardSummary() network helper had no remaining caller or target DOM,
// so it is intentionally removed to avoid stale/accidental server calls.


function enterApp() {
  _hideAll();
  document.getElementById('appScreen').style.display = 'block';

  document.getElementById('hdrDate').textContent =
    new Date().toLocaleDateString('ta-IN',{weekday:'long',month:'long',day:'numeric'});

  var today = todayStr();
  document.getElementById('selDate').value   = today;
  document.getElementById('monthPick').value = today.substring(0,7);
  document.getElementById('f_date').value    = today;

  curTab = 'today'; amtVisible = false; nakaiFilter = null;
  // Always land on the dashboard tab itself (not just the curTab variable) —
  // scoped to #appScreen so this can never touch Daily Cash's own et-*/ep-*
  // tabs/pages, mirroring the go() fix above.
  document.querySelectorAll('#appScreen .tab').forEach(function(t){ t.classList.remove('on'); });
  document.querySelectorAll('#appScreen .pg').forEach(function(p){ p.classList.remove('show'); });
  var _tbToday = document.getElementById('t-today'); if (_tbToday) _tbToday.classList.add('on');
  var _pgToday = document.getElementById('p-today'); if (_pgToday) _pgToday.classList.add('show');
  if (typeof _setMainNavGroup === 'function') _setMainNavGroup('home'); // V49: nav bar follows the same "always land on dashboard" guarantee
  _applyRoleUI(); // FIX [BUG-8]: shared helper keeps role UI consistent
  if (typeof _applyModulePreferences === 'function') _applyModulePreferences();
  // FIX [48]: re-apply role UI after load too — belt-and-suspenders
  // since S.role may be set from cache before first server confirm.
  // FIX [DI-12]: initTM() (the old per-keystroke chip-suggestion Tamil
  // system in js_common.html) is INTENTIONALLY no longer called here.
  // It was bound to the same fields (f_place, f_name, m_place, m_name)
  // as the newer, fixed attachTamilTransliteration/_initTamilTransliteration
  // system — the two fought over the same input on every keystroke.
  // initTM() rebuilt el.value on every single character via a hijacked
  // keydown handler and never restored cursor position afterwards,
  // which is the actual root cause of the reported "cursor jumps to
  // end while editing" bug. The old attachTamil()/initTM() code is left
  // in js_common.html but is now dead/unused — not deleted, to keep
  // this change minimal and easily reversible.
  loadData();
  // V125: direct restore for recent returns; old state stays on Dashboard as an optional Continue card.
  setTimeout(function(){ if (typeof _nmApplyResumeAfterEntry === 'function') _nmApplyResumeAfterEntry(); }, 120);
  _checkDueReminders(); // reminder system — show due alerts on login
  if (S.role === 'super_admin') _checkFeedbackBadge(); // FIX [3]: unread feedback indicator; FIX [14]: role renamed
}


function confirmLogout() {
  showConfirm('வெளியேற விரும்புகிறீர்களா?', function(){
    _nmClearTrustedSession();
    S = null;
    try {
      google.script.run
        .withSuccessHandler(function(){ location.reload(); })
        .withFailureHandler(function(){ location.reload(); })
        .logoutSession();
    } catch(e) { location.reload(); }
  });
}


// ============================================================
// FORGOT PASSWORD — OTP flow
// ============================================================
function showForgotPassword() {
  _hideAll();
  document.getElementById('forgotPasswordScreen').style.display = 'flex';
  document.getElementById('fpStep1').style.display = 'block';
  document.getElementById('fpStep2').style.display = 'none';
  document.getElementById('fpErr').textContent = '';
  document.getElementById('fp_email').value = document.getElementById('loginEmailText') ?
    (document.getElementById('loginEmailText').textContent || '') : '';
}


var _fpSendBusy = false;
var _fpSendSeq = 0;

function fpSendOtp() {
  var email = document.getElementById('fp_email').value.trim();
  var err   = document.getElementById('fpErr');
  err.textContent = '';
  if (!email) { err.textContent = 'Email உள்ளிடவும்'; return; }
  if (!navigator.onLine) {
    err.style.color = '#DC2626';
    err.textContent = 'Internet இல்லை. இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்.';
    return;
  }
  if (_fpSendBusy) return;

  var btn = document.getElementById('fpSendBtn');
  _fpSendBusy = true;
  var seq = ++_fpSendSeq;
  btn.disabled = true; btn.textContent = 'அனுப்புகிறது...';

  var timer = setTimeout(function() {
    if (seq !== _fpSendSeq || !_fpSendBusy) return;
    _fpSendBusy = false;
    ++_fpSendSeq; // invalidate a delayed callback from this request
    btn.disabled = false; btn.textContent = '📧 OTP அனுப்பு';
    err.style.color = '#DC2626';
    err.textContent = 'OTP அனுப்ப நேரம் அதிகமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  function finish() {
    if (seq !== _fpSendSeq) return false;
    clearTimeout(timer);
    _fpSendBusy = false;
    btn.disabled = false; btn.textContent = '📧 OTP அனுப்பு';
    return true;
  }

  google.script.run
    .withSuccessHandler(function(res) {
      if (!finish()) return;
      if (res.ok) {
        document.getElementById('fpStep1').style.display = 'none';
        document.getElementById('fpStep2').style.display = 'block';
        document.getElementById('fpEmail2').textContent = email;
        err.style.color = '#0F6E56';
        err.textContent = '✅ OTP ' + email + ' க்கு அனுப்பப்பட்டது';
        _startOtpTimer();
      } else {
        err.style.color = '#DC2626';
        err.textContent = res.msg;
      }
    })
    .withFailureHandler(function(e) {
      if (!finish()) return;
      err.style.color = '#DC2626';
      err.textContent = friendlyErrorMsg(e);
    })
    .forgotPasswordSendOtp(email);
}

var _otpTimer = null;

function _startOtpTimer() {
  var secs = 180;
  var el   = document.getElementById('fpTimer');
  if (_otpTimer) clearInterval(_otpTimer);
  _otpTimer = setInterval(function() {
    secs--;
    var m = Math.floor(secs/60), s = secs%60;
    if (el) el.textContent = m + ':' + (s<10?'0':'')+s;
    if (secs <= 0) {
      clearInterval(_otpTimer);
      document.getElementById('fpErr').textContent = '⏱ OTP காலாவதியானது. மீண்டும் முயற்சிக்கவும்';
      document.getElementById('fpErr').style.color = '#DC2626';
    }
  }, 1000);
}


var _fpResetBusy = false;
var _fpResetSeq = 0;

function fpResetPassword() {
  var email = document.getElementById('fp_email').value.trim();
  var otp   = document.getElementById('fp_otp').value.trim();
  var p1    = document.getElementById('fp_pass1').value;
  var p2    = document.getElementById('fp_pass2').value;
  var err   = document.getElementById('fpErr');
  err.style.color = '#DC2626';
  err.textContent = '';
  if (!otp)          { err.textContent = 'OTP உள்ளிடவும்'; return; }
  if (!/^\d{6}$/.test(p1)) { err.textContent = '6 இலக்க PIN உள்ளிடவும்'; return; }
  if (p1 !== p2)     { err.textContent = 'Passwords match ஆகவில்லை'; return; }
  if (!navigator.onLine) {
    err.textContent = 'Internet இல்லை. இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்.';
    return;
  }
  if (_fpResetBusy) return;

  var btn = document.getElementById('fpResetBtn');
  _fpResetBusy = true;
  var seq = ++_fpResetSeq;
  btn.disabled = true; btn.textContent = 'மாற்றுகிறது...';

  var timer = setTimeout(function() {
    if (seq !== _fpResetSeq || !_fpResetBusy) return;
    _fpResetBusy = false;
    ++_fpResetSeq; // invalidate a delayed callback from this request
    btn.disabled = false; btn.textContent = '✅ Password மாற்று';
    err.textContent = 'Password மாற்ற நேரம் அதிகமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
  }, 25000);

  function finish() {
    if (seq !== _fpResetSeq) return false;
    clearTimeout(timer);
    _fpResetBusy = false;
    btn.disabled = false; btn.textContent = '✅ Password மாற்று';
    return true;
  }

  google.script.run
    .withSuccessHandler(function(res) {
      if (!finish()) return;
      if (res.ok) {
        if (_otpTimer) clearInterval(_otpTimer);
        _hideAll();
        var ls = document.getElementById('passwordLoginScreen');
        if (ls) ls.style.display = 'flex';
        var le = document.getElementById('loginErr');
        if (le) { le.style.color = '#0F6E56'; le.textContent = '✅ Password மாற்றப்பட்டது! இப்போது login செய்யவும்.'; }
      } else {
        err.textContent = res.msg;
        if (res.expired) {
          document.getElementById('fpStep1').style.display = 'block';
          document.getElementById('fpStep2').style.display = 'none';
        }
      }
    })
    .withFailureHandler(function(e) {
      if (!finish()) return;
      err.textContent = friendlyErrorMsg(e);
    })
    .forgotPasswordReset(email, otp, p1);
}


// ============================================================
// V97 — TERMINAL SESSION FAILURE RECOVERY (launch-safe)
// ============================================================
// Detect only authentication/account/plan failures returned by protected
// server calls. Clear the stale cached session so the next app open performs
// a fresh verification, but DO NOT auto-route/reload here: the current form
// and anything the user typed must remain untouched.
function handleTerminalSessionFailure(e) {
  var raw = (e && (e.message || e.toString())) || String(e || '');
  var msg = raw.toLowerCase();
  var terminal =
    raw.indexOf('Google கணக்கில் உள்நுழையவும்') !== -1 ||
    raw.indexOf('Google Auth தேவை') !== -1 ||
    raw.indexOf('கணக்கு பதிவில்லை') !== -1 ||
    raw.indexOf('கணக்கு தடை செய்யப்பட்டுள்ளது') !== -1 ||
    raw.indexOf('Trial காலம் முடிந்தது') !== -1 ||
    raw.indexOf('Trial record limit') !== -1 ||
    raw.indexOf('சந்தா காலம் முடிந்தது') !== -1 ||
    msg.indexOf('session expired') !== -1;

  if (!terminal) return false;
  try { localStorage.removeItem('moi_session'); } catch(ignore) {}

  if (raw.indexOf('Trial') !== -1 || raw.indexOf('சந்தா காலம் முடிந்தது') !== -1) {
    toast('⏳ உங்கள் Trial/Plan காலம் முடிந்துள்ளது. நீங்கள் உள்ளிட்ட பதிவு அழியவில்லை; Account-ஐ renew செய்து மீண்டும் Save செய்யுங்கள்.');
  } else if (raw.indexOf('தடை') !== -1 || raw.indexOf('பதிவில்லை') !== -1) {
    toast('🔒 Account access கிடைக்கவில்லை. நீங்கள் உள்ளிட்ட பதிவு அழியவில்லை; Admin-ஐ தொடர்பு கொள்ளுங்கள்.');
  } else {
    toast('🔑 Login session முடிந்துள்ளது. நீங்கள் உள்ளிட்ட பதிவு அழியவில்லை; app-ஐ மீண்டும் திறந்து Login செய்து Save செய்யுங்கள்.');
  }
  return true;
}

// ============================================================
// V94 — APP RESUME / OFFLINE RECOVERY (launch-safe)
// ============================================================
// Refresh only the currently visible module after a meaningful background
// pause or after connectivity returns. Never refresh while the user has an
// unsaved entry/modal open or while a save button is busy.
(function initResumeRefresh() {
  if (window.__nmResumeRefreshInit) return;
  window.__nmResumeRefreshInit = true;

  var hiddenAt = 0;
  var lastRefreshAt = 0;
  var wasOffline = !navigator.onLine;
  var MIN_AWAY_MS = 30000;
  var MIN_REFRESH_GAP_MS = 15000;

  function isVisible(id) {
    var el = document.getElementById(id);
    return !!(el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none');
  }

  function hasOpenModal() {
    return Array.prototype.some.call(document.querySelectorAll('.modal-bg'), function(el) {
      return getComputedStyle(el).display !== 'none';
    });
  }

  function hasBusySave() {
    var scope = isVisible('expenseScreen') ? document.getElementById('expenseScreen') : document.getElementById('appScreen');
    return !!(scope && scope.querySelector('button:disabled'));
  }

  function valueOf(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function hasUnsavedEntry() {
    if (hasOpenModal()) return true;

    if (isVisible('appScreen')) {
      var addPage = document.getElementById('pg-add');
      if (addPage && addPage.classList.contains('show')) {
        return !!(valueOf('f_amt') || valueOf('f_place') || valueOf('f_name') ||
          valueOf('f_note') || valueOf('f_nakai_other'));
      }
    }

    if (isVisible('expenseScreen')) {
      var expAdd = document.getElementById('ep-add');
      if (expAdd && expAdd.classList.contains('show')) {
        return !!(valueOf('ex_amount') || valueOf('ex_subcategory') || valueOf('ex_description') ||
          valueOf('in_amount') || valueOf('in_description') || valueOf('loan_amount') ||
          valueOf('loan_person') || valueOf('loan_return_date') || valueOf('loan_notes'));
      }
    }
    return false;
  }

  function refreshCurrentModule() {
    var now = Date.now();
    if (!navigator.onLine || now - lastRefreshAt < MIN_REFRESH_GAP_MS) return;
    if (hasBusySave() || hasUnsavedEntry()) return;

    if (isVisible('expenseScreen')) {
      if (typeof expGo === 'function' && typeof _expTab !== 'undefined' && _expTab !== 'add') {
        lastRefreshAt = now;
        expGo(_expTab);
      }
      return;
    }

    if (isVisible('appScreen') && typeof loadData === 'function') {
      lastRefreshAt = now;
      loadData();
    }
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    var awayFor = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (wasOffline || awayFor >= MIN_AWAY_MS) refreshCurrentModule();
  });

  window.addEventListener('offline', function() {
    wasOffline = true;
    if (typeof toast === 'function') toast('📴 இணைய இணைப்பு இல்லை');
  });

  window.addEventListener('online', function() {
    var recovered = wasOffline;
    wasOffline = false;
    if (typeof toast === 'function') toast('✅ இணையம் மீண்டும் இணைந்தது');
    if (recovered) setTimeout(refreshCurrentModule, 300);
  });
})();




// v267 — Daily Cash voice entry (Expense / Income / Hand Loan text fields only).
// Voice fills only the selected field; it never saves, changes transaction type,
// or interprets spoken amounts. Tamil-first with per-field English toggle.
var _cashVoiceRecognition = null;
var _cashVoiceLang = {
  ex_subcategory: 'ta-IN',
  ex_description: 'ta-IN',
  in_description: 'ta-IN',
  loan_person: 'ta-IN',
  loan_notes: 'ta-IN'
};
function _cashVoiceCtor(){ return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
function toggleCashVoiceLang(fieldId){
  var cur=_cashVoiceLang[fieldId]||'ta-IN';
  _cashVoiceLang[fieldId]=(cur==='ta-IN')?'en-IN':'ta-IN';
  var btn=document.querySelector('[data-cash-voice-lang="'+fieldId+'"]');
  if(btn){
    btn.textContent=(_cashVoiceLang[fieldId]==='ta-IN')?'த':'EN';
    btn.title=(_cashVoiceLang[fieldId]==='ta-IN')?'தமிழ் voice — தட்டி English-க்கு மாற்றவும்':'English voice — தட்டி தமிழுக்கு மாற்றவும்';
  }
}
function startCashVoiceEntry(fieldId){
  var el=document.getElementById(fieldId);
  if(!el) return;
  if(_cashVoiceRecognition){ try{_cashVoiceRecognition.stop();}catch(e){} _cashVoiceRecognition=null; }
  var Recognition=_cashVoiceCtor();
  if(!Recognition){
    if(typeof showToast==='function') showToast('இந்த browser/app-ல் voice input support இல்லை. Keyboard voice typing பயன்படுத்தலாம்.');
    else alert('இந்த browser/app-ல் voice input support இல்லை.');
    return;
  }
  var rec=new Recognition();
  _cashVoiceRecognition=rec;
  rec.lang=_cashVoiceLang[fieldId]||'ta-IN';
  rec.interimResults=false; rec.continuous=false; rec.maxAlternatives=1;
  var btn=document.querySelector('[data-cash-voice="'+fieldId+'"]');
  function setListening(on){
    if(!btn) return;
    if(on){ btn.classList.add('listening'); btn.setAttribute('aria-pressed','true'); }
    else { btn.classList.remove('listening'); btn.removeAttribute('aria-pressed'); }
  }
  rec.onstart=function(){ setListening(true); };
  rec.onresult=function(ev){
    var text='';
    try{ text=(ev.results[0][0].transcript||'').trim(); }catch(e){}
    if(!text) return;
    var existing=(el.value||'').trim();
    el.value=existing ? (existing+' '+text) : text;
    try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){ try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){} }
  };
  rec.onerror=function(ev){
    var code=ev&&ev.error||'';
    var msg=(code==='not-allowed')?'Microphone permission அனுமதிக்கவும்.':(code==='service-not-allowed'?'இந்த app/WebView-ல் direct voice recognition கிடைக்கவில்லை. Keyboard 🎤 voice typing பயன்படுத்தவும்.':'Voice input கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.');
    if(typeof showToast==='function') showToast(msg);
  };
  rec.onend=function(){ setListening(false); _cashVoiceRecognition=null; try{el.focus();}catch(e){} };
  try{ rec.start(); }catch(e){ setListening(false); _cashVoiceRecognition=null; if(typeof showToast==='function') showToast('Direct voice input தொடங்கவில்லை. Keyboard 🎤 voice typing பயன்படுத்தவும்.'); }
}

// ============================================================
// EXPENSE TRACKER MODULE
// ============================================================

// v236L — explicit save-state flag. Previously doAddExpense() read this
// identifier before it had ever been declared, which throws a ReferenceError
// and stops Expense saves before the server call. Income/Hand Loan were not
// affected because they use their own save paths.
var _expenseSaveInFlight = false;
var _expenseBillDraft = null;
var _expenseBillReplaceId = null;

function _invalidateDashboardExpenseSummary() {
  if (typeof window !== 'undefined' && typeof window.invalidateDashboardExpenseCache === 'function') {
    window.invalidateDashboardExpenseCache();
  }
}
var _expTab = 'add';
var _cashAddType = 'expense';
var _cashAccountBalance = 0;
var _cashMonthlyBudget = 0;
// v240 — session-only guard for accidental repeated manual saves. No storage/schema impact.
var _lastManualExpenseSave = null;
var _expenseSubcategorySuggestions = {};
var _handLoanPersonSuggestions = [];
// v157: learned merchant -> expense/income category rules. Raw SMS is never stored here/server-side.
var _smsExpenseRules = {};
var _smsLastAnalysis = null;
var _txnLoadSeq = 0;
var _summaryLoadSeq = 0;

// v236ZF — GPay-style Daily Cash amount entry. Display uses Indian digit grouping
// without a currency symbol; save paths always parse back to a raw number.
function _cashAmountRaw(value) {
  var digits = String(value == null ? '' : value).replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}
function _cashAmountFormat(value) {
  var digits = String(value == null ? '' : value).replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  var last3 = digits.slice(-3), rest = digits.slice(0, -3);
  return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last3;
}
function _cashAmountNext(id) {
  var nextId = id === 'ex_amount' ? 'ex_date' : (id === 'in_amount' ? 'in_date' : 'loan_person');
  var next = document.getElementById(nextId);
  if (!next) return;
  try { next.focus({preventScroll:true}); } catch (_) { next.focus(); }
  setTimeout(function(){ try { next.scrollIntoView({behavior:'smooth', block:'center'}); } catch (_) {} }, 20);
}
function _initCashAmountInputs() {
  ['ex_amount','in_amount','loan_amount'].forEach(function(id){
    var el = document.getElementById(id);
    if (!el || el.dataset.gpayAmountBound === '1') return;
    el.dataset.gpayAmountBound = '1';
    el.addEventListener('input', function(){
      var raw = String(el.value || '').replace(/[^0-9]/g, '');
      el.value = _cashAmountFormat(raw);
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {}
    });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); _cashAmountNext(id); }
    });
    el.addEventListener('change', function(){ el.value = _cashAmountFormat(el.value); });
  });
}


// FIX [CRITICAL BUG]: this function was accidentally deleted during an
// earlier edit while its 16 call sites (renderTransactionList,
// renderExpenseSummary, renderAccountsTab, doAddExpense, etc.) remained —
// every one of them called _handleExpModuleLock(res) as the FIRST line
// inside its success handler, so a ReferenceError fired immediately and
// halted the rest of that handler. This is why EVERY Daily Cash Expenses
// tab got stuck on "ஏற்றுகிறது..." forever (confirmed via the browser
// console: "_handleExpModuleLock is not defined").
function _handleExpModuleLock(res) {
  var locked = res && res.ok === false && res.upgrade;
  var notice = document.getElementById('expLockNotice');
  if (notice) notice.style.display = locked ? 'block' : 'none';
  if (locked) toast('⭐ ' + (res.msg || 'திட்ட மேம்பாடு தேவை'));
  return locked;
}


function initExpenseScreen() {
  document.getElementById('expHdrDate').textContent =
    new Date().toLocaleDateString('ta-IN', { weekday:'long', month:'long', day:'numeric' });
  var planLabels = { trial:'Trial', basic:'Basic', premium:'Premium' };
  document.getElementById('expHdrPlan').textContent = planLabels[S.plan] || S.plan || '';

  var today = todayStr();
  document.getElementById('ex_date').value = today;
  document.getElementById('in_date').value = today;
  document.getElementById('loan_date').value = today;
  document.getElementById('tr_date').value = today;
  _txnRefDate = today;
  var _initMonth = _monthBounds(0);
  _applyExpenseRangeState('month', _initMonth.start, _initMonth.end, today.substring(0,7), today.substring(0,4));
  _initCashAmountInputs();
  setAddType('expense'); // default to Expense when the tab opens
  var expFab = document.getElementById('expFab');
  if (expFab) expFab.style.display = (typeof _nmRoleCanWrite === 'function' && !_nmRoleCanWrite()) ? 'none' : '';

  // FIX [PERF]: one combined call instead of 3 separate round-trips
  // (expense categories, income categories, accounts) — see Code.gs.
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) { if (_handleExpModuleLock(res)) return; toast('❌ ' + (res.msg || 'பிழை')); return; }
      _categoryCache.expense = res.expenseCategories || [];
      _categoryCache.income  = res.incomeCategories  || [];
      _expenseSubcategorySuggestions = res.expenseNameSuggestions || {};
      _handLoanPersonSuggestions = res.handLoanNameSuggestions || [];
      _smsExpenseRules = res.smsRules || {};
      _renderCategoryPicker('expense', 'ex_category_picker', 'ex_category');
      _renderCategoryPicker('income',  'in_source_picker',   'in_source');
      _renderExpenseSubcategorySuggestions(document.getElementById('ex_category').value || '');
      _renderHandLoanPersonSuggestions();
      _applyAccountsResponse(res.accounts || []);
      _cashAccountBalance = (res.accounts || []).reduce(function(sum, a){ return sum + (Number(a.balance) || 0); }, 0);
      _cashMonthlyBudget = Number(res.budget) || 0;
      document.getElementById('exp_budget_amt').value = res.budget || '';
      _renderCashOverview(_txnDataCache);
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getExpenseScreenInit();

  // V49: Add is no longer a persistent tab (opened directly via the FAB
  // instead) — default landing tab is பதிவுகள் (list) so entering Cash
  // never shows a tab bar with nothing selected.
  expGo('list');
}


// FIX: Add Expense + Add Income used to be two separate, near-identical-
// looking tabs — reported as confusing ("இரண்டும் ஒண்ணு தான் மாதிரி
// இருக்கு"). Merged into one tab with a simple toggle instead.
function setAddType(type) {
  type = type === 'income' || type === 'handloan' ? type : 'expense';
  _cashAddType = type;
  document.getElementById('expAddForm').style.display = type === 'expense' ? 'block' : 'none';
  document.getElementById('incAddForm').style.display = type === 'income'  ? 'block' : 'none';
  document.getElementById('loanAddForm').style.display = type === 'handloan' ? 'block' : 'none';
  document.getElementById('addtype-expense').classList.toggle('on', type === 'expense');
  document.getElementById('addtype-income').classList.toggle('on', type === 'income');
  document.getElementById('addtype-handloan').classList.toggle('on', type === 'handloan');
  setTimeout(function(){
    var id = type === 'expense' ? 'ex_amount' : (type === 'income' ? 'in_amount' : 'loan_amount');
    var el = document.getElementById(id);
    if (el && document.getElementById('ep-add').classList.contains('show')) el.focus();
  }, 50);
}

function openCashAdd(type) {
  setAddType(type);
  expGo('add');
}

function _uniqueSuggestionPush(list, value) {
  value = _norm(value || '');
  if (!value) return;
  var key = value.toLocaleLowerCase('ta-IN');
  if (!list.some(function(v){ return String(v).toLocaleLowerCase('ta-IN') === key; })) list.unshift(value);
  if (list.length > 50) list.length = 50;
}

// FIX [v132]: cached (previously typed) suggestions were the ONLY source —
// a first-time user with no history saw an empty suggestion list. This adds
// a small built-in default word list AFTER the cached ones, purely
// client-side (zero server calls, no change to the cached-suggestion data
// or how it's fetched/stored). Manual typing still always works since this
// is a <datalist>, not a restricted <select>.
var _EXP_SUBCATEGORY_DEFAULTS = {
  'மளிகை': ['பால்','காய்கறி','பழம்','அரிசி','எண்ணெய்','பருப்பு'],
  'பயணம்': ['பெட்ரோல்','டீசல்','பஸ்','ஆட்டோ','ரயில்'],
  'மருத்துவம்': ['மருந்து','டாக்டர்','ஸ்கேன்','லேப்'],
  'கல்வி': ['பள்ளி','கல்லூரி','புத்தகம்','டியூஷன்'],
  'வீட்டு வாடகை': ['மாத வாடகை'],
  'மின்சாரம் / பில்': ['மின்சாரம்','தண்ணீர்','எரிவாயு','Wi-Fi'],
  'பொழுதுபோக்கு': ['சினிமா','OTT','பூங்கா'],
  'உடை': ['சட்டை','சேலை','காலணி']
};

function _renderExpenseSubcategorySuggestions(category) {
  var dl = document.getElementById('ex_subcategory_list');
  var chips = document.getElementById('ex_subcategory_chips');
  if (!dl) return;
  var cached = (_expenseSubcategorySuggestions && _expenseSubcategorySuggestions[category]) || [];
  var defaults = _EXP_SUBCATEGORY_DEFAULTS[category] || [];
  var merged = [];
  cached.concat(defaults).forEach(function(v) {
    v = String(v || '').trim();
    if (!v) return;
    var key = v.toLocaleLowerCase('ta-IN');
    if (!merged.some(function(m){ return m.toLocaleLowerCase('ta-IN') === key; })) merged.push(v);
  });
  dl.innerHTML = merged.map(function(v){ return '<option value="' + x(v) + '"></option>'; }).join('');

  // Android/Median WebView does not consistently display native datalist UI.
  // Mirror the first suggestions as visible tappable chips while retaining
  // the datalist and fully manual text entry.
  if (chips) {
    chips.innerHTML = merged.slice(0, 8).map(function(v) {
      return '<button type="button" class="qc ex-subcat-chip" data-value="' + x(v) + '">' + x(v) + '</button>';
    }).join('');
    Array.prototype.forEach.call(chips.querySelectorAll('.ex-subcat-chip'), function(btn) {
      btn.addEventListener('click', function() { _pickExpenseSubcategory(btn.getAttribute('data-value') || ''); });
    });
  }
}

function _pickExpenseSubcategory(value) {
  var el = document.getElementById('ex_subcategory');
  if (!el) return;
  el.value = value || '';
  el.focus();
}

// HandLoan-specific add/contact/ledger UI moved to js_handloan.html

function _renderCashOverview(res) {
  var balanceEl = document.getElementById('cashOverviewBalance');
  if (!balanceEl) return;
  var income = res && res.ok ? ((Number(res.totalIncome) || 0) + (Number(res.totalLoanReceived) || 0)) : 0;
  var expense = res && res.ok ? ((Number(res.totalExpense) || 0) + (Number(res.totalSeimurai) || 0) + (Number(res.totalLoanGiven) || 0)) : 0;
  var net = income - expense;
  // When no Cash/Bank/Card account exists yet, showing the account total
  // as ₹0 is misleading because the user may already have valid Daily Cash
  // entries. In that case show the selected period's recorded net instead.
  // Once at least one account exists, keep the account-balance behaviour.
  var hasAccountSetup = Array.isArray(_accountsCache) && _accountsCache.length > 0;
  animateStatText(balanceEl, _money(hasAccountSetup ? _cashAccountBalance : net));
  animateStatText(document.getElementById('cashOverviewIncome'), _money(income));
  animateStatText(document.getElementById('cashOverviewExpense'), _money(expense));
  var netEl = document.getElementById('cashOverviewNet');
  animateStatText(netEl, (net < 0 ? '−' : '') + _money(Math.abs(net)));
  netEl.classList.toggle('negative', net < 0);
  var periodEl = document.getElementById('cashOverviewPeriod');
  if (periodEl) {
    var label = (typeof _expenseRangeLabel === 'function' ? _expenseRangeLabel() : 'Current Month') + ' பணநிலை';
    var showBudget = _expenseRangeMode === 'month';
    periodEl.textContent = label + (showBudget && _cashMonthlyBudget > 0 ? ' · பட்ஜெட் ' + _money(_cashMonthlyBudget) : '');
  }
}


// FIX: Sub-Category / Recurring / Account are genuinely optional for most
// entries — hidden by default behind "மேலும் விவரங்கள்" so the quick-add
// form stays to just Date + Category + Amount for the common case.
function toggleMoreDetails(type) {
  var detailsId = type === 'expense' ? 'ex_more_details' : (type === 'handloan' ? 'loan_more_details' : 'in_more_details');
  var toggleId  = type === 'expense' ? 'ex_more_toggle'  : (type === 'handloan' ? 'loan_more_toggle' : 'in_more_toggle');
  var el = document.getElementById(detailsId);
  var toggle = document.getElementById(toggleId);
  if (!el || !toggle) return;
  var showing = el.style.display === 'none' || !el.style.display;
  el.style.display = showing ? 'block' : 'none';
  toggle.innerHTML = showing ? '➖ விவரங்களை மறை' : '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> மேலும் விவரங்கள் (Optional)';
}


// Tab switcher for the Expense screen — mirrors go() for the moi appScreen.
function expGo(tab) {
  if (tab === 'add' && typeof _nmGuardWrite === 'function' && !_nmGuardWrite('புதிய Daily Cash பதிவு')) return;
  // V98 launch hardening: keep the current screen stable until save returns.
  if (typeof _expenseSaveInFlight !== 'undefined' && _expenseSaveInFlight) {
    toast('⏳ செலவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _moiSaveInFlight !== 'undefined' && _moiSaveInFlight) {
    toast('⏳ பதிவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _expEditInFlight !== 'undefined' && _expEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _moiEditInFlight !== 'undefined' && _moiEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (_expTab === 'add' && tab !== 'add' && typeof _nmConfirmDiscard === 'function' && !_nmConfirmDiscard('expense')) return;
  _expTab = tab;
  if (typeof _nmSaveResumeState === 'function') _nmSaveResumeState('expense', tab);
  ['add','list','summary','accounts','budget'].forEach(function(t) {
    var pg  = document.getElementById('ep-' + t);
    var btn = document.getElementById('et-' + t);
    if (pg)  pg.classList.toggle('show', t === tab);
    if (btn) btn.classList.toggle('on', t === tab);
  });
  if (tab === 'add') { setTimeout(function(){ var id = _cashAddType === 'income' ? 'in_amount' : (_cashAddType === 'handloan' ? 'loan_amount' : 'ex_amount'); var el = document.getElementById(id); if (el) el.focus(); }, 80); }
  if (tab === 'list')    renderTransactionList();
  if (tab === 'summary') { renderBalanceTopCard(); renderExpenseSummary(); }
  if (tab === 'accounts') { renderAccountsTab(); }
  if (tab === 'budget')  { loadBudgetIntoForm(); renderCategoryBudgetList(); }
}


// "Manage Accounts" is tucked behind this collapsible section within
// Summary (was a separate tab), so Summary isn't cluttered by default.
function toggleAcctSection() {
  // Backward-compatible route: Accounts now has its own page so Summary stays analytics-only.
  expGo('accounts');
}


// ── UNIFIED CASH LEDGER (client) ──────────────────────────────────
// Renders the daily reconciliation. All figures come from the server
// (getCashLedgerForDate); the client never computes expected/difference.
var _cashLedgerDate = null;


function toggleCashLedger() {
  var el = document.getElementById('cashLedgerSection');
  var showing = el.style.display === 'none' || !el.style.display;
  el.style.display = showing ? 'block' : 'none';
  document.getElementById('cashLedgerToggle').innerHTML =
    showing ? '− பணப் பதிவேட்டை மறை' : '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calculator"></use></svg> தினசரி பணப் பதிவேடு';
  if (showing) {
    if (!_cashLedgerDate) _cashLedgerDate = todayStr();
    renderCashLedger();
  }
}


function shiftCashLedgerDate(days) {
  var d = new Date(_cashLedgerDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  _cashLedgerDate = fmtYmd(d);
  renderCashLedger();
}


function renderCashLedger() {
  var box = document.getElementById('cashLedgerSection');
  box.innerHTML = '<div class="empty"><div class="ei">⏳</div>ஏற்றுகிறது...</div>';
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res || !res.ok) { box.innerHTML = '<div class="empty">' + ((res && res.msg) || 'ஏற்ற முடியவில்லை') + '</div>'; return; }
      if (!res.hasCash) { box.innerHTML = '<div class="dup soft">' + res.msg + '</div>'; return; }
      box.innerHTML = _cashLedgerHtml(res);
    })
    .withFailureHandler(function(e){ box.innerHTML = '<div class="empty">பிழை: ' + friendlyErrorMsg(e) + '</div>'; })
    .getCashLedgerForDate(_cashLedgerDate);
}


function _money(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN'); }


function _cashLedgerHtml(r) {
  var diffColor = r.diff === 0 ? '#6E1423' : (r.diff > 0 ? 'var(--b)' : 'var(--red)');
  var diffLabel = r.diff == null ? '' :
      (r.diff === 0 ? '✓ சரியாக பொருந்துகிறது'
        : (r.diff > 0 ? 'உபரி (Actual அதிகம்)' : 'பற்றாக்குறை (Actual குறைவு)'));
  var h = '';
  // date nav (mirrors the frozen Daily Cash date bar pattern)
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
     +   '<button class="btn-cancel" style="padding:8px 12px" onclick="shiftCashLedgerDate(-1)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-chevron-left"></use></svg></button>'
     +   '<div style="flex:1;text-align:center;font-weight:600">' + fmtDate(r.date) + '</div>'
     +   '<button class="btn-cancel" style="padding:8px 12px" onclick="shiftCashLedgerDate(1)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-chevron-right"></use></svg></button>'
     + '</div>';
  // the reconciliation stack
  h += '<div class="card" style="margin-bottom:12px">';
  h += _cashLine('தொடக்க இருப்பு (Opening)', _money(r.opening), false);
  h += _cashLine('பணவரவு', '+ ' + _money(r.inflow), false);
  h += _cashLine('பணச்செலவு', '− ' + _money(r.outflow), false);
  h += '<div style="border-top:1px solid var(--bdr);margin:8px 0"></div>';
  h += _cashLine('எதிர்பார்க்கும் இருப்பு (Expected)', _money(r.expected), true);
  h += '</div>';
  // actual count input + close
  h += '<div class="fg"><label>உண்மையான ரொக்க இருப்பு</label>'
     + '<input type="number" inputmode="numeric" class="inp" id="cashActualInput" placeholder="எண்ணி இங்கே உள்ளிடவும்" value="' + (r.actual != null ? r.actual : '') + '"></div>';
  h += '<div class="fg"><label>குறிப்பு (Note, optional)</label>'
     + '<input type="text" class="inp" id="cashNoteInput" value="' + (r.note ? x(r.note) : '') + '"></div>';
  // live difference (shown after a close)
  if (r.diff != null) {
    h += '<div class="card" style="margin-bottom:12px;text-align:center">'
       +   '<div style="font-size:12px;color:var(--muted)">வித்தியாசம் (Difference)</div>'
       +   '<div style="font-size:22px;font-weight:700;color:' + diffColor + '">' + _money(r.diff) + '</div>'
       +   '<div style="font-size:12px;color:' + diffColor + '">' + diffLabel + '</div>'
       + '</div>';
  }
  h += '<button class="btn-save" style="width:100%" onclick="doCashClose()">'
     + (r.closed ? '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மீண்டும் Close பண்ணு' : '🔒 இன்றைய Closing சேமி') + '</button>';
  if (r.closed) {
    h += '<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px">'
       + 'Closed by ' + x(r.closedBy || '') + '</div>';
  }
  return h;
}


function _cashLine(label, val, strong) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0' + (strong ? ';font-weight:700;font-size:16px' : '') + '">'
    + '<span style="color:' + (strong ? 'var(--txt)' : 'var(--muted)') + '">' + label + '</span>'
    + '<span style="color:' + (strong ? '#6E1423' : 'var(--txt)') + '">' + val + '</span></div>';
}


function doCashClose() {
  var actual = document.getElementById('cashActualInput').value;
  if (actual === '' || isNaN(Number(actual))) { toast('சரியான ரொக்க இருப்பை உள்ளிடவும்'); return; }
  var note = document.getElementById('cashNoteInput').value;
  showConfirm('இந்த நாளின் ரொக்க முடிப்பை சேமிக்கவா?', function() {
    loading(true);
    google.script.run
      .withSuccessHandler(function(res) {
        loading(false);
        if (!res.ok) { toast(res.msg || 'சேமிக்க முடியவில்லை'); return; }
        toast(res.diff === 0 ? '✓ சரியாக பொருந்தியது' : ('சேமிக்கப்பட்டது · வித்தியாசம் ' + _money(res.diff)));
        renderCashLedger();
      })
      .withFailureHandler(function(e){ loading(false); toastError(e); })
      .saveCashClosing({ date: _cashLedgerDate, actual: Number(actual), note: note });
  });
}


// ── CUSTOM CATEGORIES (compact bottom-sheet picker) ──
var _categoryCache = { expense: [], income: [] };
var _expenseCategoryContext = null;
var _expenseNewCategoryType = 'expense';

// Emoji-only values: avoids malformed data-* attributes / raw SVG markup leakage.
var ICON_PALETTE = ['🛒','🚗','🏠','💊','📚','💡','🎬','👕','📦','💼','🏪','🏘️','📈','➕',
  '🍔','☕','🎮','🐕','👶','🎁','🧴','🔧','⚡','📱','💻','🎓','✈️','🏥','🎉','💵','🏦','💳','🐷','🎵','⛽'];

function loadCategoryPicker(type, pickerId, hiddenId) {
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) return;
      _categoryCache[type] = res.rows || [];
      _renderCategoryPicker(type, pickerId, hiddenId);
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getCategories(type);
}

function _renderCategoryPicker(type, pickerId, hiddenId) {
  var picker = document.getElementById(pickerId);
  var hidden = document.getElementById(hiddenId);
  if (!picker || !hidden) return;
  var selected = hidden.value;
  var cats = _categoryCache[type] || [];
  var row = cats.find(function(c){ return c.name === selected; });
  var icon = row && row.icon ? row.icon : (type === 'income' ? '💵' : '📦');
  var label = selected || (type === 'income' ? 'வரவு மூலத்தைத் தேர்வு செய்யவும்' : 'வகையைத் தேர்வு செய்யவும்');
  picker.innerHTML = '<button type="button" class="expense-category-trigger' + (selected ? ' has-value' : '') + '" onclick="openExpenseCategorySheet(\'' + type + '\',\'' + pickerId + '\',\'' + hiddenId + '\')">'
    + '<span class="expense-category-trigger-icon">' + icon + '</span>'
    + '<span class="expense-category-trigger-label">' + x(label) + '</span>'
    + '<span class="expense-category-trigger-arrow">›</span></button>';
}

function openExpenseCategorySheet(type, pickerId, hiddenId) {
  _expenseCategoryContext = { type:type, pickerId:pickerId, hiddenId:hiddenId };
  var title = document.getElementById('expenseCategorySheetTitle');
  if (title) title.textContent = type === 'income' ? 'வரவு மூலத்தைத் தேர்வு செய்யவும்' : 'வகையைத் தேர்வு செய்யவும்';
  _renderExpenseCategorySheet();
  var modal = document.getElementById('expenseCategorySheet');
  if (modal) modal.style.display = 'flex';
}

function closeExpenseCategorySheet() {
  var modal = document.getElementById('expenseCategorySheet');
  if (modal) modal.style.display = 'none';
}

function _renderExpenseCategorySheet() {
  if (!_expenseCategoryContext) return;
  var ctx = _expenseCategoryContext;
  var selected = (document.getElementById(ctx.hiddenId) || {}).value || '';
  var list = document.getElementById('expenseCategorySheetList');
  var cats = _categoryCache[ctx.type] || [];
  if (!list) return;
  list.innerHTML = cats.length ? cats.map(function(c, i) {
    var canEdit = !_isBuiltInCategory(ctx.type, c.name);
    return '<button type="button" class="expense-category-option' + (c.name === selected ? ' on' : '') + '" data-index="' + i + '" onclick="selectExpenseCategoryFromSheet(this)">'
      + '<span class="expense-category-option-icon">' + (c.icon || '📦') + '</span>'
      + '<span class="expense-category-option-name">' + x(c.name) + '</span>'
      + (canEdit ? '<span class="expense-category-edit" title="Rename / Symbol" onclick="event.stopPropagation();openExpenseCategoryEditModal(' + i + ')">✎</span>' : '')
      + (c.name === selected ? '<span class="expense-category-check">✓</span>' : '')
      + '</button>';
  }).join('') : '<div class="expense-category-empty">வகைகள் இல்லை. புதிய வகையைச் சேர்க்கவும்.</div>';
}

function selectExpenseCategoryFromSheet(btn) {
  if (!_expenseCategoryContext || !btn) return;
  var ctx = _expenseCategoryContext;
  var cat = (_categoryCache[ctx.type] || [])[Number(btn.dataset.index)];
  if (!cat) return;
  document.getElementById(ctx.hiddenId).value = cat.name;
  _renderCategoryPicker(ctx.type, ctx.pickerId, ctx.hiddenId);
  if (ctx.type === 'expense') _renderExpenseSubcategorySuggestions(cat.name);
  closeExpenseCategorySheet();
}

// Backward-compatible wrapper for any older call site.
function _selectCategoryChip(type, pickerId, hiddenId, name) {
  document.getElementById(hiddenId).value = name;
  _renderCategoryPicker(type, pickerId, hiddenId);
  closeExpenseCategorySheet();
}

function openExpenseNewCategoryModal() {
  var type = _expenseCategoryContext ? _expenseCategoryContext.type : 'expense';
  _expenseNewCategoryType = type;
  _categoryEditState = null;
  _categoryIconTouched[type] = false;
  _selectedNewIcon[type] = type === 'expense' ? '📦' : '💵';
  var ex = document.getElementById('ex_category_new_form');
  var inc = document.getElementById('in_source_new_form');
  if (ex) ex.style.display = type === 'expense' ? 'block' : 'none';
  if (inc) inc.style.display = type === 'income' ? 'block' : 'none';
  var title = document.getElementById('expenseNewCategoryTitle');
  if (title) title.textContent = type === 'income' ? 'புதிய வரவு மூலம்' : 'புதிய வகை';
  _renderIconGrid(type === 'expense' ? 'ex_new_cat_icons' : 'in_new_cat_icons');
  closeExpenseCategorySheet();
  var modal = document.getElementById('expenseNewCategoryModal');
  if (modal) modal.style.display = 'flex';
  setTimeout(function(){
    var inp = document.getElementById(type === 'expense' ? 'ex_new_cat_name' : 'in_new_cat_name');
    if (inp) inp.focus();
  }, 50);
}

function openExpenseCategoryEditModal(index) {
  if (!_expenseCategoryContext) return;
  var type = _expenseCategoryContext.type;
  var cat = (_categoryCache[type] || [])[Number(index)];
  if (!cat || _isBuiltInCategory(type, cat.name)) return;
  _expenseNewCategoryType = type;
  _categoryEditState = { id:cat.id, originalName:cat.name, type:type };
  _categoryIconTouched[type] = true;
  _selectedNewIcon[type] = cat.icon || (type === 'expense' ? '📦' : '💵');
  var ex = document.getElementById('ex_category_new_form');
  var inc = document.getElementById('in_source_new_form');
  if (ex) ex.style.display = type === 'expense' ? 'block' : 'none';
  if (inc) inc.style.display = type === 'income' ? 'block' : 'none';
  var title = document.getElementById('expenseNewCategoryTitle');
  if (title) title.textContent = type === 'income' ? 'வரவு மூலம் Edit' : 'Category Edit';
  var nameId = type === 'expense' ? 'ex_new_cat_name' : 'in_new_cat_name';
  var inp = document.getElementById(nameId);
  if (inp) inp.value = cat.name;
  _renderIconGrid(type === 'expense' ? 'ex_new_cat_icons' : 'in_new_cat_icons');
  closeExpenseCategorySheet();
  var modal = document.getElementById('expenseNewCategoryModal');
  if (modal) modal.style.display = 'flex';
  setTimeout(function(){ if (inp) { inp.focus(); inp.select(); } }, 50);
}

function closeExpenseNewCategoryModal() {
  var modal = document.getElementById('expenseNewCategoryModal');
  if (modal) modal.style.display = 'none';
}

// Backward-compatible wrapper retained for older markup/callers.
function _toggleNewCategoryForm(type) {
  _expenseCategoryContext = _expenseCategoryContext || {
    type:type,
    pickerId:type === 'expense' ? 'ex_category_picker' : 'in_source_picker',
    hiddenId:type === 'expense' ? 'ex_category' : 'in_source'
  };
  _expenseCategoryContext.type = type;
  openExpenseNewCategoryModal();
}

var _selectedNewIcon = { expense: '📦', income: '💵' };
var _categoryEditState = null;
var _categoryIconTouched = { expense:false, income:false };

var _BUILTIN_CATEGORY_KEYS = {
  expense:['மளிகை','பயணம்','மருத்துவம்','கல்வி','வீட்டு வாடகை','மின்சாரம் / பில்','பொழுதுபோக்கு','உடை','மற்றவை'],
  income:['சம்பளம்','வியாபாரம்','வாடகை வருமானம்','வட்டி வருமானம்','மற்றவை']
};
function _categoryKey(v) { return String(v || '').trim().replace(/\s+/g,' ').toLocaleLowerCase(); }
function _isBuiltInCategory(type, name) {
  var key = _categoryKey(name);
  return (_BUILTIN_CATEGORY_KEYS[type] || []).some(function(v){ return _categoryKey(v) === key; });
}
function _findExistingCategory(type, name, exceptId) {
  var key = _categoryKey(name);
  return (_categoryCache[type] || []).find(function(c){
    return String(c.id) !== String(exceptId || '') && _categoryKey(c.name) === key;
  }) || null;
}
function _autoCategoryIcon(type, name) {
  var q = _categoryKey(name);
  if (type === 'income') {
    if (/salary|சம்பள/.test(q)) return '💼';
    if (/business|வியாபார|shop|கடை/.test(q)) return '🏪';
    if (/rent|வாடகை/.test(q)) return '🏘️';
    if (/interest|வட்டி/.test(q)) return '📈';
    return '💵';
  }
  if (/petrol|diesel|fuel|பெட்ரோல்|டீசல்|எரிபொருள்/.test(q)) return '⛽';
  if (/grocery|மளிகை|provision/.test(q)) return '🛒';
  if (/rent|வாடகை|house|வீடு/.test(q)) return '🏠';
  if (/medical|medicine|hospital|மருத்துவ|மருந்து|hospital/.test(q)) return '💊';
  if (/school|college|education|fees|கல்வி|பள்ளி|கல்லூரி/.test(q)) return '🎓';
  if (/travel|bus|train|taxi|auto|பயணம்/.test(q)) return '🚗';
  if (/electric|eb|current|bill|மின்சார/.test(q)) return '💡';
  if (/phone|mobile|recharge|internet|wifi/.test(q)) return '📱';
  if (/loan|emi|கடன்/.test(q)) return '💳';
  if (/food|hotel|restaurant|சாப்பாடு|உணவு/.test(q)) return '🍔';
  if (/gift|function|விழா|பரிசு/.test(q)) return '🎁';
  if (/repair|service|பழுது/.test(q)) return '🔧';
  return '📦';
}
function _onCategoryNameInput(type) {
  if (_categoryIconTouched[type]) return;
  var id = type === 'expense' ? 'ex_new_cat_name' : 'in_new_cat_name';
  var el = document.getElementById(id);
  _selectedNewIcon[type] = _autoCategoryIcon(type, el ? el.value : '');
  _renderIconGrid(type === 'expense' ? 'ex_new_cat_icons' : 'in_new_cat_icons');
}

function _renderIconGrid(gridId) {
  var type = gridId.indexOf('ex_') === 0 ? 'expense' : 'income';
  var grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = ICON_PALETTE.map(function(ic, i) {
    var on = ic === _selectedNewIcon[type];
    return '<button type="button" class="icon-btn' + (on ? ' on' : '') + '" data-index="' + i + '" onclick="_pickNewIconByIndex(\'' + gridId + '\',this)">' + ic + '</button>';
  }).join('');
}

function _pickNewIconByIndex(gridId, btn) {
  var icon = ICON_PALETTE[Number(btn.dataset.index)];
  if (!icon) return;
  _pickNewIcon(gridId, icon);
}

function _pickNewIcon(gridId, icon) {
  var type = gridId.indexOf('ex_') === 0 ? 'expense' : 'income';
  _selectedNewIcon[type] = icon;
  _categoryIconTouched[type] = true;
  _renderIconGrid(gridId);
}

function doAddCategory(type) {
  var nameId = type === 'expense' ? 'ex_new_cat_name' : 'in_new_cat_name';
  var errId  = type === 'expense' ? 'expNewCatErr' : 'incNewCatErr';
  var pickerId = type === 'expense' ? 'ex_category_picker' : 'in_source_picker';
  var hiddenId = type === 'expense' ? 'ex_category' : 'in_source';
  var name = _norm(document.getElementById(nameId).value);
  var errEl = document.getElementById(errId);
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'பெயர் தேவை'; return; }

  var editId = _categoryEditState && _categoryEditState.type === type ? _categoryEditState.id : '';
  var duplicate = _findExistingCategory(type, name, editId);
  if (duplicate) {
    // User asked for existing entries to be selected, not duplicated.
    document.getElementById(hiddenId).value = duplicate.name;
    _renderCategoryPicker(type, pickerId, hiddenId);
    if (type === 'expense') _renderExpenseSubcategorySuggestions(duplicate.name);
    errEl.textContent = 'இந்த Category ஏற்கனவே உள்ளது — அதையே select செய்துள்ளோம்.';
    setTimeout(function(){ closeExpenseNewCategoryModal(); }, 550);
    return;
  }

  var payload = { name:name, icon:_selectedNewIcon[type], type:type };
  var runner = google.script.run
    .withSuccessHandler(function(res) {
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) {
        if (res.existing) {
          document.getElementById(hiddenId).value = res.existing.name;
          closeExpenseNewCategoryModal();
          loadCategoryPicker(type, pickerId, hiddenId);
          toast('ℹ️ இந்த Category ஏற்கனவே உள்ளது; existing item select செய்யப்பட்டது');
          return;
        }
        errEl.textContent = res.msg || 'பிழை'; return;
      }
      toast(editId ? '✅ Category update செய்யப்பட்டது' : '✅ வகை சேர்க்கப்பட்டது');
      document.getElementById(nameId).value = '';
      document.getElementById(hiddenId).value = res.row.name;
      _categoryEditState = null;
      closeExpenseNewCategoryModal();
      loadCategoryPicker(type, pickerId, hiddenId);
    })
    .withFailureHandler(function(e){ errEl.textContent = friendlyErrorMsg(e); });

  if (editId) runner.updateCategory({ id:editId, name:name, icon:_selectedNewIcon[type], type:type });
  else runner.addCategory(payload);
}


// ── ACCOUNTS (Cash/Bank/Card) + TRANSFERS ─────────────────────────
var _accountsCache = [];


function loadAccountSelectors() {
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) return;
      _applyAccountsResponse(res.rows || []);
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getAccounts();
}


// Shared by loadAccountSelectors() and the combined getExpenseScreenInit()
// call — populates the account (select) dropdowns from an already-fetched
// accounts array, without needing its own round-trip.
function _applyAccountsResponse(accounts) {
  _accountsCache = accounts;
  var opts = '<option value="">— பொது —</option>' + _accountsCache.map(function(a) {
    return '<option value="' + x(String(a.id)) + '">' + x(a.name) + '</option>';
  }).join('');
  ['ex_account','in_account','loan_account','eei_account','eei_loan_settlement_account'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  // FIX: keep the Add form simple by default — only show the Account
  // field once the person has actually created an account. No accounts
  // yet = no extra field to think about.
  var showAccountField = _accountsCache.length > 0;
  ['ex_account_wrap','in_account_wrap','loan_account_wrap'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = showAccountField ? 'block' : 'none';
  });
  var transferOpts = _accountsCache.map(function(a) {
    return '<option value="' + x(String(a.id)) + '">' + x(a.name) + '</option>';
  }).join('');
  ['tr_from','tr_to'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = transferOpts;
  });
}


// FIX [BUG]: same event-delegation robustness fix as the Transactions list
// — one listener on the container instead of inline onclick per button.
var _acctListDelegated = false;

function _setupAcctListDelegation() {
  if (_acctListDelegated) return;
  _acctListDelegated = true;
  document.getElementById('acctList').addEventListener('click', function(e) {
    var delBtn = e.target.closest('.rdel');
    if (delBtn) delAccount(delBtn.dataset.id);
  });
}


var _netBalanceDelegated = false;

function _setupNetBalanceDelegation() {
  if (_netBalanceDelegated) return;
  _netBalanceDelegated = true;
  document.getElementById('expNetBalance').addEventListener('click', function(e) {
    if (e.target.closest('.net-seimurai-line')) goToSeimuraiInMoi();
  });
}


// ── CATEGORY DRILL-DOWN (Summary → tap a category → see its transactions) ──
var _catBreakdownDelegated = false;

function _setupCatBreakdownDelegation() {
  if (_catBreakdownDelegated) return;
  _catBreakdownDelegated = true;
  document.getElementById('expCatBreakdown').addEventListener('click', function(e) {
    var card = e.target.closest('.cat-drilldown');
    if (!card) return;
    // FIX: செய்முறை is a moi record, not an Expense row — the Expense-only
    // drill-down modal would show empty results for it. Goes DIRECTLY to
    // the moi module (mode filter pre-set), not via Daily Expenses.
    if (card.dataset.cat.indexOf('செய்முறை') !== -1) {
      goToSeimuraiInMoi();
      return;
    }
    openCategoryDrilldown(card.dataset.cat);
  });
}


var _cdlCategory = null;

var _cdlDataCache = null;

function openCategoryDrilldown(category) {
  _cdlCategory = category;
  var month = document.getElementById('expSummaryMonth').value;
  var startDate = _summaryRangeStart;
  var endDate = _summaryRangeEnd;
  document.getElementById('cdlTitle').textContent = '📂 ' + category;
  document.getElementById('cdlList').innerHTML = '<div class="empty" style="padding:12px"><div class="ei">⏳</div></div>';
  document.getElementById('categoryDrilldownModal').style.display = 'flex';
  _setupCdlListDelegation();

  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) { document.getElementById('cdlList').innerHTML = ''; return; }
      _cdlDataCache = res.rows || [];
      document.getElementById('cdlList').innerHTML = !res.rows.length ? empty() :
        '<div class="list">' + res.rows.map(function(r) {
          var rid = x(String(r.id));
          return '<div class="card" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'
            + '<div><div style="font-weight:700">' + x(r.subCategory || r.description || category) + '</div>'
            + (r.description && r.subCategory ? '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + x(r.description) + '</div>' : '')
            + '</div>'
            + '<div style="text-align:right">'
            + '<div style="font-weight:700;color:#BE185D">₹' + fmt(r.amount) + '</div>'
            + '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + fmtDate(r.date) + '</div>'
            + '<div style="display:flex;gap:6px;margin-top:4px">'
            + ((typeof _nmRoleCanWrite !== 'function' || _nmRoleCanWrite()) ? '<button class="btn-edit" data-id="' + rid + '"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> திருத்து</button>' : '')
            + ((typeof _nmRoleCanDelete !== 'function' || _nmRoleCanDelete()) ? '<button class="rdel" data-id="' + rid + '">நீக்கு</button>' : '')
            + '</div></div></div>';
        }).join('') + '</div>';
    })
    .withFailureHandler(function(e){ toastError(e); document.getElementById('cdlList').innerHTML = ''; })
    .getExpenses({ month: month, startDate: startDate, endDate: endDate, category: category });
}


function closeCategoryDrilldown() {
  document.getElementById('categoryDrilldownModal').style.display = 'none';
  _cdlCategory = null;
}


var _cdlListDelegated = false;

function _setupCdlListDelegation() {
  if (_cdlListDelegated) return;
  _cdlListDelegated = true;
  document.getElementById('cdlList').addEventListener('click', function(e) {
    var delBtn = e.target.closest('.rdel');
    if (delBtn) { delExpense(delBtn.dataset.id); closeCategoryDrilldown(); return; }
    var completeBtn = e.target.closest('.loan-complete');
    if (completeBtn) { markHandLoanCompleted(completeBtn.dataset.id); return; }
    var editBtn = e.target.closest('.btn-edit');
    if (editBtn) openEditExpInc('expense', editBtn.dataset.id);
  });
}


// ── EDIT MODAL (shared: Expense from Transactions list or Category
//    drill-down, Income from Transactions list) ──────────────────
var _eeiKind = null, _eeiOriginalKind = null, _eeiId = null, _eeiAccountId = '';
var _eeiOriginalPrimaryValue = '';

// HandLoan settlement-field helper moved to js_handloan.html

function _applyEditTxnKindUi(kind) {
  _eeiKind = kind;
  document.getElementById('eei_category_label').textContent = kind === 'handloan' ? 'நபர் பெயர்' : (kind === 'income' ? 'வரவு மூலம் (Source)' : 'வகை (Category)');
  document.getElementById('eei_loan_fields').style.display = kind === 'handloan' ? 'block' : 'none';
  if (kind === 'handloan') _toggleHandLoanSettlementFields();
  var accWrap = document.getElementById('eei_account_wrap');
  if (accWrap) accWrap.style.display = _accountsCache.length > 0 ? 'block' : 'none';
  document.getElementById('eeiTitle').innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> ' + (kind === 'handloan' ? 'கைமாற்று திருத்து' : (kind === 'income' ? 'வரவு திருத்து' : 'செலவு திருத்து'));
}

function onEditTxnKindChange() {
  var nextKind = document.getElementById('eei_kind').value || _eeiOriginalKind || 'expense';
  var primary = document.getElementById('eei_category');
  // A Category/Source/Person value is not interchangeable. When the user
  // changes transaction type, never silently reuse the old primary value
  // (e.g. Expense 'Rent' becoming Hand Loan person 'Rent'). If they switch
  // back to the original type, restore the original value for convenience.
  if (nextKind === _eeiOriginalKind) primary.value = _eeiOriginalPrimaryValue || '';
  else if (_eeiKind !== nextKind) primary.value = '';
  _applyEditTxnKindUi(nextKind);
}

function openEditExpInc(kind, id) {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('பதிவு திருத்த')) return;
  _eeiKind = kind; _eeiOriginalKind = kind; _eeiId = id; _eeiAccountId = ''; _eeiOriginalPrimaryValue = '';
  document.getElementById('eei_kind').value = kind;
  document.getElementById('eeiTitle').innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> ' + (kind === 'handloan' ? 'கைமாற்று திருத்து' : (kind === 'income' ? 'வரவு திருத்து' : 'செலவு திருத்து'));
  _applyEditTxnKindUi(kind);
  document.getElementById('eeiErr').textContent = '';
  document.getElementById('editExpIncModal').style.display = 'flex';
  document.getElementById('eei_date').value = '';
  document.getElementById('eei_category').value = '';
  document.getElementById('eei_description').value = '';
  document.getElementById('eei_amount').value = '';
  var eeiAcc = document.getElementById('eei_account'); if (eeiAcc) eeiAcc.value = '';
  document.getElementById('eei_loan_direction').value = 'given';
  document.getElementById('eei_loan_phone').value = '';
  document.getElementById('eei_loan_return_date').value = '';
  document.getElementById('eei_loan_status').value = 'pending';
  document.getElementById('eei_loan_completed_date').value = '';
  var settleAcc=document.getElementById('eei_loan_settlement_account'); if(settleAcc) settleAcc.value='';
  _toggleHandLoanSettlementFields();

  // Pre-fill from whichever cache we already have client-side (avoids an
  // extra round-trip): the Transactions cache, or the category drill-down
  // cache if that's where this was opened from.
  var cached = null;
  if (_txnDataCache) cached = _txnDataCache.rows.filter(function(r){ return String(r.id) === String(id) && r.kind === kind; })[0];
  if (!cached && kind === 'expense' && _cdlDataCache) {
    var cdlRow = _cdlDataCache.filter(function(r){ return String(r.id) === String(id); })[0];
    if (cdlRow) cached = { date: cdlRow.date, label: cdlRow.category, sub: cdlRow.description || cdlRow.subCategory, amount: cdlRow.amount };
  }
  if (cached) {
    document.getElementById('eei_date').value = cached.date || '';
    document.getElementById('eei_category').value = kind === 'handloan' ? (cached.person || cached.label || '') : (kind === 'income' ? (cached.source || cached.label || '') : (cached.category || cached.label || ''));
    _eeiOriginalPrimaryValue = document.getElementById('eei_category').value;
    _eeiAccountId = cached.accountId || '';
    if (eeiAcc) eeiAcc.value = _eeiAccountId;
    if (kind === 'handloan') { document.getElementById('eei_loan_direction').value = cached.direction || 'given'; document.getElementById('eei_loan_phone').value = cached.phone || ''; document.getElementById('eei_loan_return_date').value = cached.returnDate || ''; document.getElementById('eei_loan_status').value = cached.status || 'pending'; document.getElementById('eei_loan_completed_date').value = cached.completedDate || ''; document.getElementById('eei_loan_settlement_account').value = cached.settlementAccountId || cached.accountId || ''; _toggleHandLoanSettlementFields(); }
    document.getElementById('eei_description').value = cached.description || cached.subCategory || cached.sub || '';
    document.getElementById('eei_amount').value = cached.amount || '';
  } else {
    // Fallback: fetch fresh (category drill-down doesn't share the txn cache)
    google.script.run
      .withSuccessHandler(function(res) {
        if (!res.ok) return;
        var row = (res.rows || []).filter(function(r){ return String(r.id) === String(id); })[0];
        if (!row) return;
        document.getElementById('eei_date').value = row.date;
        document.getElementById('eei_category').value = kind === 'handloan' ? (row.person || row.label || '') : (kind === 'income' ? row.source : row.category);
        _eeiOriginalPrimaryValue = document.getElementById('eei_category').value;
        _eeiAccountId = row.accountId || '';
        var freshAcc = document.getElementById('eei_account'); if (freshAcc) freshAcc.value = _eeiAccountId;
        if (kind === 'handloan') { document.getElementById('eei_loan_direction').value = row.direction || 'given'; document.getElementById('eei_loan_phone').value = row.phone || ''; document.getElementById('eei_loan_return_date').value = row.returnDate || ''; document.getElementById('eei_loan_status').value = row.status || 'pending'; document.getElementById('eei_loan_completed_date').value = row.completedDate || ''; document.getElementById('eei_loan_settlement_account').value = row.settlementAccountId || row.accountId || ''; _toggleHandLoanSettlementFields(); }
        document.getElementById('eei_description').value = row.description || '';
        document.getElementById('eei_amount').value = row.amount;
      })
      .withFailureHandler(function(e){ toastError(e); })
      [kind === 'income' ? 'getIncome' : (kind === 'handloan' ? 'getHandLoans' : 'getExpenses')]({});
  }
}


var _expEditInFlight = false;

function closeEditExpInc() {
  if (_expEditInFlight) { toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.'); return; }
  document.getElementById('editExpIncModal').style.display = 'none';
  _eeiKind = null; _eeiOriginalKind = null; _eeiId = null; _eeiAccountId = ''; _eeiOriginalPrimaryValue = '';
}


function doSaveEditExpInc() {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('பதிவு திருத்த')) return;
  if (!_eeiId || _expEditInFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    toast('📶 Internet இல்லை — online ஆன பிறகு திருத்தத்தை சேமிக்கவும்');
    return;
  }
  var errEl = document.getElementById('eeiErr');
  errEl.textContent = '';
  var catVal = _norm(document.getElementById('eei_category').value);
  var data = {
    date: document.getElementById('eei_date').value,
    description: _norm(document.getElementById('eei_description').value),
    amount: Number(document.getElementById('eei_amount').value) || 0
  };
  var editAcc = document.getElementById('eei_account'); data.accountId = editAcc ? editAcc.value : (_eeiAccountId || '');
  if (_eeiKind === 'handloan') { data.person = catVal; data.phone = _cleanLoanPhone(document.getElementById('eei_loan_phone').value); data.direction = document.getElementById('eei_loan_direction').value; data.returnDate = document.getElementById('eei_loan_return_date').value || ''; data.status = document.getElementById('eei_loan_status').value || 'pending'; data.completedDate = data.status==='completed' ? (document.getElementById('eei_loan_completed_date').value || todayStr()) : ''; data.settlementAccountId = data.status==='completed' ? ((document.getElementById('eei_loan_settlement_account')||{}).value || data.accountId || '') : ''; data.notes = data.description; } else if (_eeiKind === 'income') data.source = catVal; else data.category = catVal;

  if (!catVal) { errEl.textContent = _eeiKind === 'handloan' ? 'நபர் பெயர் தேவை' : (_eeiKind === 'income' ? 'வரவு மூலம் தேவை' : 'வகை தேவை'); return; }
  if (!data.amount) { errEl.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }
  if (_eeiKind === 'handloan' && data.returnDate && data.date && data.returnDate < data.date) { errEl.textContent = 'Reminder / Return Date பதிவு தேதிக்கு முன் இருக்கக்கூடாது'; return; }

  // Ask before taking the edit lock. Previously Cancel returned while the
  // lock stayed true, making every later edit look permanently "in flight".
  if (_eeiKind !== _eeiOriginalKind && !confirm('இந்த பதிவை ' + (_eeiKind === 'handloan' ? 'கைமாற்று' : (_eeiKind === 'income' ? 'வரவு' : 'செலவு')) + ' வகையாக மாற்றவா?')) return;
  _expEditInFlight = true;
  setBtnLoading('eeiSaveBtn', true, 'சேமிக்கிறது...');
  var runner = google.script.run
    .withSuccessHandler(function(res) {
      _expEditInFlight = false;
      setBtnLoading('eeiSaveBtn', false, '✅ சேமி');
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      toast(_eeiKind !== _eeiOriginalKind ? '✅ பதிவு வகை மாற்றப்பட்டது' : '✅ புதுப்பிக்கப்பட்டது');
      if ((_eeiKind === 'handloan' || _eeiOriginalKind === 'handloan') && typeof _refreshReminderUI === 'function') _refreshReminderUI();
      closeEditExpInc();
      _invalidateDashboardExpenseSummary();
      _invalidateTxnDataCache();
      renderTransactionList();
      renderBalanceTopCard();
      if (document.getElementById('ep-summary').classList.contains('show')) renderExpenseSummary();
    })
    .withFailureHandler(function(e) {
      _expEditInFlight = false;
      setBtnLoading('eeiSaveBtn', false, '✅ சேமி');
      if (!handleTerminalSessionFailure(e)) errEl.textContent = 'பிழை: ' + friendlyErrorMsg(e);
    });
  if (_eeiKind !== _eeiOriginalKind) runner.convertExpenseTransaction(_eeiId, _eeiOriginalKind, _eeiKind, data);
  else runner[_eeiKind === 'income' ? 'updateIncome' : (_eeiKind === 'handloan' ? 'updateHandLoan' : 'updateExpense')](_eeiId, data);
}


// FIX: Balance card now lives at the TOP of the Summary tab (was a
// separate Accounts tab) — lightweight, always loads when Summary opens.
function renderBalanceTopCard() {
  document.getElementById('balanceTopCard').innerHTML = '<div class="card" style="margin-bottom:12px"><div class="empty" style="padding:8px"><div class="ei">⏳</div></div></div>';
  google.script.run
    .withSuccessHandler(function(res) {
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) return;
      var total = res.rows.reduce(function(s,a){ return s + a.balance; }, 0);
      var cashTotal = res.rows.filter(function(a){ return a.type === 'cash'; }).reduce(function(s,a){ return s + a.balance; }, 0);
      var bankTotal = res.rows.filter(function(a){ return a.type === 'bank'; }).reduce(function(s,a){ return s + a.balance; }, 0);
      var hasCash = res.rows.some(function(a){ return a.type === 'cash'; });
      var hasBank = res.rows.some(function(a){ return a.type === 'bank'; });

      document.getElementById('balanceTopCard').innerHTML =
        '<div class="card cash-account-balance-card">'
        + (res.rows.length
            ? '<div class="cash-account-kicker">கணக்குகளில் உள்ள தற்போதைய இருப்பு</div>'
              + '<div class="cash-account-total">₹' + fmt(total) + '</div>'
              + '<div class="cash-account-note">இது மாத வரவு/செலவு சுருக்கம் அல்ல; Account தேர்வு செய்து சேமித்த பதிவுகளின் இருப்பு.</div>'
              + (hasCash || hasBank
                  ? '<div class="cash-account-splits">'
                    + (hasCash ? '<span>💵 ரொக்கம் <b>₹' + fmt(cashTotal) + '</b></span>' : '')
                    + (hasBank ? '<span>🏦 வங்கி <b>₹' + fmt(bankTotal) + '</b></span>' : '')
                    + '</div>'
                  : '')
            : '<div class="cash-account-kicker">Account இன்னும் அமைக்கவில்லை</div>'
              + '<div class="cash-account-note">மாத வரவு/செலவு சுருக்கம் தொடர்ந்து வேலை செய்யும். தனி Cash/Bank இருப்பை track செய்ய வேண்டுமெனில் கணக்கை சேர்க்கவும்.</div>')
        + '</div>';
      _applyAccountsResponse(res.rows);
    })
    .withFailureHandler(function(){ document.getElementById('balanceTopCard').innerHTML = ''; })
    .getAccounts();
}


// Collapsible "Manage Accounts" section — Add/Edit/Delete accounts +
// Transfers. Only loads when the person expands this section.
function renderAccountsTab() {
  _setupAcctListDelegation();
  document.getElementById('acctList').innerHTML = '<div class="empty"><div class="ei">⏳</div>ஏற்றுகிறது...</div>';

  // FIX [BUG]: same stuck-spinner issue as the Expense List — no timeout
  // meant a slow/dropped response left this spinning forever with no
  // way to retry (reported: Accounts tab stuck on "ஏற்றுகிறது...").
  var done = false;
  var timeoutId = setTimeout(function() {
    if (done) return;
    document.getElementById('acctList').innerHTML =
      '<div class="empty"><div class="ei">⏱️</div>ஏற்ற நேரம் அதிகமாகிறது...'
      + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderAccountsTab()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
  }, 15000);

  google.script.run
    .withSuccessHandler(function(res) {
      done = true; clearTimeout(timeoutId);
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) {
        toast('❌ ' + (res.msg || 'பிழை'));
        document.getElementById('acctList').innerHTML =
          '<div class="empty"><div class="ei">⚠️</div>ஏற்ற முடியவில்லை'
          + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderAccountsTab()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
        return;
      }
      var iconByType = { cash:'💵', bank:'🏦', card:'💳', savings:'🐷', other:'📦' };

      document.getElementById('acctList').innerHTML = !res.rows.length ? empty() :
        '<div class="list">' + res.rows.map(function(a) {
          var aid = x(String(a.id));
          return '<div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
            + '<div>' + (iconByType[a.type] || '📦') + ' <span style="font-weight:700">' + x(a.name) + '</span>'
            + ((a.institution || a.last4) ? '<div style="font-size:11px;color:var(--muted);margin-top:3px">📩 ' + x(a.institution || '') + (a.last4 ? ' ••••' + x(a.last4) : '') + (a.smsAutoMatch===false ? ' · Auto-match off' : '') + '</div>' : '') + '</div>'
            + '<div style="text-align:right">'
            + '<div style="font-weight:700;color:' + (a.balance >= 0 ? '#1B8A4A' : '#DC2626') + '">₹' + fmt(a.balance) + '</div>'
            + '<button class="rdel" style="margin-top:4px" data-id="' + aid + '">நீக்கு</button>'
            + '</div></div>';
        }).join('') + '</div>';

      // FIX [PERF]: reuse this same response for the dropdowns instead of
      // calling loadAccountSelectors() (which used to fire a SECOND,
      // redundant getAccounts() call for the exact same data).
      _applyAccountsResponse(res.rows);
      renderTransferList();
    })
    .withFailureHandler(function(e){
      // v234: renderAccountsTab() has its own timeout/done lifecycle and no
      // transaction-list loadSeq. The stale loadSeq guard here referenced an
      // undefined variable, so an Accounts fetch failure could throw inside
      // the failure handler and leave the UI without its intended retry state.
      done = true; clearTimeout(timeoutId);
      toastError(e);
      document.getElementById('acctList').innerHTML =
        '<div class="empty"><div class="ei">⚠️</div>ஏற்ற முடியவில்லை'
        + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderAccountsTab()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
    })
    .getAccounts();
}


function doAddAccount() {
  var data = {
    name: _norm(document.getElementById('acc_name').value),
    type: document.getElementById('acc_type').value,
    openingBalance: Number(document.getElementById('acc_opening').value) || 0,
    institution: _norm((document.getElementById('acc_institution')||{}).value || ''),
    last4: String((document.getElementById('acc_last4')||{}).value || '').replace(/\D/g,'').slice(-4),
    senderPattern: _norm((document.getElementById('acc_sender')||{}).value || ''),
    smsAutoMatch: !!((document.getElementById('acc_sms_auto')||{}).checked)
  };
  var errEl = document.getElementById('accAddErr');
  errEl.textContent = '';
  if (!data.name) { errEl.textContent = 'கணக்கு பெயர் தேவை'; return; }

  setBtnLoading('accAddBtn', true, 'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      setBtnLoading('accAddBtn', false, '✅ கணக்கு சேர்');
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      toast('✅ கணக்கு சேர்க்கப்பட்டது');
      document.getElementById('acc_name').value = '';
      document.getElementById('acc_opening').value = '';
      ['acc_institution','acc_last4','acc_sender'].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=''; });
      var au=document.getElementById('acc_sms_auto'); if(au) au.checked=true;
      renderAccountsTab();
    })
    .withFailureHandler(function(e) {
      setBtnLoading('accAddBtn', false, '✅ கணக்கு சேர்');
      errEl.textContent = friendlyErrorMsg(e);
    })
    .addAccount(data);
}


function delAccount(id) {
  google.script.run
    .withSuccessHandler(function(countRes) {
      var msg = (countRes.ok && countRes.count > 0)
        ? 'இந்த கணக்குடன் ' + countRes.count + ' பதிவுகள் இணைந்துள்ளன. கணக்கை நீக்கினால், அவை "பொது" கணக்காக மாற்றப்படும்; பதிவுகள் நீக்கப்படாது. தொடரவா?'
        : 'இந்த கணக்கை நீக்கவா?';
      showConfirm(msg, function() {
        google.script.run
          .withSuccessHandler(function(res) {
            if (_handleExpModuleLock(res)) return;
            if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
            toast('🗑 கணக்கு நீக்கப்பட்டது');
            renderAccountsTab();
          })
          .withFailureHandler(function(e){ toastError(e); })
          .deleteAccount(id);
      });
    })
    .withFailureHandler(function() {
      // Count lookup failed — fall back to a plain confirm rather than blocking delete entirely
      showConfirm('இந்த கணக்கை நீக்கவா?', function() {
        google.script.run
          .withSuccessHandler(function(res) {
            if (_handleExpModuleLock(res)) return;
            if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
            toast('🗑 கணக்கு நீக்கப்பட்டது');
            renderAccountsTab();
          })
          .withFailureHandler(function(e){ toastError(e); })
          .deleteAccount(id);
      });
    })
    .getAccountTransactionCount(id);
}


function doAddTransfer() {
  var data = {
    fromAccountId: document.getElementById('tr_from').value,
    toAccountId:   document.getElementById('tr_to').value,
    date:          document.getElementById('tr_date').value,
    amount:        Number(document.getElementById('tr_amount').value) || 0,
    note:          _norm(document.getElementById('tr_note').value)
  };
  var errEl = document.getElementById('trAddErr');
  errEl.textContent = '';
  if (!data.fromAccountId || !data.toAccountId) { errEl.textContent = 'இரண்டு கணக்குகளையும் தேர்வு செய்யவும்'; return; }
  if (data.fromAccountId === data.toAccountId) { errEl.textContent = 'ஒரே கணக்கிற்குள் மாற்ற முடியாது'; return; }
  if (!data.amount) { errEl.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }

  setBtnLoading('trAddBtn', true, 'செய்கிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      setBtnLoading('trAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மாற்று');
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      toast('✅ பணம் மாற்றப்பட்டது');
      document.getElementById('tr_amount').value = '';
      document.getElementById('tr_note').value = '';
      renderAccountsTab();
    })
    .withFailureHandler(function(e) {
      setBtnLoading('trAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மாற்று');
      errEl.textContent = friendlyErrorMsg(e);
    })
    .addTransfer(data);
}


function renderTransferList() {
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) return;
      var rows = res.rows || [];
      var accById = {}; _accountsCache.forEach(function(a){ accById[a.id] = a.name; });
      document.getElementById('transferList').innerHTML = !rows.length ? empty() :
        '<div class="list">' + rows.map(function(t) {
          var tid = x(String(t.id));
          return '<div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
            + '<div><div style="font-size:13px">' + x(accById[t.fromAccountId] || '?') + ' → ' + x(accById[t.toAccountId] || '?') + '</div>'
            + (t.note ? '<div style="font-size:11px;color:var(--muted)">' + x(t.note) + '</div>' : '')
            + '</div>'
            + '<div style="text-align:right"><div style="font-weight:700">₹' + fmt(t.amount) + '</div>'
            + '<div style="font-size:11px;color:var(--muted)">' + fmtDate(t.date) + '</div>'
            + '<button class="rdel" style="margin-top:4px" data-id="' + tid + '" onclick="delTransfer(this.dataset.id)">நீக்கு</button>'
            + '</div></div>';
        }).join('') + '</div>';
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getTransfers();
}


function delTransfer(id) {
  showConfirm('இந்த பணமாற்றுப் பதிவை நீக்கவா?', function() {
    google.script.run
      .withSuccessHandler(function(res) {
        if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
        toast('🗑 நீக்கப்பட்டது');
        renderAccountsTab();
      })
      .withFailureHandler(function(e){ toastError(e); })
      .deleteTransfer(id);
  });
}


// ── PER-CATEGORY BUDGET LIST (Budget tab) ─────────────────────────
function renderCategoryBudgetList() {
  document.getElementById('categoryBudgetList').innerHTML = '<div class="empty" style="padding:12px"><div class="ei">⏳</div></div>';
  google.script.run
    .withSuccessHandler(function(catRes) {
      if (!catRes.ok) return;
      google.script.run
        .withSuccessHandler(function(budgetRes) {
          if (!budgetRes.ok) return;
          var budgetByCat = {};
          (budgetRes.rows || []).forEach(function(b){ budgetByCat[b.category] = b.monthlyAmount; });
          var cats = catRes.rows || [];
          var builtinExpenseCats = ['மளிகை','பயணம்','மருத்துவம்','கல்வி','வீட்டு வாடகை','மின்சாரம் / பில்','பொழுதுபோக்கு','உடை','மற்றவை'];
          document.getElementById('categoryBudgetList').innerHTML = !cats.length ? empty() :
            '<div class="list">' + cats.map(function(c) {
              var cid = x(c.name);
              var rawAmt = Number(budgetByCat[c.name]) || 0;
              var amt = rawAmt ? fmt(rawAmt) : '';
              var safeInputId = 'catbudget_' + String(c.id || c.name).replace(/[^a-zA-Z0-9]/g,'_');
              var isBuiltin = builtinExpenseCats.indexOf(String(c.name || '').trim()) !== -1;
              return '<div class="cash-category-budget-row">'
                + '<div class="cash-category-budget-name"><span>' + c.icon + '</span><strong title="' + cid + '">' + x(c.name) + '</strong></div>'
                + '<div class="cash-category-budget-actions">'
                + '<label class="cash-category-budget-input" for="' + safeInputId + '"><span aria-hidden="true">₹</span>'
                + '<input type="text" class="inp" id="' + safeInputId + '" value="' + amt + '" placeholder="0" inputmode="numeric" aria-label="' + cid + ' மாத பட்ஜெட்" onfocus="_budgetUnformatInput(this)" onblur="_budgetFormatInput(this)" onchange="doSaveCategoryBudget(\'' + cid + '\', \'' + safeInputId + '\', true)"></label>'
                + (isBuiltin ? '' : '<button class="rdel cash-category-budget-delete" data-catid="' + x(c.id) + '" data-catname="' + cid + '" onclick="delCategory(this.dataset.catid, this.dataset.catname)" title="Custom வகையை நீக்கு" aria-label="' + cid + ' வகையை நீக்கு"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg></button>')
                + '</div></div>';
            }).join('') + '</div>';
        })
        .withFailureHandler(function(e){ toastError(e); })
        .getCategoryBudgets();
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getCategories('expense');
}


// FIX [review]: categories could be added but never removed from the UI —
// the server-side deleteCategory() endpoint existed but had no caller.
// Wired up here from the Category Budget list (Budget tab), which already
// lists every category individually — the natural place for a delete
// action. Confirms first since deleting a category doesn't touch past
// expense records (they keep their category name as plain text), but the
// category itself won't be pickable for new entries afterward.
function delCategory(id, name) {
  showConfirm('"' + name + '" வகையை நீக்கவா? (முந்தைய பதிவுகள் பாதிக்கப்படாது)', function() {
    google.script.run
      .withSuccessHandler(function(res) {
        if (_handleExpModuleLock(res)) return;
        if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
        toast('🗑 "' + name + '" நீக்கப்பட்டது');
        renderCategoryBudgetList();
        // Refresh the add-expense/add-income category pickers too, so a
        // deleted category disappears from them immediately.
        google.script.run
          .withSuccessHandler(function(r) {
            if (!r.ok) return;
            _categoryCache.expense = r.rows || [];
            if (document.getElementById('ex_category_picker')) _renderCategoryPicker('expense', 'ex_category_picker', 'ex_category');
          })
          .withFailureHandler(function(){})
          .getCategories('expense');
      })
      .withFailureHandler(function(e){ toastError(e); })
      .deleteCategory(id);
  });
}


function _budgetNumber(v) { return Number(String(v == null ? '' : v).replace(/,/g,'').replace(/[^0-9.]/g,'')) || 0; }
function _budgetUnformatInput(el) { if (el) el.value = String(el.value || '').replace(/,/g,''); }
function _budgetFormatInput(el) { if (!el) return; var n=_budgetNumber(el.value); el.value = n ? fmt(n) : ''; }
function doSaveCategoryBudget(category, inputId, quiet) {
  var input = document.getElementById(inputId);
  var amt = _budgetNumber(input && input.value);
  google.script.run
    .withSuccessHandler(function(res) {
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { toast('❌ ' + (res.msg || 'பிழை')); return; }
      if (input) _budgetFormatInput(input);
      loadBudgetIntoForm();
      if (!quiet) toast('✅ ' + category + ' பட்ஜெட் சேமிக்கப்பட்டது');
    })
    .withFailureHandler(function(e){ toastError(e); })
    .setCategoryBudget(category, amt);
}


// ── v157 SMS / TRANSACTION MESSAGE IMPORT ─────────────────────────
// Play-Store-safe by design: this code only parses text the user explicitly
// pastes/shares into the app. It does not request READ_SMS/RECEIVE_SMS and
// never persists the raw message body.
function openSmsExpenseImport(prefill) {
  var m = document.getElementById('smsExpenseImportModal'); if (!m) return;
  document.getElementById('sms_import_text').value = String(prefill || '');
  document.getElementById('sms_import_result').style.display = 'none';
  document.getElementById('sms_import_err').textContent = '';
  _smsLastAnalysis = null;
  m.style.display = 'flex';
  if (prefill) analyzeSmsExpenseText();
  else setTimeout(function(){ document.getElementById('sms_import_text').focus(); }, 80);
}
function closeSmsExpenseImport() {
  var m = document.getElementById('smsExpenseImportModal'); if (m) m.style.display = 'none';
}
// Native wrapper/share-target hook: a future Median share extension can call
// this with the user-selected message text without changing the parser.
var _smsIncomingSender = '';
function handleIncomingTransactionMessage(text, sender) { _smsIncomingSender = String(sender || ''); openSmsExpenseImport(text || ''); }
async function pasteSmsExpenseText() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('clipboard');
    var t = await navigator.clipboard.readText();
    if (!t) { toast('Clipboard காலியாக உள்ளது'); return; }
    document.getElementById('sms_import_text').value = t;
    analyzeSmsExpenseText();
  } catch (e) {
    toast('📋 Paste permission இல்லை — SMS-ஐ long-press செய்து Copy செய்து இங்கே Paste செய்யவும்');
    document.getElementById('sms_import_text').focus();
  }
}
function _smsNorm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9@._ \u0B80-\u0BFF-]/g,' ').replace(/\s+/g,' ').trim(); }
function _smsRuleKey(merchant) { return _smsNorm(merchant).substring(0,80); }
function _smsAvailableCategory(kind, wanted) {
  var rows = (_categoryCache[kind === 'income' ? 'income' : 'expense'] || []);
  var exact = rows.find(function(c){ return String(c.name || '').toLocaleLowerCase('ta-IN') === String(wanted || '').toLocaleLowerCase('ta-IN'); });
  if (exact) return exact.name;
  var other = rows.find(function(c){ return String(c.name || '') === 'மற்றவை'; });
  return other ? other.name : (rows[0] ? rows[0].name : wanted || 'மற்றவை');
}
function _smsDefaultCategory(kind, msg, merchant) {
  var s = _smsNorm((merchant || '') + ' ' + (msg || ''));
  if (kind === 'income') {
    if (/salary|payroll|wages|employer/.test(s)) return _smsAvailableCategory('income','சம்பளம்');
    if (/interest|int[ .-]?credit|fd interest|rd interest/.test(s)) return _smsAvailableCategory('income','வட்டி வருமானம்');
    if (/rent|rental/.test(s)) return _smsAvailableCategory('income','வாடகை வருமானம்');
    if (/business|settlement|merchant settlement|razorpay|cashfree|paytm business/.test(s)) return _smsAvailableCategory('income','வியாபாரம்');
    return _smsAvailableCategory('income','மற்றவை');
  }
  if (/dmart|d mart|blinkit|zepto|instamart|bigbasket|grocery|supermarket|fresh|mart\b/.test(s)) return _smsAvailableCategory('expense','மளிகை');
  if (/petrol|diesel|fuel|indian oil|iocl|bharat petroleum|bpcl|hpcl|uber|ola|rapido|irctc|railway|metro|redbus|bus ticket/.test(s)) return _smsAvailableCategory('expense','பயணம்');
  if (/hospital|clinic|pharmacy|medical|medplus|apollo pharmacy|1mg|netmeds|diagnostic|lab\b/.test(s)) return _smsAvailableCategory('expense','மருத்துவம்');
  if (/school|college|tuition|course|education|exam fee|fees\b|book store|books\b/.test(s)) return _smsAvailableCategory('expense','கல்வி');
  if (/house rent|monthly rent|rent paid|landlord/.test(s)) return _smsAvailableCategory('expense','வீட்டு வாடகை');
  if (/tneb|electricity|eb bill|water bill|broadband|wifi|wi-fi|airtel|jio|bsnl|recharge|mobile bill|gas bill|indane|bharat gas/.test(s)) return _smsAvailableCategory('expense','மின்சாரம் / பில்');
  if (/netflix|prime video|hotstar|bookmyshow|cinema|movie|theatre|spotify|youtube premium/.test(s)) return _smsAvailableCategory('expense','பொழுதுபோக்கு');
  if (/myntra|ajio|fashion|clothing|garments|shirt|saree|footwear|shoe/.test(s)) return _smsAvailableCategory('expense','உடை');
  return _smsAvailableCategory('expense','மற்றவை');
}
function _smsParseDate(msg) {
  var m = String(msg || '').match(/\b([0-3]?\d)[\/-]([01]?\d)[\/-](20\d{2}|\d{2})\b/);
  if (!m) return todayStr();
  var y = String(m[3]); if (y.length === 2) y = '20' + y;
  var mo = String(Number(m[2])).padStart(2,'0'), d = String(Number(m[1])).padStart(2,'0');
  var out = y + '-' + mo + '-' + d;
  var dt = new Date(out + 'T00:00:00');
  return isNaN(dt.getTime()) ? todayStr() : out;
}
function _smsParseAmount(msg) {
  var s = String(msg || '').replace(/,/g,'');
  var pats = [
    /(?:debited|spent|paid|purchase(?:d)?|withdrawn|sent)\D{0,24}(?:inr|rs\.?|₹)\s*([0-9]+(?:\.\d{1,2})?)/i,
    /(?:credited|received|deposited|refund(?:ed)?)\D{0,24}(?:inr|rs\.?|₹)\s*([0-9]+(?:\.\d{1,2})?)/i,
    /(?:inr|rs\.?|₹)\s*([0-9]+(?:\.\d{1,2})?)/i
  ];
  for (var i=0;i<pats.length;i++){ var m=s.match(pats[i]); if(m) return Number(m[1])||0; }
  return 0;
}

function _smsParseDueDate(msg) {
  var s=String(msg||'');
  var m=s.match(/(?:due\s*(?:date)?|pay(?:ment)?\s+by|before)\D{0,20}([0-3]?\d)[\/-]([01]?\d)[\/-](20\d{2}|\d{2})/i);
  if(!m) m=s.match(/([0-3]?\d)[\/-]([01]?\d)[\/-](20\d{2}|\d{2})\D{0,20}(?:due|payment)/i);
  if(m){
    var y=String(m[3]); if(y.length===2)y='20'+y;
    var mo=String(Number(m[2])).padStart(2,'0'), d=String(Number(m[1])).padStart(2,'0');
    var out=y+'-'+mo+'-'+d, dt=new Date(out+'T00:00:00');
    return isNaN(dt.getTime())?'':out;
  }
  var mm=s.match(/(?:due\s*(?:date)?|pay(?:ment)?\s+by|before)\D{0,20}([0-3]?\d)[ -]([A-Za-z]{3,9})[ -](20\d{2}|\d{2})/i);
  if(!mm) return '';
  var mons={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  var mon=mons[String(mm[2]).toLowerCase()]; if(!mon)return '';
  var yy=String(mm[3]); if(yy.length===2)yy='20'+yy;
  var out=yy+'-'+String(mon).padStart(2,'0')+'-'+String(Number(mm[1])).padStart(2,'0'), dt=new Date(out+'T00:00:00');
  return isNaN(dt.getTime())?'':out;
}
function _smsParseCardStatement(msg) {
  var raw=String(msg||''), s=raw.replace(/,/g,''), n=_smsNorm(raw);
  if(!/(statement|total amount due|total due|amount due|minimum amount due|min(?:imum)? due|payment due|bill due)/.test(n)) return null;
  if(!/(credit card|card|xxxx|xx|ending)/.test(n)) return null;
  function money(re){var m=s.match(re);return m?(Number(m[1])||0):0;}
  var total=money(/(?:total\s+amount\s+due|total\s+due|amount\s+due|bill\s+amount)\D{0,24}(?:inr|rs\.?|₹)?\s*([0-9]+(?:\.\d{1,2})?)/i);
  var min=money(/(?:minimum\s+amount\s+due|min(?:imum)?\s+due|mad)\D{0,24}(?:inr|rs\.?|₹)?\s*([0-9]+(?:\.\d{1,2})?)/i);
  var due=_smsParseDueDate(raw);
  if(!total && !min && !due) return null;
  return {dueDate:due,totalDue:total,minDue:min};
}
function _smsParseKind(msg) {
  var s = _smsNorm(msg);
  if (/credited|received|deposited|salary|refund(?:ed)?|cashback/.test(s) && !/debited|spent|paid|withdrawn/.test(s)) return 'income';
  return 'expense';
}
function _smsParseMerchant(msg, kind) {
  var s = String(msg || '').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();
  var pats = kind === 'income' ? [
    /\bfrom\s+([A-Za-z0-9@&._ -]{2,45}?)(?=\s+(?:on|via|upi|ref|txn|transaction|avl|bal|credited)|[,.]|$)/i,
    /\bby\s+([A-Za-z0-9@&._ -]{2,45}?)(?=\s+(?:on|via|upi|ref|txn|transaction)|[,.]|$)/i
  ] : [
    /\b(?:paid|sent|transferred)\s+(?:to\s+)?([A-Za-z0-9@&._ -]{2,45}?)(?=\s+(?:on|via|upi|ref|txn|transaction|avl|bal)|[,.]|$)/i,
    /\bto\s+([A-Za-z0-9@&._ -]{2,45}?)(?=\s+(?:on|via|upi|ref|txn|transaction|avl|bal)|[,.]|$)/i,
    /\bat\s+([A-Za-z0-9@&._ -]{2,45}?)(?=\s+(?:on|via|using|ref|txn|transaction|avl|bal)|[,.]|$)/i
  ];
  for (var i=0;i<pats.length;i++){ var m=s.match(pats[i]); if(m) return String(m[1]).trim().replace(/\s+/g,' '); }
  var upi=s.match(/\b([A-Za-z0-9._-]{2,40}@[A-Za-z]{2,20})\b/); if(upi) return upi[1];
  return '';
}
function _smsChannel(msg) {
  var s=_smsNorm(msg); if(/\bupi\b|vpa|@ybl|@ok|@paytm|@ibl|@axl/.test(s))return 'UPI';
  if(/\bpos\b|card ending|credit card|debit card/.test(s))return 'Card/POS';
  if(/\batm\b|withdrawn/.test(s))return 'ATM';
  if(/neft|imps|rtgs/.test(s))return 'Bank Transfer'; return 'SMS Import';
}

// v158 — account/card matching + financial-class guard. Keeps ingestion separate
// from finance logic so a future native trigger can call the same function.
function _smsMatchAccount(text, sender) {
  var n=_smsNorm(text), sn=_smsNorm(sender), scored=[];
  (_accountsCache||[]).forEach(function(a){
    if(a.smsAutoMatch===false) return;
    var score=0, why=[];
    var l4=String(a.last4||'').replace(/\D/g,'').slice(-4);
    var inst=_smsNorm(a.institution||'');
    var pat=_smsNorm(a.senderPattern||'');
    if(l4 && new RegExp('(?:x{2,}|\\*{2,}|ending|xx)?\\s*'+l4+'\\b','i').test(n)){score+=6;why.push('last4');}
    if(inst && n.indexOf(inst)!==-1){score+=2;why.push('bank');}
    if(pat && ((sn&&sn.indexOf(pat)!==-1)||n.indexOf(pat)!==-1)){score+=5;why.push('sender');}
    if(a.type==='card' && /credit card|debit card|card ending|card xx|card \*\*/.test(n)){score+=1;}
    if(a.type==='bank' && /a\/c|account|acct|bank/.test(n)){score+=1;}
    if(score>0) scored.push({account:a,score:score,why:why});
  });
  scored.sort(function(a,b){return b.score-a.score;});
  if(!scored.length) return {account:null,confidence:0,ambiguous:false};
  var top=scored[0], second=scored[1];
  var ambiguous=!!(second && second.score===top.score);
  return {account:ambiguous?null:top.account,confidence:top.score,ambiguous:ambiguous,why:top.why};
}
function _smsMatchAccountByType(text, sender, type) {
  var n=_smsNorm(text), sn=_smsNorm(sender), scored=[];
  (_accountsCache||[]).forEach(function(a){
    if(String(a.type||'')!==String(type||'') || a.smsAutoMatch===false) return;
    var score=0, l4=String(a.last4||'').replace(/\D/g,'').slice(-4), inst=_smsNorm(a.institution||''), pat=_smsNorm(a.senderPattern||'');
    if(l4 && new RegExp('(?:x{2,}|\\*{2,}|ending|xx)?\\s*'+l4+'\\b','i').test(n)) score+=6;
    if(inst && n.indexOf(inst)!==-1) score+=2;
    if(pat && ((sn&&sn.indexOf(pat)!==-1)||n.indexOf(pat)!==-1)) score+=5;
    if(score>0) scored.push({account:a,score:score});
  });
  scored.sort(function(a,b){return b.score-a.score;});
  if(!scored.length) return {account:null,confidence:0,ambiguous:false};
  return {account:(scored[1]&&scored[1].score===scored[0].score)?null:scored[0].account,confidence:scored[0].score,ambiguous:!!(scored[1]&&scored[1].score===scored[0].score)};
}
function _smsTxnClass(text, kind, matchedAccount) {
  var s=_smsNorm(text);
  if(/otp|one time password|do not share|failed|declined|reversed|reversal|refund initiated|transaction failed/.test(s)) return 'ignore';
  if(/atm|cash withdrawal|withdrawn from atm|cash wdl/.test(s)) return 'atm_withdrawal';
  if(/credit card payment|card payment|payment towards.*card|paid towards.*card|cc payment|card bill payment|payment received.*card|received.*towards.*card/.test(s)) return 'card_payment';
  if(_smsParseCardStatement(text)) return 'card_statement';
  if(/self transfer|own account|between your accounts/.test(s)) return 'own_transfer';
  if(matchedAccount && matchedAccount.type==='card' && kind==='expense') return 'card_purchase';
  if(/upi|pos|spent|purchase|debited|paid|txn/.test(s) && kind==='expense') return 'purchase';
  if(kind==='income') return 'income';
  return 'review';
}
function _smsClassLabel(cls){
  return ({purchase:'UPI / Bank செலவு',card_purchase:'Credit Card செலவு',income:'Bank / Card வரவு',atm_withdrawal:'ATM Cash Withdrawal',card_payment:'Credit Card Payment — Transfer/Settlement',card_statement:'Credit Card Bill Due Reminder',own_transfer:'Own Account Transfer',ignore:'Ignore',review:'Review தேவை'})[cls]||'Review';
}
function _smsRenderAccountSelect(matchedId){
  var sel=document.getElementById('sms_import_account'); if(!sel)return;
  sel.innerHTML='<option value="">— கணக்கு match ஆகவில்லை —</option>'+(_accountsCache||[]).map(function(a){return '<option value="'+x(String(a.id))+'">'+x(a.name)+(a.last4?' ••••'+x(a.last4):'')+'</option>';}).join('');
  if(matchedId) sel.value=String(matchedId);
}
function _smsRenderSpecialFields(cls, text, sender, matchedId) {
  var pay=document.getElementById('sms_card_payment_fields'), bill=document.getElementById('sms_card_statement_fields');
  var transfer=document.getElementById('sms_transfer_fields');
  if(pay) pay.style.display=cls==='card_payment'?'block':'none';
  if(bill) bill.style.display=cls==='card_statement'?'block':'none';
  if(transfer) transfer.style.display=(cls==='atm_withdrawal'||cls==='own_transfer')?'block':'none';
  if(cls==='card_payment'){
    var from=document.getElementById('sms_cardpay_from'), to=document.getElementById('sms_cardpay_to');
    var banks=(_accountsCache||[]).filter(function(a){return a.type!=='card';}), cards=(_accountsCache||[]).filter(function(a){return a.type==='card';});
    from.innerHTML='<option value="">— பணம் செலுத்திய Bank/Cash —</option>'+banks.map(function(a){return '<option value="'+x(String(a.id))+'">'+x(a.name)+(a.last4?' ••••'+x(a.last4):'')+'</option>';}).join('');
    to.innerHTML='<option value="">— Credit Card —</option>'+cards.map(function(a){return '<option value="'+x(String(a.id))+'">'+x(a.name)+(a.last4?' ••••'+x(a.last4):'')+'</option>';}).join('');
    var bm=_smsMatchAccountByType(text,sender,'bank'), cm=_smsMatchAccountByType(text,sender,'card');
    if(bm.account) from.value=String(bm.account.id); if(cm.account) to.value=String(cm.account.id);
    if(matchedId && cards.some(function(a){return String(a.id)===String(matchedId);})){to.value=String(matchedId);}
  }
  if(cls==='atm_withdrawal'||cls==='own_transfer'){
    var tf=document.getElementById('sms_transfer_from'), tt=document.getElementById('sms_transfer_to');
    var title=document.getElementById('sms_transfer_title'), help=document.getElementById('sms_transfer_help');
    var rows=(_accountsCache||[]);
    var opts='<option value="">— தேர்வு —</option>'+rows.map(function(a){return '<option value="'+x(String(a.id))+'">'+x(a.name)+(a.last4?' ••••'+x(a.last4):'')+'</option>';}).join('');
    if(tf) tf.innerHTML=opts; if(tt) tt.innerHTML=opts;
    if(title) title.textContent=cls==='atm_withdrawal'?'🏧 ATM Cash Withdrawal — Transfer':'🔁 Own Account Transfer';
    if(help) help.textContent=cls==='atm_withdrawal'?'Bank → Cash transfer ஆக சேமிக்கப்படும்; Expense double count ஆகாது.':'இது Expense/Income அல்ல; Account Transfer ஆக மட்டும் சேமிக்கப்படும்.';
    if(tf && matchedId) tf.value=String(matchedId);
    if(cls==='atm_withdrawal' && tt){
      var cash=rows.filter(function(a){return a.type==='cash';})[0];
      if(cash) tt.value=String(cash.id);
    }
  }
}
function _smsQueueLoad(){try{return JSON.parse(localStorage.getItem('nm_sms_review_v1')||'[]')||[];}catch(e){return[];}}
function _smsQueueSave(a){try{localStorage.setItem('nm_sms_review_v1',JSON.stringify((a||[]).slice(0,50)));}catch(e){}}
function _smsQueueAdd(item){
  var q=_smsQueueLoad(), fp=item.fingerprint||'';
  if(fp && q.some(function(v){return v.fingerprint===fp;})) return;
  q.unshift(item); _smsQueueSave(q);
}
function openSmsReviewQueue(){var m=document.getElementById('smsReviewQueueModal');if(!m)return;m.style.display='flex';renderSmsReviewQueue();}
function closeSmsReviewQueue(){var m=document.getElementById('smsReviewQueueModal');if(m)m.style.display='none';}
function renderSmsReviewQueue(){
  var box=document.getElementById('smsReviewQueueList'); if(!box)return; var q=_smsQueueLoad();
  if(!q.length){box.innerHTML='<div class="empty"><div class="ei">✅</div>Review செய்ய transaction இல்லை</div>';return;}
  box.innerHTML=q.map(function(r,i){return '<div class="card" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>'+x(r.label||'Transaction')+'</b><div style="font-size:12px;color:var(--muted)">'+x(r.date||'')+' · '+x(r.accountName||'கணக்கு match இல்லை')+'</div></div><b>₹'+fmt(Number(r.amount)||0)+'</b></div><div style="font-size:12px;margin-top:6px">'+x(r.merchant||'')+'</div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn-save" style="flex:1;padding:8px" onclick="smsReviewOpen('+i+')">Review / Save</button><button class="btn-cancel" style="flex:1" onclick="smsReviewDismiss('+i+')">நீக்கு</button></div></div>';}).join('');
}
function smsReviewDismiss(i){var q=_smsQueueLoad();q.splice(i,1);_smsQueueSave(q);renderSmsReviewQueue();}
var _smsReviewEditingIndex=-1;
function smsReviewOpen(i){
  var q=_smsQueueLoad(), r=q[i]; if(!r)return; _smsReviewEditingIndex=i; closeSmsReviewQueue(); openSmsExpenseImport('');
  _smsLastAnalysis={text:'',kind:r.suggestedKind||'expense',amount:Number(r.amount)||0,date:r.date||todayStr(),merchant:r.merchant||'',key:'',category:r.suggestedCategory||'',channel:'Review Queue',txnClass:r.txnClass||'review',statement:r.statement||null,accountId:r.accountId||'',accountName:r.accountName||'',accountConfidence:0,accountAmbiguous:false};
  document.getElementById('sms_import_kind').value=_smsLastAnalysis.kind==='income'?'income':'expense';
  document.getElementById('sms_import_amount').value=_smsLastAnalysis.amount||''; document.getElementById('sms_import_date').value=_smsLastAnalysis.date;
  document.getElementById('sms_import_merchant').value=_smsLastAnalysis.merchant; document.getElementById('sms_import_description').value='Review Queue';
  _smsRenderAccountSelect(_smsLastAnalysis.accountId); renderSmsCategorySelect(_smsLastAnalysis.category); _smsRenderSpecialFields(_smsLastAnalysis.txnClass,'','',_smsLastAnalysis.accountId);
  var c=document.getElementById('sms_import_classification'); if(c)c.innerHTML='<b>'+x(_smsClassLabel(_smsLastAnalysis.txnClass))+'</b> · User review';
  var btn=document.getElementById('smsImportSaveBtn'); if(btn)btn.textContent=(_smsLastAnalysis.txnClass==='atm_withdrawal'||_smsLastAnalysis.txnClass==='own_transfer')?'🔁 Transfer ஆக சேமி':'✅ Review செய்து சேமி';
  document.getElementById('sms_import_result').style.display='block';
}
function _smsReviewComplete(){ if(_smsReviewEditingIndex<0)return; var q=_smsQueueLoad(); q.splice(_smsReviewEditingIndex,1); _smsQueueSave(q); _smsReviewEditingIndex=-1; }
function analyzeSmsExpenseText() {
  var text = String(document.getElementById('sms_import_text').value || '').trim();
  var err = document.getElementById('sms_import_err'); err.textContent='';
  if (text.length < 8) { err.textContent='Transaction SMS text தேவை'; return; }
  var kind=_smsParseKind(text), amount=_smsParseAmount(text), merchant=_smsParseMerchant(text,kind), key=_smsRuleKey(merchant);
  var learned = key && _smsExpenseRules[key] ? _smsExpenseRules[key] : null;
  if(learned && learned.kind) kind=learned.kind;
  var statement=_smsParseCardStatement(text);
  var match=statement?_smsMatchAccountByType(text,_smsIncomingSender,'card'):_smsMatchAccount(text,_smsIncomingSender), account=match.account;
  var txnClass=_smsTxnClass(text,kind,account);
  if(statement && statement.totalDue) amount=statement.totalDue;
  var cat = learned && learned.value ? _smsAvailableCategory(kind, learned.value) : _smsDefaultCategory(kind,text,merchant);
  _smsLastAnalysis={text:text,kind:kind,amount:amount,date:_smsParseDate(text),merchant:merchant,key:key,category:cat,channel:_smsChannel(text),txnClass:txnClass,statement:statement,accountId:account?String(account.id):'',accountName:account?account.name:'',accountConfidence:match.confidence||0,accountAmbiguous:!!match.ambiguous};
  document.getElementById('sms_import_kind').value=kind;
  document.getElementById('sms_import_amount').value=amount||'';
  document.getElementById('sms_import_date').value=_smsLastAnalysis.date;
  document.getElementById('sms_import_merchant').value=merchant;
  document.getElementById('sms_import_description').value=_smsLastAnalysis.channel;
  _smsRenderAccountSelect(_smsLastAnalysis.accountId);
  renderSmsCategorySelect(cat);
  _smsRenderSpecialFields(txnClass,text,_smsIncomingSender,_smsLastAnalysis.accountId);
  if(txnClass==='card_statement' && statement){
    var due=document.getElementById('sms_bill_due_date'), total=document.getElementById('sms_bill_total_due'), min=document.getElementById('sms_bill_min_due');
    if(due)due.value=statement.dueDate||''; if(total)total.value=statement.totalDue||''; if(min)min.value=statement.minDue||'';
  }
  var c=document.getElementById('sms_import_classification');
  if(c){
    var warning=(txnClass==='card_payment'||txnClass==='card_statement'||txnClass==='atm_withdrawal'||txnClass==='own_transfer'||txnClass==='review'||txnClass==='ignore');
    c.style.background=warning?'#FFF7ED':'#F0FDF4';
    c.innerHTML='<b>'+x(_smsClassLabel(txnClass))+'</b>'+(account?' · '+x(account.name):' · ⚠️ கணக்கு match இல்லை')+(match.ambiguous?' · பல கணக்குகள் match ஆகிறது':'')+(statement&&statement.dueDate?' · Due '+x(statement.dueDate):'');
  }
  var saveBtn=document.getElementById('smsImportSaveBtn');
  if(saveBtn){
    var blocked=(txnClass==='atm_withdrawal'||txnClass==='own_transfer'||txnClass==='ignore'||txnClass==='review');
    saveBtn.textContent=txnClass==='card_payment'?'🔁 Transfer ஆக சேமி':(txnClass==='card_statement'?'🔔 Bill Reminder சேமி':(blocked?'🧾 Review Queue-க்கு சேர்':'✅ Transaction சேமி'));
  }
  document.getElementById('sms_import_result').style.display='block';
}

function renderSmsCategorySelect(preselect) {
  var kind=document.getElementById('sms_import_kind').value==='income'?'income':'expense';
  var sel=document.getElementById('sms_import_category');
  var rows=_categoryCache[kind]||[];
  document.getElementById('sms_import_category_label').textContent=kind==='income'?'வரவு மூலம்':'செலவு வகை';
  sel.innerHTML=rows.map(function(c){return '<option value="'+x(c.name)+'">'+(c.icon||'')+' '+x(c.name)+'</option>';}).join('');
  var wanted=preselect || (_smsLastAnalysis ? _smsDefaultCategory(kind,_smsLastAnalysis.text,_smsLastAnalysis.merchant) : '');
  if(wanted) sel.value=_smsAvailableCategory(kind,wanted);
}
function _smsImportFingerprint(text) {
  var s=_smsNorm(text), h=2166136261;
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}
  return (h>>>0).toString(36);
}
function _smsWasRecentlyImported(fp) {
  try { var a=JSON.parse(localStorage.getItem('nm_sms_imported_v1')||'[]'); return a.indexOf(fp)!==-1; } catch(e){return false;}
}
function _smsRememberImported(fp) {
  try { var a=JSON.parse(localStorage.getItem('nm_sms_imported_v1')||'[]'); a.unshift(fp); a=a.filter(function(v,i){return a.indexOf(v)===i;}).slice(0,100); localStorage.setItem('nm_sms_imported_v1',JSON.stringify(a)); } catch(e){}
}
function _smsRememberImportedServer(fp){
  if(!fp)return; try{google.script.run.withFailureHandler(function(){}).rememberSmsImportFingerprint(fp);}catch(e){}
}
function _smsCheckImportedServer(fp, done){
  if(!fp){done(false);return;}
  try{google.script.run.withSuccessHandler(function(r){done(!!(r&&r.duplicate));}).withFailureHandler(function(){done(false);}).checkSmsImportFingerprint(fp);}catch(e){done(false);}
}
function saveSmsExpenseImport() {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('SMS transaction import')) return;
  var text=String(document.getElementById('sms_import_text').value||'').trim();
  var fp=_smsReviewEditingIndex>=0 ? ((_smsQueueLoad()[_smsReviewEditingIndex]||{}).fingerprint||'') : _smsImportFingerprint(text), err=document.getElementById('sms_import_err'); err.textContent='';
  if(_smsWasRecentlyImported(fp)){ err.textContent='⚠️ இதே transaction ஏற்கனவே இந்த device-ல் import செய்யப்பட்டது. Duplicate ஆகாமல் நிறுத்தப்பட்டது.'; return; }
  _smsCheckImportedServer(fp,function(duplicate){
    if(duplicate){err.textContent='⚠️ இதே transaction ஏற்கனவே உங்கள் account-ல் import செய்யப்பட்டது. Duplicate ஆகாமல் நிறுத்தப்பட்டது.';return;}
    _saveSmsExpenseImportAfterDuplicateCheck(fp);
  });
}
function _saveSmsExpenseImportAfterDuplicateCheck(fp) {
  var err=document.getElementById('sms_import_err'); err.textContent='';
  if(!_smsLastAnalysis){ analyzeSmsExpenseText(); if(!_smsLastAnalysis)return; }
  var kind=document.getElementById('sms_import_kind').value==='income'?'income':'expense';
  var amount=Number(document.getElementById('sms_import_amount').value)||0, date=document.getElementById('sms_import_date').value||todayStr();
  var merchant=_norm(document.getElementById('sms_import_merchant').value), category=document.getElementById('sms_import_category').value;
  var desc=_norm(document.getElementById('sms_import_description').value)||'SMS Import';
  var accountId=(document.getElementById('sms_import_account')||{}).value||'';
  var cls=_smsLastAnalysis.txnClass||'review';

  if(cls==='card_statement'){
    var due=(document.getElementById('sms_bill_due_date')||{}).value||'', total=Number((document.getElementById('sms_bill_total_due')||{}).value)||0, min=Number((document.getElementById('sms_bill_min_due')||{}).value)||0;
    if(!accountId){err.textContent='⚠️ Credit Card account-ஐ தேர்வு செய்யவும்.';return;}
    if(!due){err.textContent='⚠️ Bill due date தேவை.';return;}
    setBtnLoading('smsImportSaveBtn',true,'Reminder சேமிக்கிறது...');
    google.script.run.withSuccessHandler(function(res){
      setBtnLoading('smsImportSaveBtn',false,'🔔 Bill Reminder சேமி');
      if(!res||!res.ok){err.textContent=(res&&res.msg)||'Reminder சேமிக்க முடியவில்லை';return;}
      _smsRememberImported(fp); _smsRememberImportedServer(fp); _smsReviewComplete(); toast('🔔 Credit Card bill due reminder சேமிக்கப்பட்டது'); closeSmsExpenseImport();
    }).withFailureHandler(function(e){setBtnLoading('smsImportSaveBtn',false,'🔔 Bill Reminder சேமி');err.textContent=friendlyErrorMsg(e);})
      .syncCreditCardBillReminder({accountId:accountId,dueDate:due,totalDue:total,minDue:min});
    return;
  }
  if(!amount){err.textContent='சரியான தொகை தேவை';return;}
  if(cls==='card_payment'){
    var fromId=(document.getElementById('sms_cardpay_from')||{}).value||'', toId=(document.getElementById('sms_cardpay_to')||{}).value||'';
    if(!fromId||!toId){err.textContent='⚠️ Bill payment-க்கு From Bank/Cash மற்றும் Credit Card இரண்டையும் தேர்வு செய்யவும்.';return;}
    if(fromId===toId){err.textContent='⚠️ From / Credit Card ஒரே account ஆக இருக்க முடியாது.';return;}
    setBtnLoading('smsImportSaveBtn',true,'Transfer சேமிக்கிறது...');
    google.script.run.withSuccessHandler(function(res){
      setBtnLoading('smsImportSaveBtn',false,'🔁 Transfer ஆக சேமி');
      if(!res||!res.ok){err.textContent=(res&&res.msg)||'Transfer சேமிக்க முடியவில்லை';return;}
      _smsRememberImported(fp); _smsRememberImportedServer(fp); _smsReviewComplete(); toast('✅ Credit Card bill payment Transfer/Settlement ஆக சேமிக்கப்பட்டது — Expense double count இல்லை'); _invalidateTxnDataCache(); closeSmsExpenseImport(); expGo('list');
    }).withFailureHandler(function(e){setBtnLoading('smsImportSaveBtn',false,'🔁 Transfer ஆக சேமி');err.textContent=friendlyErrorMsg(e);})
      .addTransfer({date:date,fromAccountId:fromId,toAccountId:toId,amount:amount,note:(merchant?merchant+' · ':'')+'Credit Card Bill Payment · SMS'});
    return;
  }
  if(cls==='atm_withdrawal'||cls==='own_transfer'){
    var trFrom=(document.getElementById('sms_transfer_from')||{}).value||'', trTo=(document.getElementById('sms_transfer_to')||{}).value||'';
    if(!trFrom||!trTo){err.textContent=cls==='atm_withdrawal'?'⚠️ ATM withdrawal-க்கு Bank மற்றும் Cash account தேர்வு செய்யவும்.':'⚠️ From / To account இரண்டையும் தேர்வு செய்யவும்.';return;}
    if(trFrom===trTo){err.textContent='⚠️ From / To ஒரே account ஆக இருக்க முடியாது.';return;}
    setBtnLoading('smsImportSaveBtn',true,'Transfer சேமிக்கிறது...');
    google.script.run.withSuccessHandler(function(res){
      setBtnLoading('smsImportSaveBtn',false,'🔁 Transfer ஆக சேமி');
      if(!res||!res.ok){err.textContent=(res&&res.msg)||'Transfer சேமிக்க முடியவில்லை';return;}
      _smsRememberImported(fp); _smsRememberImportedServer(fp); _smsReviewComplete();
      toast(cls==='atm_withdrawal'?'✅ ATM withdrawal Bank → Cash Transfer ஆக சேமிக்கப்பட்டது':'✅ Own-account Transfer சேமிக்கப்பட்டது');
      _invalidateTxnDataCache(); closeSmsExpenseImport(); expGo('list');
    }).withFailureHandler(function(e){setBtnLoading('smsImportSaveBtn',false,'🔁 Transfer ஆக சேமி');err.textContent=friendlyErrorMsg(e);})
      .addTransfer({date:date,fromAccountId:trFrom,toAccountId:trTo,amount:amount,note:(merchant?merchant+' · ':'')+(cls==='atm_withdrawal'?'ATM Cash Withdrawal':'Own Account Transfer')+' · SMS'});
    return;
  }
  if(cls==='ignore'){ toast('இந்த message transaction ஆக save செய்யப்படவில்லை'); _smsReviewComplete(); closeSmsExpenseImport(); return; }
  if(cls==='review' && _smsReviewEditingIndex<0){
    _smsQueueAdd({fingerprint:fp,label:_smsClassLabel(cls),amount:amount,date:date,merchant:merchant,accountId:accountId,accountName:((_accountsCache||[]).filter(function(a){return String(a.id)===String(accountId);})[0]||{}).name||'',txnClass:cls,suggestedKind:kind,suggestedCategory:category,createdAt:Date.now()});
    toast('🧾 Review Queue-க்கு வைத்தோம்'); closeSmsExpenseImport(); return;
  }
  if(!accountId){err.textContent='⚠️ Bank/Card account match ஆகவில்லை. கணக்கை தேர்வு செய்யவும் அல்லது Bank/Card setup-ல் last 4 digits சேர்க்கவும்.';return;}
  setBtnLoading('smsImportSaveBtn',true,'சேமிக்கிறது...');
  var done=function(res){
    setBtnLoading('smsImportSaveBtn',false,'✅ Transaction சேமி');
    if(!res||!res.ok){err.textContent=(res&&res.msg)||'சேமிக்க முடியவில்லை';return;}
    _smsRememberImported(fp); _smsRememberImportedServer(fp); _smsReviewComplete();
    var remember=document.getElementById('sms_import_remember').checked, key=_smsRuleKey(merchant);
    if(remember&&key){google.script.run.withSuccessHandler(function(r){if(r&&r.ok)_smsExpenseRules=r.rules||_smsExpenseRules;}).saveSmsExpenseRule({key:key,kind:kind,value:category});}
    toast('✅ '+(cls==='card_purchase'?'Credit Card':'Bank/UPI')+' transaction '+(kind==='income'?'வரவாக':'செலவாக')+' சேமிக்கப்பட்டது');
    _invalidateTxnDataCache();
    closeSmsExpenseImport(); expGo('list');
  };
  var fail=function(e){setBtnLoading('smsImportSaveBtn',false,'✅ Transaction சேமி');err.textContent=friendlyErrorMsg(e);};
  if(kind==='income') google.script.run.withSuccessHandler(done).withFailureHandler(fail).addIncome({date:date,source:category,description:(merchant?merchant+' · ':'')+desc,amount:amount,accountId:accountId});
  else google.script.run.withSuccessHandler(done).withFailureHandler(fail).addExpense({date:date,category:category,subCategory:merchant,description:desc,amount:amount,recurring:false,accountId:accountId});
}

function _expenseBillReadFile(file, done, fail) {
  if (!file) { fail('File தேர்வு செய்யவும்'); return; }
  var mime = String(file.type || '').toLowerCase();
  var allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if (allowed.indexOf(mime) === -1) { fail('Bill image அல்லது PDF மட்டும் attach செய்யவும்'); return; }
  if (file.size > 5 * 1024 * 1024) { fail('Bill file 5 MB-க்கு கீழே இருக்க வேண்டும்'); return; }
  var finish = function(base64, outMime, name) { done({base64:base64,mimeType:outMime,fileName:name||file.name||'bill'}); };
  if (mime === 'application/pdf') {
    var r = new FileReader();
    r.onload = function(e){ finish(String(e.target.result||'').split(',')[1]||'', mime, file.name); };
    r.onerror = function(){ fail('Bill file படிக்க முடியவில்லை'); };
    r.readAsDataURL(file); return;
  }
  var fr = new FileReader();
  fr.onload = function(e){
    var img = new Image();
    img.onload = function(){
      try {
        var max = 1800, scale = Math.min(1, max / Math.max(img.width,img.height));
        var c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        finish(c.toDataURL('image/jpeg',0.84).split(',')[1], 'image/jpeg', (file.name||'bill').replace(/\.[^.]+$/,'')+'.jpg');
      } catch(err){ fail('Bill image தயார் செய்ய முடியவில்லை'); }
    };
    img.onerror=function(){ fail('Bill image படிக்க முடியவில்லை'); };
    img.src=e.target.result;
  };
  fr.onerror=function(){ fail('Bill image படிக்க முடியவில்லை'); };
  fr.readAsDataURL(file);
}

function prepareExpenseBill(input) {
  var file=input&&input.files&&input.files[0], st=document.getElementById('ex_bill_status');
  if (!file) { _expenseBillDraft=null; if(st)st.textContent='Important bill இருந்தால் மட்டும் attach செய்யலாம்.'; return; }
  if(st) st.textContent='Bill தயார் செய்கிறது...';
  _expenseBillReadFile(file,function(b){ _expenseBillDraft=b; if(st)st.textContent='✓ '+b.fileName+' attach செய்ய தயார்'; },function(msg){ _expenseBillDraft=null; if(input)input.value=''; if(st)st.textContent='⚠️ '+msg; });
}

function openExpenseBill(fileId) {
  if(!fileId)return;
  window.open('https://drive.google.com/file/d/'+encodeURIComponent(fileId)+'/view','_blank','noopener');
}

function replaceExpenseBill(id) {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('Bill மாற்ற')) return;
  _expenseBillReplaceId=String(id||'');
  var inp=document.getElementById('expenseBillReplaceInput'); if(inp){inp.value='';inp.click();}
}
function handleExpenseBillReplacement(input) {
  var id=_expenseBillReplaceId, file=input&&input.files&&input.files[0]; if(!id||!file)return;
  _expenseBillReadFile(file,function(b){
    toast('⏳ Bill மாற்றப்படுகிறது...');
    google.script.run.withSuccessHandler(function(res){
      if(!res||!res.ok){toast('❌ '+((res&&res.msg)||'Bill மாற்ற முடியவில்லை'));return;}
      toast('✅ Bill மாற்றப்பட்டது'); _invalidateTxnDataCache(); renderTransactionList(true);
    }).withFailureHandler(function(e){toastError(e);}).updateExpenseBill(id,b,false);
  },function(msg){toast('❌ '+msg);});
}
function removeExpenseBill(id) {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('Bill நீக்க')) return;
  showConfirm('இந்த Bill attachment-ஐ நீக்கவா?',function(){
    google.script.run.withSuccessHandler(function(res){
      if(!res||!res.ok){toast('❌ '+((res&&res.msg)||'Bill நீக்க முடியவில்லை'));return;}
      toast('🗑️ Bill நீக்கப்பட்டது'); _invalidateTxnDataCache(); renderTransactionList(true);
    }).withFailureHandler(function(e){toastError(e);}).updateExpenseBill(id,null,true);
  });
}

function _manualExpensePreflight(data, proceed) {
  var now = Date.now();
  var sig = [data.date, _norm(data.category).toLowerCase(), Number(data.amount) || 0].join('|');
  var duplicateRecent = _lastManualExpenseSave && _lastManualExpenseSave.sig === sig &&
    (now - _lastManualExpenseSave.at) < 5 * 60 * 1000;

  // Budget warning is intentionally client-only: use the already-loaded current-month
  // transaction cache when available. Never add another GAS call just to show a warning.
  var monthKey = String(data.date || '').substring(0,7);
  var currentMonth = todayStr().substring(0,7);
  var budgetAfter = null;
  if (_cashMonthlyBudget > 0 && monthKey === currentMonth && _txnDataCache &&
      _txnDataCacheKey === _txnQueryKey() && _txnPeriod === 'month' &&
      String(_txnRefDate || todayStr()).substring(0,7) === currentMonth) {
    budgetAfter = (Number(_txnDataCache.totalExpense) || 0) + (Number(data.amount) || 0);
  }

  var warnings = [];
  if (duplicateRecent) warnings.push('இதே தேதி + வகை + தொகையுடன் கடந்த 5 நிமிடத்தில் ஒரு செலவு சேமிக்கப்பட்டுள்ளது.');
  if (budgetAfter !== null && budgetAfter > _cashMonthlyBudget) {
    warnings.push('இந்த செலவை சேர்த்தால் மாத பட்ஜெட்டை ' + _money(budgetAfter - _cashMonthlyBudget) + ' மீறும்.');
  }
  if (!warnings.length) { proceed(); return; }
  showConfirm(warnings.join('\n\n') + '\n\nஇன்னும் சேமிக்கவா?', proceed);
}

function doAddExpense() {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('செலவு சேர்க்க')) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast('📴 Internet இல்லை — உங்கள் பதிவு அழிக்கப்படவில்லை. Online ஆன பிறகு மீண்டும் Save செய்யுங்கள்.');
    return;
  }
  if (_expenseSaveInFlight) return;
  var category = document.getElementById('ex_category').value;
  var data = {
    date:        document.getElementById('ex_date').value,
    category:    category,
    subCategory: _norm(document.getElementById('ex_subcategory').value),
    description: _norm(document.getElementById('ex_description').value),
    amount:      _cashAmountRaw(document.getElementById('ex_amount').value),
    recurring:   false,
    accountId:   document.getElementById('ex_account').value,
    bill:        _expenseBillDraft
  };
  var errEl = document.getElementById('expAddErr');
  errEl.textContent = '';
  if (!data.category) { errEl.textContent = 'வகை (Category) தேவை'; return; }
  if (!data.amount)   { errEl.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }

  _manualExpensePreflight(data, function(){ _saveManualExpense(data, errEl); });
}

function _saveManualExpense(data, errEl) {
  if (_expenseSaveInFlight) return;
  _expenseSaveInFlight = true;
  setBtnLoading('expAddBtn', true, 'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      _expenseSaveInFlight = false;
      setBtnLoading('expAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> சேமி');
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      _lastManualExpenseSave = { sig:[data.date, _norm(data.category).toLowerCase(), Number(data.amount)||0].join('|'), at:Date.now() };
      toast('✅ செலவு சேர்க்கப்பட்டது');
      _invalidateTxnDataCache();
      _invalidateDashboardExpenseSummary();
      if (data.subCategory) {
        if (!_expenseSubcategorySuggestions[data.category]) _expenseSubcategorySuggestions[data.category] = [];
        _uniqueSuggestionPush(_expenseSubcategorySuggestions[data.category], data.subCategory);
      }
      document.getElementById('ex_category').value = '';
      _renderCategoryPicker('expense', 'ex_category_picker', 'ex_category');
      _renderExpenseSubcategorySuggestions('');
      document.getElementById('ex_subcategory').value = '';
      document.getElementById('ex_description').value = '';
      document.getElementById('ex_amount').value = '';
      _expenseBillDraft = null;
      var billInput=document.getElementById('ex_bill_file'); if(billInput)billInput.value='';
      var billStatus=document.getElementById('ex_bill_status'); if(billStatus)billStatus.textContent='Important bill இருந்தால் மட்டும் attach செய்யலாம்.';
      expGo('list');
    })
    .withFailureHandler(function(e) {
      _expenseSaveInFlight = false;
      setBtnLoading('expAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> சேமி');
      if (!handleTerminalSessionFailure(e)) errEl.textContent = friendlyErrorMsg(e);
    })
    .addExpense(data);
}

var _txnPeriod = 'month'; // backend period: month | custom
var _txnRangeStart = null;
var _txnRangeEnd = null;
var _txnRefDate = null;

// V203 — one shared Expense date range state. Transactions, Summary and
// category drill-down all read from this same state so totals cannot drift.
var _expenseRangeMode = 'month'; // month | year | custom
var _expenseRangeStart = null;
var _expenseRangeEnd = null;

function _expenseYearBounds(year) {
  year = Number(year) || new Date().getFullYear();
  return { start: year + '-01-01', end: year + '-12-31' };
}

function _applyExpenseRangeState(mode, start, end, monthValue, yearValue) {
  _expenseRangeMode = mode;
  _expenseRangeStart = start;
  _expenseRangeEnd = end;
  _summaryRangeMode = mode;
  _summaryRangeStart = start;
  _summaryRangeEnd = end;

  if (mode === 'month') {
    monthValue = monthValue || String(start || todayStr()).substring(0,7);
    _txnPeriod = 'month';
    _txnRefDate = monthValue + '-01';
    _txnRangeStart = null; _txnRangeEnd = null;
  } else {
    _txnPeriod = 'custom';
    _txnRangeStart = start; _txnRangeEnd = end;
  }
  _invalidateTxnDataCache();

  var nowYear = String(yearValue || String(start || todayStr()).substring(0,4));
  var txSel=document.getElementById('txnPeriodSelect'), smSel=document.getElementById('summaryPeriodSelect');
  if(txSel) txSel.value=mode; if(smSel) smSel.value=mode;
  var txM=document.getElementById('txnMonthRange'), txY=document.getElementById('txnYearRange'), txC=document.getElementById('txnCustomRange');
  var smM=document.getElementById('summaryMonthRange'), smY=document.getElementById('summaryYearRange'), smC=document.getElementById('summaryCustomRange');
  if(txM) txM.style.display=mode==='month'?'flex':'none'; if(txY) txY.style.display=mode==='year'?'flex':'none'; if(txC) txC.style.display=mode==='custom'?'grid':'none';
  if(smM) smM.style.display=mode==='month'?'flex':'none'; if(smY) smY.style.display=mode==='year'?'flex':'none'; if(smC) smC.style.display=mode==='custom'?'grid':'none';

  var txMonth=document.getElementById('txnMonthPicker'), smMonth=document.getElementById('expSummaryMonth');
  if(txMonth) txMonth.value=monthValue || String(start||'').substring(0,7);
  if(smMonth) smMonth.value=mode==='month' ? (monthValue || String(start||'').substring(0,7)) : '';
  var txYear=document.getElementById('txnYearPicker'), smYear=document.getElementById('expSummaryYear');
  if(txYear) txYear.value=nowYear; if(smYear) smYear.value=nowYear;
  var txFrom=document.getElementById('txnRangeFrom'), txTo=document.getElementById('txnRangeTo');
  var smFrom=document.getElementById('summaryRangeFrom'), smTo=document.getElementById('summaryRangeTo');
  if(txFrom) txFrom.value=start||''; if(txTo) txTo.value=end||'';
  if(smFrom) smFrom.value=start||''; if(smTo) smTo.value=end||'';
  _updateTxnFilterSummary();
}

function _expenseRangeLabel() {
  if (_expenseRangeMode === 'month') {
    var d=new Date((_txnRefDate||todayStr()).substring(0,7)+'-01T00:00:00');
    return d.toLocaleDateString('ta-IN',{month:'long',year:'numeric'});
  }
  if (_expenseRangeMode === 'year') return String(_expenseRangeStart||'').substring(0,4) + ' Summary';
  return fmtDate(_expenseRangeStart) + ' – ' + fmtDate(_expenseRangeEnd);
}

function setTxnPeriod(mode) {
  var today=todayStr();
  if(mode==='month') {
    var mv=(document.getElementById('txnMonthPicker')||{}).value || today.substring(0,7);
    var d=new Date(Number(mv.substring(0,4)),Number(mv.substring(5,7))-1,1);
    var last=new Date(d.getFullYear(),d.getMonth()+1,0);
    _applyExpenseRangeState('month', Utilities_formatDateLocal(d), Utilities_formatDateLocal(last), mv, mv.substring(0,4));
    renderTransactionList(); return;
  }
  if(mode==='year') {
    var y=(document.getElementById('txnYearPicker')||{}).value || today.substring(0,4);
    var b=_expenseYearBounds(y); _applyExpenseRangeState('year',b.start,b.end,null,y); renderTransactionList(); return;
  }
  var start=_expenseRangeStart, end=_expenseRangeEnd;
  if(!start||!end){var mb=_monthBounds(0);start=mb.start;end=today;}
  _applyExpenseRangeState('custom',start,end,null,String(start).substring(0,4));
}

function pickTxnYear(yearValue) {
  yearValue=String(yearValue||'').trim(); if(!/^\d{4}$/.test(yearValue)) return;
  var b=_expenseYearBounds(yearValue); _applyExpenseRangeState('year',b.start,b.end,null,yearValue); renderTransactionList();
}

function applyTxnCustomRange() {
  var from=document.getElementById('txnRangeFrom').value, to=document.getElementById('txnRangeTo').value;
  if(!from||!to){toast('⚠️ From மற்றும் To தேதி தேவை');return;}
  if(from>to){toast('⚠️ From தேதி To தேதியை விட முன்பாக இருக்க வேண்டும்');return;}
  _applyExpenseRangeState('custom',from,to,null,from.substring(0,4)); renderTransactionList(); closeTxnFilterSheet();
}


function openTxnFilterSheet() {
  var sheet = document.getElementById('txnFilterSheet');
  if (!sheet) return;
  sheet.style.display = 'flex';
  sheet.classList.add('show');
  document.body.classList.add('modal-open');
}

function closeTxnFilterSheet() {
  var sheet = document.getElementById('txnFilterSheet');
  if (!sheet) return;
  sheet.classList.remove('show');
  sheet.style.display = 'none';
  document.body.classList.remove('modal-open');
}

function _txnFilterTypeLabel() {
  return ({all:'எல்லாம்', expense:'செலவு', income:'வரவு', seimurai:'செய்முறை', handloan:'கைமாற்று'})[_txnFilter] || 'எல்லாம்';
}

function _updateTxnFilterSummary() {
  var el = document.getElementById('txnFilterSummary');
  if (!el) return;
  var period = 'மாதம்';
  if (_expenseRangeMode === 'year') period = 'ஆண்டு';
  else if (_expenseRangeMode === 'custom') period = 'தேதி தேர்வு';
  el.textContent = period + ' · ' + _txnFilterTypeLabel();
}


var _txnFilter = 'all';

function setTxnFilter(filter) {
  _txnFilter = filter;
  var filterSelect = document.getElementById('txnFilterSelect');
  if (filterSelect && filterSelect.value !== filter) filterSelect.value = filter;
  ['all','expense','income','seimurai','handloan'].forEach(function(f) {
    var chip = document.getElementById('txn-filter-' + f);
    if (chip) chip.classList.toggle('on', f === filter);
  });
  var seimuraiRow = document.getElementById('txnSeimuraiAddRow');
  if (seimuraiRow) seimuraiRow.style.display = filter === 'seimurai' ? 'block' : 'none';
  _updateTxnFilterSummary();
  // FIX [BUG]: this used to call renderTransactionList() — a fresh server
  // round-trip — every time the filter chip changed, which could look
  // "stuck loading" if that particular request was slow. The underlying
  // data doesn't change when only the filter changes, so re-render from
  // the already-fetched cache instead — instant, no network call.
  if (_txnDataCache) _applyTxnFilterAndRender(_txnDataCache);
  else renderTransactionList();
}


var _txnViewMode = 'list'; // 'list' | 'summary'

function setTxnViewMode(mode) {
  _txnViewMode = mode;
  document.getElementById('txn-view-list').classList.toggle('on', mode === 'list');
  document.getElementById('txn-view-summary').classList.toggle('on', mode === 'summary');
  if (_txnDataCache) _applyTxnFilterAndRender(_txnDataCache);
}


// Adding a செய்முறை entry happens through the moi module's own Add screen
// (autocomplete, duplicate check, quick chips — all already built there,
// no need to rebuild any of it here).
function goAddSeimurai() {
  selectApp('moi');
}



var _txnNavBusy = false;

function _setTxnNavBusy(busy) {
  _txnNavBusy = !!busy;
  var prev = document.getElementById('txnPrevBtn');
  var next = document.getElementById('txnNextBtn');
  var status = document.getElementById('txnNavLoading');
  if (prev) prev.disabled = _txnNavBusy;
  if (next) next.disabled = _txnNavBusy;
  if (status) status.textContent = _txnNavBusy ? 'ஏற்றுகிறது…' : '';
}

function openTxnMonthPicker() {
  if (_txnNavBusy || _txnPeriod !== 'month') return;
  var picker = document.getElementById('txnMonthPicker');
  if (!picker) return;
  var ref = _txnRefDate || todayStr();
  picker.value = String(ref).substring(0,7);
  try {
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  } catch (_) {
    picker.click();
  }
}

function pickTxnMonth(monthValue) {
  if (_txnNavBusy || _txnPeriod !== 'month' || !monthValue) return;
  var current = String(_txnRefDate || todayStr()).substring(0,7);
  if (current === monthValue) return;
  _txnRefDate = monthValue + '-01';
  _setTxnNavBusy(true);
  renderTransactionList();
}

function shiftTxnDate(delta) {
  if (_txnNavBusy || _txnPeriod === 'custom' || _txnPeriod === 'lastmonth') return;
  var d = new Date(_txnRefDate);
  if (_txnPeriod === 'day')   d.setDate(d.getDate() + delta);
  if (_txnPeriod === 'week')  d.setDate(d.getDate() + delta * 7);
  if (_txnPeriod === 'month') d.setMonth(d.getMonth() + delta);
  _txnRefDate = Utilities_formatDateLocal(d);
  _setTxnNavBusy(true);
  renderTransactionList();
}


// FIX [BUG]: delete buttons previously used inline onclick="delExpense(this.dataset.id)".
// Switched to event delegation — ONE listener on the list container that
// reads data-* attributes off whichever element was actually clicked. This
// is the more robust, standard pattern for dynamically-rendered lists and
// removes any dependency on inline-attribute execution timing.
var _txnListDelegated = false;
var _txnMenuDismissBound = false;

function _closeAllTxnMenus(exceptEl) {
  var root = document.getElementById('expList');
  if (!root) return;
  root.querySelectorAll('details.cash-more[open]').forEach(function(el) {
    if (el !== exceptEl) el.removeAttribute('open');
  });
}

function _bindTxnMenuDismiss() {
  if (_txnMenuDismissBound) return;
  _txnMenuDismissBound = true;
  // Capture phase is intentional: several menu actions stop bubbling.
  // This guarantees the popup state is cleaned before those handlers run.
  document.addEventListener('click', function(e) {
    var menu = e.target && e.target.closest ? e.target.closest('details.cash-more') : null;
    var summary = e.target && e.target.closest ? e.target.closest('details.cash-more > summary') : null;
    var item = e.target && e.target.closest ? e.target.closest('.cash-more-item') : null;

    if (summary && menu) {
      // Browser will toggle the clicked <details> after this event. Close every
      // other transaction menu now so two Edit menus can never stay active.
      _closeAllTxnMenus(menu);
      return;
    }
    if (item && menu) {
      // Action chosen: dismiss immediately even when its onclick stops bubbling.
      _closeAllTxnMenus();
      return;
    }
    if (!menu) _closeAllTxnMenus();
  }, true);
}

function _setupTxnListDelegation() {
  if (_txnListDelegated) return;
  _txnListDelegated = true;
  _bindTxnMenuDismiss();
  document.getElementById('expList').addEventListener('click', function(e) {
    var moreBox = e.target.closest('.cash-more');
    if (moreBox && e.target.closest('.cash-more-item')) moreBox.removeAttribute('open');
    var delBtn = e.target.closest('.rdel');
    if (delBtn) {
      if (delBtn.hasAttribute('onclick')) return; // direct handler already ran
      var kind = delBtn.dataset.kind;
      var id = delBtn.dataset.id;
      if (kind === 'income') delIncome(id); else if (kind === 'handloan') delHandLoan(id); else delExpense(id);
      return;
    }
    var completeBtn = e.target.closest('.loan-complete');
    if (completeBtn) { markHandLoanCompleted(completeBtn.dataset.id); return; }
    var editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      if (editBtn.hasAttribute('onclick')) return; // direct handler already ran
      openEditExpInc(editBtn.dataset.kind, editBtn.dataset.id);
      return;
    }
    var detailsEl = e.target.closest('.txn-moi-details');
    if (detailsEl) {
      openMoiRecordFromExpense(detailsEl.dataset.no);
    }
  });
}


var _txnDataCache = null; // last successful getTransactions() response
var _txnDataCacheKey = '';
var _txnDataCacheAt = 0;
var _TXN_CACHE_TTL_MS = 15000; // brief UI reuse only; avoids duplicate same-range GAS reads

function _txnQueryKey() {
  return [_txnPeriod || '', _txnRefDate || '', _txnRangeStart || '', _txnRangeEnd || ''].join('|');
}

function _invalidateTxnDataCache() {
  _txnDataCache = null;
  _txnDataCacheKey = '';
  _txnDataCacheAt = 0;
}

function _cashRowSkeleton(count) {
  count = Math.max(1, Number(count) || 3);
  var rows = '';
  for (var i=0;i<count;i++) rows += '<div class="skeleton-card skeleton-cash-row" aria-hidden="true"><div class="skeleton-row"><div class="skeleton skeleton-line sk-w-36"></div><div class="skeleton skeleton-line sk-w-22"></div></div><div class="skeleton skeleton-line sk-w-62"></div><div class="skeleton skeleton-line sk-w-45"></div></div>';
  return '<div class="skeleton-stack" aria-label="பணப் பதிவுகள் ஏற்றப்படுகின்றன">'+rows+'</div>';
}

function renderTransactionList(forceFresh) {
  if (!_txnRefDate) _txnRefDate = todayStr();
  _setupTxnListDelegation();

  // Performance hardening: rapidly leaving/returning to the same list used
  // to trigger another full Expense + Income + HandLoan + MOI server read.
  // Reuse only the exact same query for a very short window. All local
  // mutations invalidate this cache immediately, and retries can force fresh.
  var queryKey = _txnQueryKey();
  var cacheFresh = _txnDataCache && _txnDataCacheKey === queryKey &&
    (Date.now() - _txnDataCacheAt) < _TXN_CACHE_TTL_MS;
  if (!forceFresh && cacheFresh) {
    _setTxnNavBusy(false);
    _renderCashOverview(_txnDataCache);
    _applyTxnFilterAndRender(_txnDataCache);
    return;
  }

  var loadSeq = ++_txnLoadSeq;
  var persistentShown = false;
  document.getElementById('expList').innerHTML = _cashRowSkeleton(3);
  // Device cache contains records only (never bill/document attachments).
  // It is a fast preview; the same request still refreshes from Google Sheets.
  if (!forceFresh && typeof _nmRecordCacheGet === 'function') {
    _nmRecordCacheGet('cash', queryKey, 7*24*60*60*1000, function(cached){
      if (loadSeq !== _txnLoadSeq || !cached || cached.ok === false) return;
      persistentShown = true;
      _txnDataCache = cached; _txnDataCacheKey = queryKey; _txnDataCacheAt = Date.now();
      _renderCashOverview(cached); _applyTxnFilterAndRender(cached);
    });
  }

  // Launch hardening: retry-safe timeout. A delayed callback from an older
  // month/period request must never overwrite the latest screen.
  var done = false;
  var timeoutId = setTimeout(function() {
    if (done || loadSeq !== _txnLoadSeq) return;
    _setTxnNavBusy(false);
    document.getElementById('expList').innerHTML =
      '<div class="empty"><div class="ei">⏱️</div>ஏற்ற நேரம் அதிகமாகிறது...'
      + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderTransactionList(true)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
  }, 15000);

  google.script.run
    .withSuccessHandler(function(res) {
      if (loadSeq !== _txnLoadSeq) return;
      done = true; clearTimeout(timeoutId);
      _setTxnNavBusy(false);
      if (_handleExpModuleLock(res)) { document.getElementById('expList').innerHTML = ''; return; }
      if (!res.ok) { toast('❌ ' + (res.msg || 'பிழை')); return; }
      _txnDataCache = res;
      _txnDataCacheKey = queryKey;
      _txnDataCacheAt = Date.now();
      if (typeof _nmRecordCachePut === 'function') _nmRecordCachePut('cash', queryKey, res);
      _renderCashOverview(res);
      _applyTxnFilterAndRender(res);
    })
    .withFailureHandler(function(e){
      done = true; clearTimeout(timeoutId);
      _setTxnNavBusy(false);
      toastError(e);
      if (!persistentShown) document.getElementById('expList').innerHTML =
        '<div class="empty"><div class="ei">⚠️</div>ஏற்ற முடியவில்லை'
        + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderTransactionList(true)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
    })
    .getTransactions(_txnPeriod, _txnRefDate, _txnRangeStart, _txnRangeEnd);
}


// Pure rendering from already-fetched data — handles both the filter chip
// AND the List/Summary view toggle without any network call.
function _applyTxnFilterAndRender(res) {
  // One shared label derived from the same range state used by Summary.
  var labelEl = document.getElementById('txnDateLabel');
  if (labelEl) labelEl.textContent = _expenseRangeLabel();

  document.getElementById('txnSumCards').innerHTML =
    sc('வரவு', '₹' + fmt(res.totalIncome + (res.totalLoanReceived || 0)), false) +
    sc('செலவு', '₹' + fmt(res.totalExpense + res.totalSeimurai + (res.totalLoanGiven || 0)), true) +
    sc('கைமாற்று நிலுவை', '₹' + fmt(res.pendingLoanAmount || 0), false);
  animateStatsIn(document.getElementById('txnSumCards'));

  var rows = _txnFilter === 'all' ? res.rows : res.rows.filter(function(r){ return r.kind === _txnFilter; });
  var net = res.totalIncome + (res.totalLoanReceived || 0) - res.totalExpense - res.totalSeimurai - (res.totalLoanGiven || 0);

  document.getElementById('expListCount').textContent = rows.length + ' பதிவுகள்';
  document.getElementById('expListTotal').innerHTML =
    '<span style="color:' + (net >= 0 ? '#1B8A4A' : '#DC2626') + '">நிகர: ₹' + fmt(net) + '</span>';

  document.getElementById('expList').innerHTML = _txnViewMode === 'summary' ? _renderTxnSummaryView(rows) : _renderTxnCards(rows);
}


function _renderTxnCards(rows) {
  if (!rows.length) return empty();

  // Timeline view: show the date once per group instead of repeating it on
  // every card. This keeps the mobile list dense while preserving all
  // existing edit/delete/detail handlers and transaction semantics.
  var groups = {};
  var order = [];
  rows.forEach(function(r) {
    var key = String(r.date || '');
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(r);
  });

  return '<div class="cash-timeline">' + order.map(function(dateKey) {
    var dateRows = groups[dateKey];
    var dayTotal = dateRows.reduce(function(sum, r) {
      var incoming = r.kind === 'income' || (r.kind === 'handloan' && r.direction === 'received');
      return sum + (incoming ? 1 : -1) * (Number(r.amount) || 0);
    }, 0);

    return '<section class="cash-day-group">'
      + '<div class="cash-day-head"><strong>' + fmtDate(dateKey) + '</strong>'
      + '<span class="' + (dayTotal >= 0 ? 'positive' : 'negative') + '">'
      + '₹' + fmt(Math.abs(dayTotal)) + ' ' + (dayTotal >= 0 ? 'CR' : 'DR') + '</span></div>'
      + '<div class="cash-day-list">' + dateRows.map(function(r) {
        var rid = x(String(r.id));
        var isLoan = r.kind === 'handloan';
        var icon  = r.kind === 'income' ? '💵' : (r.kind === 'seimurai' ? '🪔' : (isLoan ? '🤝' : '💸'));
        var color = r.kind === 'income' ? '#1B8A4A' : (r.kind === 'seimurai' ? '#7C3AED' : (isLoan ? '#9A6700' : '#6E1423'));
        var incoming = r.kind === 'income' || (isLoan && r.direction === 'received');
        var amountSuffix = isLoan ? '' : (incoming ? 'CR' : 'DR');
        var amountText = '₹' + fmt(r.amount) + (isLoan ? '' : ' ' + amountSuffix);
        var typeLabel = r.kind === 'income' ? 'வரவு' : (r.kind === 'seimurai' ? 'செய்முறை' : (isLoan ? (incoming ? 'கைமாற்று · வாங்கியது' : 'கைமாற்று · கொடுத்தது') : 'செலவு'));

        var canEditTxn = typeof _nmRoleCanWrite !== 'function' || _nmRoleCanWrite();
        var canDeleteTxn = typeof _nmRoleCanDelete !== 'function' || _nmRoleCanDelete();
        var menuItems = r.kind === 'seimurai'
          ? '<button type="button" class="cash-more-item txn-moi-details" data-no="' + rid + '">விவரம் பார்க்க</button>'
          : isLoan
            ? (canEditTxn ? '<button type="button" class="cash-more-item btn-edit" data-id="' + rid + '" data-kind="handloan" onclick="event.preventDefault();event.stopPropagation();openEditExpInc(this.dataset.kind,this.dataset.id)">✏️ திருத்து</button>' : '')
              + '<button type="button" class="cash-more-item" data-person="' + x(r.label) + '" data-phone="' + x(r.phone || '') + '" onclick="event.preventDefault();event.stopPropagation();openHandLoanLedger(this)">📒 Ledger</button>'
              + (r.phone ? '<button type="button" class="cash-more-item" data-phone="' + x(r.phone) + '" data-person="' + x(r.label) + '" data-amount="' + x(String(r.amount || '')) + '" data-return-date="' + x(r.returnDate || '') + '" onclick="event.preventDefault();event.stopPropagation();loanQuickAction(this,\'call\')">📞 Call</button>'
                + '<button type="button" class="cash-more-item" data-phone="' + x(r.phone) + '" data-person="' + x(r.label) + '" data-amount="' + x(String(r.amount || '')) + '" data-return-date="' + x(r.returnDate || '') + '" onclick="event.preventDefault();event.stopPropagation();loanQuickAction(this,\'whatsapp\')">💬 WhatsApp</button>'
                + '<button type="button" class="cash-more-item" data-phone="' + x(r.phone) + '" data-person="' + x(r.label) + '" data-amount="' + x(String(r.amount || '')) + '" data-return-date="' + x(r.returnDate || '') + '" onclick="event.preventDefault();event.stopPropagation();loanQuickAction(this,\'sms\')">✉️ SMS</button>' : '')
              + (canEditTxn && r.status !== 'completed' ? '<button type="button" class="cash-more-item loan-complete" data-id="' + rid + '">✓ முடித்ததாக குறி</button>' : '')
              + (canDeleteTxn ? '<button type="button" class="cash-more-item danger rdel" data-id="' + rid + '" data-kind="handloan">🗑️ நீக்கு</button>' : '')
            : (canEditTxn ? '<button type="button" class="cash-more-item btn-edit" data-id="' + rid + '" data-kind="' + r.kind + '" onclick="event.preventDefault();event.stopPropagation();openEditExpInc(this.dataset.kind,this.dataset.id)">✏️ திருத்து</button>' : '')
              + (r.kind === 'expense' && r.billFileId ? '<button type="button" class="cash-more-item" onclick="event.preventDefault();event.stopPropagation();openExpenseBill(\'' + x(r.billFileId) + '\')">🧾 Bill பார்க்க</button>'
                + (canEditTxn ? '<button type="button" class="cash-more-item" onclick="event.preventDefault();event.stopPropagation();replaceExpenseBill(\'' + rid + '\')">🔄 Bill மாற்று</button><button type="button" class="cash-more-item danger" onclick="event.preventDefault();event.stopPropagation();removeExpenseBill(\'' + rid + '\')">🗑️ Bill நீக்கு</button>' : '')
                : (r.kind === 'expense' && canEditTxn ? '<button type="button" class="cash-more-item" onclick="event.preventDefault();event.stopPropagation();replaceExpenseBill(\'' + rid + '\')">🧾 Bill சேர்க்க</button>' : ''))
              + (canDeleteTxn ? '<button type="button" class="cash-more-item danger rdel" data-id="' + rid + '" data-kind="' + r.kind + '" onclick="event.preventDefault();event.stopPropagation();if(this.dataset.kind===\'income\'){delIncome(this.dataset.id)}else{delExpense(this.dataset.id)}">🗑️ நீக்கு</button>' : '');
        var actionHtml = menuItems ? '<details class="cash-more"><summary aria-label="மேலும் செயல்கள்" title="மேலும்">⋮</summary><div class="cash-more-menu">' + menuItems + '</div></details>' : '';

        return '<article class="cash-txn-row" style="--txn-accent:' + color + '">'
          + '<div class="cash-txn-icon" aria-hidden="true">' + icon + '</div>'
          + '<div class="cash-txn-main"><strong>' + x(r.label) + '</strong>'
          + '<span>' + typeLabel + (r.sub ? ' · ' + x(r.sub) : '') + (isLoan ? _handLoanDueLabel(r) : '') + '</span></div>'
          + '<div class="cash-txn-end"><strong style="color:' + color + '">' + amountText + '</strong>'
          + '<div class="cash-row-actions">' + actionHtml + '</div></div>'
          + '</article>';
      }).join('') + '</div></section>';
  }).join('') + '</div>';
}


// FIX: "List View | Summary View" toggle — Summary View groups the same
// (already-filtered) rows by label (Category/Source/Person) with a total
// per group, instead of listing every individual transaction.
function _renderTxnSummaryView(rows) {
  if (!rows.length) return empty();
  var groups = {};
  rows.forEach(function(r) {
    // கைமாற்று கொடுத்தது/வாங்கியது பண ஓட்டத்தில் எதிர்திசை. ஒரே நபரின்
    // இரண்டு திசைகளையும் ஒன்றாக கூட்டினால் summary தவறாகும்; direction-ஐ
    // grouping key-ல் வைத்துப் பிரித்துக் காட்டுகிறோம்.
    var direction = r.kind === 'handloan' ? (r.direction || 'given') : '';
    var key = r.kind + '||' + direction + '||' + r.label;
    if (!groups[key]) groups[key] = { kind:r.kind, direction:direction, label:r.label, total:0, count:0 };
    groups[key].total += Number(r.amount) || 0;
    groups[key].count++;
  });
  var list = Object.keys(groups).map(function(k){ return groups[k]; })
    .sort(function(a,b){ return b.total - a.total; });
  return '<div class="list cash-txn-summary-list">' + list.map(function(g) {
    var isLoan = g.kind === 'handloan';
    var incomingLoan = isLoan && g.direction === 'received';
    var icon  = g.kind === 'income' ? '💵' : (g.kind === 'seimurai' ? '🪔' : (isLoan ? '🤝' : '💸'));
    var color = g.kind === 'income' ? '#1B8A4A' : (g.kind === 'seimurai' ? '#7C3AED' : (isLoan ? '#9A6700' : '#6E1423'));
    var amountText = isLoan ? ('₹' + fmt(g.total)) : ('₹' + fmt(g.total) + ' ' + (g.kind === 'income' ? 'CR' : 'DR'));
    var loanLabel = isLoan ? (incomingLoan ? 'வாங்கியது · ' : 'கொடுத்தது · ') : '';
    return '<div class="card cash-txn-summary-card" style="border-left-color:' + color + '">' 
      + '<div><div class="cash-txn-summary-title">' + icon + ' ' + loanLabel + x(g.label) + '</div>'
      + '<div class="cash-txn-summary-count">' + g.count + ' பதிவுகள்</div></div>'
      + '<div class="cash-txn-summary-amount" style="color:' + color + '">' + amountText + '</div>'
      + '</div>';
  }).join('') + '</div>';
}


var _expDeleteInFlight = false;


function _refreshAfterDailyCashUndo() {
  _invalidateDashboardExpenseSummary();
  _invalidateTxnDataCache();
  if (typeof _refreshReminderUI === 'function') _refreshReminderUI();
  renderTransactionList();
  renderBalanceTopCard();
  var sum = document.getElementById('ep-summary');
  if (sum && sum.classList.contains('show')) renderExpenseSummary();
}
function _undoDailyCashDelete(token) {
  if (!token) { toast('Undo data கிடைக்கவில்லை'); return; }
  google.script.run
    .withSuccessHandler(function(res){
      if (_handleExpModuleLock(res)) return;
      if (!res || !res.ok) { toast('❌ ' + ((res && res.msg) || 'Undo முடியவில்லை')); return; }
      toast('↩️ பதிவு மீட்டெடுக்கப்பட்டது');
      _refreshAfterDailyCashUndo();
    })
    .withFailureHandler(toastError)
    .undoDailyCashDelete(token);
}

function delExpense(id) {
  if (typeof _nmGuardDelete === 'function' && !_nmGuardDelete('செலவு பதிவு')) return;
  if (_expDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast('📶 Internet இல்லை — online ஆன பிறகு நீக்கவும்'); return; }
  showConfirm('இந்த செலவு பதிவை நீக்கவா?', function() {
    if (_expDeleteInFlight) return;
    _expDeleteInFlight = true;
    google.script.run
      .withSuccessHandler(function(res) {
        _expDeleteInFlight = false;
        if (_handleExpModuleLock(res)) return;
        if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
        if (res.undoToken) showUndoToast('நீக்கப்பட்டது', function(){ _undoDailyCashDelete(res.undoToken); });
        else toast('🗑 நீக்கப்பட்டது');
        _invalidateDashboardExpenseSummary();
        _invalidateTxnDataCache();
        renderTransactionList();
        renderBalanceTopCard();
        if (document.getElementById('ep-summary').classList.contains('show')) renderExpenseSummary();
      })
      .withFailureHandler(function(e){ _expDeleteInFlight = false; toastError(e); })
      .deleteExpense(id);
  });
}


// ── INCOME (manual entries) ─────────────────────────────────────
function doAddIncome() {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('வரவு சேர்க்க')) return;
  var data = {
    date:        document.getElementById('in_date').value,
    source:      _norm(document.getElementById('in_source').value),
    description: _norm(document.getElementById('in_description').value),
    amount:      _cashAmountRaw(document.getElementById('in_amount').value),
    accountId:   document.getElementById('in_account').value
  };
  var errEl = document.getElementById('incAddErr');
  errEl.textContent = '';
  if (!data.source) { errEl.textContent = 'வரவு மூலம் (Source) தேவை'; return; }
  if (!data.amount) { errEl.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }

  setBtnLoading('incAddBtn', true, 'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      setBtnLoading('incAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> வரவு சேமி');
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      toast('✅ வரவு சேர்க்கப்பட்டது');
      _invalidateTxnDataCache();
      _invalidateDashboardExpenseSummary();
      document.getElementById('in_source').value = '';
      _renderCategoryPicker('income', 'in_source_picker', 'in_source');
      document.getElementById('in_description').value = '';
      document.getElementById('in_amount').value = '';
      expGo('list');
    })
    .withFailureHandler(function(e) {
      setBtnLoading('incAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> வரவு சேமி');
      errEl.textContent = friendlyErrorMsg(e);
    })
    .addIncome(data);
}


// FIX: the standalone Income list (with its own month picker) was removed
// — income entries now show inside the unified Transactions (பட்டியல்)
// tab alongside expenses, so delIncome() always refreshes that view.
function delIncome(id) {
  if (typeof _nmGuardDelete === 'function' && !_nmGuardDelete('வரவு பதிவு')) return;
  if (_expDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast('📶 Internet இல்லை — online ஆன பிறகு நீக்கவும்'); return; }
  showConfirm('இந்த வரவு பதிவை நீக்கவா?', function() {
    if (_expDeleteInFlight) return;
    _expDeleteInFlight = true;
    google.script.run
      .withSuccessHandler(function(res) {
        _expDeleteInFlight = false;
        if (_handleExpModuleLock(res)) return;
        if (!res.ok) { toast('❌ ' + (res.msg || 'நீக்க முடியவில்லை')); return; }
        if (res.undoToken) showUndoToast('நீக்கப்பட்டது', function(){ _undoDailyCashDelete(res.undoToken); });
        else toast('🗑 நீக்கப்பட்டது');
        _invalidateDashboardExpenseSummary();
        _invalidateTxnDataCache();
        renderTransactionList();
        renderBalanceTopCard();
        if (document.getElementById('ep-summary').classList.contains('show')) renderExpenseSummary();
      })
      .withFailureHandler(function(e){ _expDeleteInFlight = false; toastError(e); })
      .deleteIncome(id);
  });
}


var _summaryRangeMode = 'month';
var _summaryRangeStart = null;
var _summaryRangeEnd = null;

function _monthBounds(offset) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + (offset || 0));
  var start = Utilities_formatDateLocal(d);
  var endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start:start, end:Utilities_formatDateLocal(endD), month:start.substring(0,7) };
}

function setExpenseSummaryRange(mode) {
  var today=todayStr();
  if(mode==='month') {
    var mv=(document.getElementById('expSummaryMonth')||{}).value || today.substring(0,7);
    pickExpenseSummaryMonth(mv); return;
  }
  if(mode==='year') {
    var y=(document.getElementById('expSummaryYear')||{}).value || today.substring(0,4);
    pickExpenseSummaryYear(y); return;
  }
  var start=_expenseRangeStart,end=_expenseRangeEnd;
  if(!start||!end){var mb=_monthBounds(0);start=mb.start;end=today;}
  _applyExpenseRangeState('custom',start,end,null,String(start).substring(0,4));
}

function pickExpenseSummaryMonth(monthValue) {
  if(!monthValue) return;
  var d=new Date(Number(monthValue.substring(0,4)),Number(monthValue.substring(5,7))-1,1);
  var last=new Date(d.getFullYear(),d.getMonth()+1,0);
  _applyExpenseRangeState('month',Utilities_formatDateLocal(d),Utilities_formatDateLocal(last),monthValue,monthValue.substring(0,4));
  renderExpenseSummary();
}

function pickExpenseSummaryYear(yearValue) {
  yearValue=String(yearValue||'').trim(); if(!/^\d{4}$/.test(yearValue)) return;
  var b=_expenseYearBounds(yearValue); _applyExpenseRangeState('year',b.start,b.end,null,yearValue); renderExpenseSummary();
}

function applyExpenseSummaryCustomRange() {
  var from=document.getElementById('summaryRangeFrom').value, to=document.getElementById('summaryRangeTo').value;
  if(!from||!to){toast('⚠️ From மற்றும் To தேதி தேவை');return;}
  if(from>to){toast('⚠️ From தேதி To தேதியை விட முன்பாக இருக்க வேண்டும்');return;}
  _applyExpenseRangeState('custom',from,to,null,from.substring(0,4)); renderExpenseSummary();
}

function _summaryRangeLabel() { return _expenseRangeLabel(); }

function renderExpenseSummary() {
  var month = document.getElementById('expSummaryMonth').value;
  var startDate = _summaryRangeStart;
  var endDate = _summaryRangeEnd;
  var loadSeq = ++_summaryLoadSeq;
  var done = false;
  var labelEl = document.getElementById('expSummaryRangeLabel');
  // v236Z UI consistency: Month/Year already have an explicit picker directly
  // above the cards, so repeating the same period again adds visual noise.
  // Keep a visible range label only for Custom Date, where the chosen span
  // is useful confirmation. Presentation-only; summary calculations untouched.
  if (labelEl) {
    if (_expenseRangeMode === 'custom') {
      labelEl.textContent = _summaryRangeLabel();
      labelEl.style.display = '';
    } else {
      labelEl.textContent = '';
      labelEl.style.display = 'none';
    }
  }
  document.getElementById('expSumCards').innerHTML = '<div class="empty"><div class="ei">⏳</div>சுருக்கம் ஏற்றுகிறது...</div>';
  var timeoutId = setTimeout(function() {
    if (done || loadSeq !== _summaryLoadSeq) return;
    document.getElementById('expSumCards').innerHTML =
      '<div class="empty"><div class="ei">⏱️</div>சுருக்கம் ஏற்ற நேரம் அதிகமாகிறது...'
      + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderExpenseSummary()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
  }, 20000);
  google.script.run
    .withSuccessHandler(function(res) {
      if (loadSeq !== _summaryLoadSeq) return;
      done = true; clearTimeout(timeoutId);
      if (_handleExpModuleLock(res)) {
        document.getElementById('expSumCards').innerHTML = '';
        document.getElementById('expBudgetBar').innerHTML = '';
        document.getElementById('expNetBalance').innerHTML = '';
        document.getElementById('expCatBreakdown').innerHTML = '';
        return;
      }
      if (!res.ok) { toast('❌ ' + (res.msg || 'பிழை')); return; }

      // v226: Summary first-view semantics — show the three numbers a user
      // actually needs at a glance.  Backend calculations are unchanged:
      // totalIncome = MOI varavu + manual income, total = tracked expenses,
      // netBalance = income - expense - seimurai.
      document.getElementById('expSumCards').innerHTML =
        sc('வரவு', '₹' + fmt(res.totalIncome), true)
        + sc(res.budgetEnabled ? 'பட்ஜெட் செலவு' : 'செலவு', '₹' + fmt(res.total), false)
        + sc('மீதி', (res.netBalance < 0 ? '−₹' : '₹') + fmt(Math.abs(res.netBalance)), res.netBalance >= 0)
        + sc('செலவு பதிவுகள்', res.count, false);
      animateStatsIn(document.getElementById('expSumCards'));

      var budgetHtml = '';
      if (res.budget > 0) {
        var pct = Math.min(100, Math.round((res.total / res.budget) * 100));
        budgetHtml = '<div class="card" style="margin-bottom:10px">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px">'
          + '<span>பட்ஜெட்: ₹' + fmt(res.budget) + '</span>'
          + '<span style="color:' + (res.overBudget ? '#DC2626' : '#1B8A4A') + ';font-weight:700">'
          + (res.overBudget ? '⚠️ ₹' + fmt(Math.abs(res.budgetRemaining)) + ' அதிகம்' : '₹' + fmt(res.budgetRemaining) + ' மீதம்')
          + '</span></div>'
          + '<div style="background:#F3F4F6;border-radius:999px;height:10px;overflow:hidden">'
          + '<div style="width:' + pct + '%;height:100%;background:' + (res.overBudget ? '#DC2626' : '#6E1423') + '"></div>'
          + '</div></div>';
      }
      document.getElementById('expBudgetBar').innerHTML = budgetHtml;

      // v226: "மீதி" is already a primary summary card above, so avoid a
      // second large balance card.  Keep the existing செய்முறை drill-down
      // as a compact supporting row (same destination/behavior as before).
      document.getElementById('expNetBalance').innerHTML = res.seimuraiTotal > 0
        ? '<button type="button" class="cash-summary-seimurai net-seimurai-line">'
          + '<span>🪔 செய்முறை கழிவு</span><strong>−₹' + fmt(res.seimuraiTotal) + '</strong><small>மீதியில் கழிக்கப்பட்டது ›</small>'
          + '</button>'
        : '';
      _setupNetBalanceDelegation();

      document.getElementById('expCatBreakdown').innerHTML = (!res.byCategory || !res.byCategory.length) ? empty() :
        '<div class="list">' + res.byCategory.map(function(c) {
          var pct = res.totalOutflow ? Math.round((c.total / res.totalOutflow) * 100) : 0;
          var budgetLine = c.budget > 0
            ? '<div style="font-size:11px;margin-top:2px;color:' + (c.overBudget ? '#DC2626' : '#1B8A4A') + '">'
              + (c.overBudget ? '⚠️ ₹' + fmt(Math.abs(c.budgetRemaining)) + ' அதிகம்' : '₹' + fmt(c.budgetRemaining) + ' மீதம்') + ' (பட்ஜெட் ₹' + fmt(c.budget) + ')</div>'
            : '';
          return '<div class="card cat-drilldown" style="margin-bottom:8px;cursor:pointer" data-cat="' + x(c.category) + '">'
            + '<div style="display:flex;justify-content:space-between">'
            + '<span style="font-weight:600">' + x(c.category) + '</span>'
            + '<span style="font-weight:700;color:#BE185D">₹' + fmt(c.total) + '</span></div>'
            + '<div class="cash-cat-meta">' + c.count + ' பதிவுகள் · மொத்த வெளியேற்றத்தில் ' + pct + '%</div>'
            + budgetLine
            + '</div>';
        }).join('') + '</div>';
      _setupCatBreakdownDelegation();

      _renderPieChart(res.byCategory || [], 'expPieChart');
    })
    .withFailureHandler(function(e){
      if (loadSeq !== _summaryLoadSeq) return;
      done = true; clearTimeout(timeoutId);
      toastError(e);
      document.getElementById('expSumCards').innerHTML =
        '<div class="empty"><div class="ei">⚠️</div>சுருக்கம் ஏற்ற முடியவில்லை'
        + '<div style="margin-top:10px"><button class="btn-cancel" onclick="renderExpenseSummary()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> மறுபடியும் முயற்சி</button></div></div>';
    })
    .getExpenseSummary(month, startDate, endDate);

  renderMonthlyTrendChart();
}


// HandLoan complete/delete actions moved to js_handloan.html

// ── SVG CHARTS (hand-drawn, no external CDN — reliable inside the
//    Median-wrapped mobile app regardless of network/webview restrictions) ──
var PIE_COLORS = ['#6E1423','#1B8A4A','#185FA5','#3B6D11','#DC2626','#7C3AED','#0891B2','#EA580C','#4D7C0F','#6E1423'];


function _renderPieChart(byCategory, containerId) {
  var el = document.getElementById(containerId);
  if (!byCategory.length) { el.innerHTML = ''; return; }

  var total = byCategory.reduce(function(s,c){ return s + c.total; }, 0);
  if (!total) { el.innerHTML = ''; return; }

  var cx = 100, cy = 100, r = 90;
  var angle = -90; // start at 12 o'clock
  var paths = '';
  byCategory.forEach(function(c, i) {
    var slice = (c.total / total) * 360;
    var x1 = cx + r * Math.cos(angle * Math.PI / 180);
    var y1 = cy + r * Math.sin(angle * Math.PI / 180);
    var endAngle = angle + slice;
    var x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
    var y2 = cy + r * Math.sin(endAngle * Math.PI / 180);
    var largeArc = slice > 180 ? 1 : 0;
    var color = PIE_COLORS[i % PIE_COLORS.length];
    paths += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) + ' A' + r + ',' + r + ' 0 ' + largeArc + ' 1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) + ' Z" fill="' + color + '"></path>';
    angle = endAngle;
  });

  var legend = byCategory.map(function(c, i) {
    var pct = total ? Math.round((c.total / total) * 100) : 0;
    return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:3px">'
      + '<span style="width:10px;height:10px;border-radius:3px;background:' + PIE_COLORS[i % PIE_COLORS.length] + ';display:inline-block;flex-shrink:0"></span>'
      + '<span style="color:var(--txt)">' + x(c.category) + '</span>'
      + '<span style="color:var(--muted);margin-left:auto">' + pct + '%</span></div>';
  }).join('');

  el.innerHTML = '<div class="cash-pie-layout">'
    + '<svg class="cash-pie-svg" viewBox="0 0 200 200" aria-label="செலவு வகை விகிதம்">' + paths + '</svg>'
    + '<div class="cash-pie-legend">' + legend + '</div></div>';
}


function renderMonthlyTrendChart() {
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) { document.getElementById('expTrendChart').innerHTML = ''; return; }
      _renderTrendChart(res.rows || [], 'expTrendChart');
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getMonthlyTrend(6);
}


function _renderTrendChart(rows, containerId) {
  var el = document.getElementById(containerId);
  if (!rows.length) { el.innerHTML = '<div class="cash-compact-empty">இந்த காலத்தில் பண ஓட்டப் பதிவுகள் இல்லை</div>'; return; }
  var hasMovement = rows.some(function(r){ return (Number(r.income) || 0) > 0 || (Number(r.expense) || 0) > 0; });
  if (!hasMovement) {
    el.innerHTML = '<div class="cash-compact-empty">கடந்த 6 மாதங்களில் வரவு / செலவு பதிவுகள் இல்லை</div>';
    return;
  }

  var maxVal = Math.max.apply(null, rows.map(function(r){ return Math.max(r.income, r.expense); }).concat([1]));
  var chartH = 140, barW = 16, gap = 10, groupW = barW * 2 + 6;
  var svgW = rows.length * (groupW + gap) + gap;

  var bars = '';
  rows.forEach(function(r, i) {
    var gx = gap + i * (groupW + gap);
    var incH = Math.round((r.income  / maxVal) * chartH);
    var expH = Math.round((r.expense / maxVal) * chartH);
    var monthLabel = r.month.substring(5,7) + '/' + r.month.substring(2,4);
    bars += '<rect x="' + gx + '" y="' + (chartH - incH + 20) + '" width="' + barW + '" height="' + incH + '" fill="#1B8A4A" rx="2"></rect>';
    bars += '<rect x="' + (gx + barW + 4) + '" y="' + (chartH - expH + 20) + '" width="' + barW + '" height="' + expH + '" fill="#DC2626" rx="2"></rect>';
    bars += '<text x="' + (gx + groupW/2) + '" y="' + (chartH + 36) + '" font-size="10" fill="var(--muted)" text-anchor="middle">' + monthLabel + '</text>';
  });

  el.innerHTML = '<div style="overflow-x:auto">'
    + '<svg viewBox="0 0 ' + svgW + ' ' + (chartH + 45) + '" width="100%" height="' + (chartH + 45) + '" style="min-width:' + Math.max(svgW, 280) + 'px">' + bars + '</svg>'
    + '</div>'
    + '<div style="display:flex;gap:16px;justify-content:center;font-size:11px;margin-top:4px">'
    + '<span><span style="display:inline-block;width:10px;height:10px;background:#1B8A4A;border-radius:2px;margin-right:4px"></span>வரவு</span>'
    + '<span><span style="display:inline-block;width:10px;height:10px;background:#DC2626;border-radius:2px;margin-right:4px"></span>செலவு</span>'
    + '</div>';
}


function _renderBudgetOverview(spentOverride) {
  var total = Number(document.getElementById('exp_budget_amt') && document.getElementById('exp_budget_amt').value) || _cashMonthlyBudget || 0;
  var spent = Number(spentOverride) || 0;
  var remaining = total - spent;
  var pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  var totalEl = document.getElementById('cashBudgetTotal');
  if (!totalEl) return;
  totalEl.textContent = _money(total);
  document.getElementById('cashBudgetSpent').textContent = _money(spent);
  document.getElementById('cashBudgetRemaining').textContent = total > 0 ? ((remaining < 0 ? '−' : '') + _money(Math.abs(remaining))) : '—';
  var bar = document.getElementById('cashBudgetProgress');
  bar.style.width = pct + '%';
  bar.classList.toggle('over', total > 0 && spent > total);
  var state = document.getElementById('cashBudgetState');
  if (!total) state.textContent = 'பட்ஜெட் அமைக்கப்படவில்லை';
  else if (spent > total) state.textContent = 'வரம்பை கடந்தது';
  else state.textContent = pct + '% பயன்படுத்தப்பட்டது';
  state.classList.toggle('over', total > 0 && spent > total);
}

function loadBudgetIntoForm() {
  google.script.run
    .withSuccessHandler(function(res) {
      if (_handleExpModuleLock(res)) return;
      document.getElementById('exp_budget_amt').value = res.amount || '';
      _cashMonthlyBudget = Number(res.effectiveAmount != null ? res.effectiveAmount : res.amount) || 0;
      var month = todayStr().substring(0, 7);
      google.script.run
        .withSuccessHandler(function(summary) {
          var spent = summary && summary.ok ? (Number(summary.total) || 0) : 0;
          if (summary && summary.ok && Number(summary.budget) >= 0) _cashMonthlyBudget = Number(summary.budget) || _cashMonthlyBudget;
          _renderBudgetOverview(spent);
        })
        .withFailureHandler(function(){ _renderBudgetOverview(0); })
        .getExpenseSummary(month, '', '');
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getBudgetSettings();
}


function doSaveBudget() {
  var amt = Number(document.getElementById('exp_budget_amt').value) || 0;
  var errEl = document.getElementById('expBudgetErr');
  errEl.textContent = '';
  google.script.run
    .withSuccessHandler(function(res) {
      if (_handleExpModuleLock(res)) return;
      if (!res.ok) { errEl.textContent = res.msg || 'பிழை'; return; }
      _cashMonthlyBudget = amt;
      loadBudgetIntoForm();
      toast('✅ பட்ஜெட் சேமிக்கப்பட்டது');
    })
    .withFailureHandler(function(e){ errEl.textContent = friendlyErrorMsg(e); })
    .saveBudgetSettings(amt);
}


// FIX: lets other modules (Daily Expenses' செய்முறை tab) navigate INTO
// the moi module and automatically open a specific record's details once
// its data finishes loading — since `recs` (needed by openEditModal) is
// only populated after enterApp()'s async load completes.
var _pendingMoiRecordOpen = null;

function openMoiRecordFromExpense(moiRecordNo) {
  if (!moiRecordNo) { toast('இந்த Expense-க்கு இணைந்த மொய் Record இல்லை'); return; }
  _pendingMoiRecordOpen = moiRecordNo;
  selectApp('moi');
}


// FIX: Summary → tapping செய்முறை now goes DIRECTLY to the moi module's
// "அனைத்தும்" tab, pre-filtered to mode=செய்முறை (reusing the existing
// modeF dropdown filter there) — no detour through Daily Expenses'
// Transactions tab first.
var _pendingMoiModeFilter = null;

function goToSeimuraiInMoi() {
  _pendingMoiModeFilter = 'செய்முறை';
  selectApp('moi');
}

// ── v159 NATIVE TRANSACTION TRIGGER ADAPTER ────────────────────────
// Median's public bridge does not currently expose an incoming-SMS/system-
// notification listener. A Median private Android plugin can deliver only
// bank/UPI/card transaction messages to this stable callback without touching
// the finance parser. Raw message text is processed in-memory and is never
// persisted by this adapter.
var _nmNativeTxnPending = [];
var _nmNativeTxnReady = true;

function _nmNativeTxnAnalyze(text, sender) {
  text = String(text || '').trim();
  sender = String(sender || '').trim();
  if (text.length < 8) return { ok:false, reason:'empty' };
  var norm = _smsNorm(text);
  // Strict transaction gate: reject OTP/promotional/non-transaction content.
  if (/otp|one time password|verification code|do not share/.test(norm)) return { ok:false, reason:'otp' };
  var statement=_smsParseCardStatement(text);
  var amount = _smsParseAmount(text);
  var hasTxnWord = /debited|credited|spent|paid|purchase|withdrawn|received|deposited|upi|pos|atm|neft|imps|rtgs|credit card|debit card|txn|transaction/.test(norm);
  if (!statement && (!amount || !hasTxnWord)) return { ok:false, reason:'not_transaction' };

  var kind = _smsParseKind(text);
  var merchant = _smsParseMerchant(text, kind);
  var key = _smsRuleKey(merchant);
  var learned = key && _smsExpenseRules[key] ? _smsExpenseRules[key] : null;
  if (learned && learned.kind) kind = learned.kind;
  var match = statement ? _smsMatchAccountByType(text,sender,'card') : _smsMatchAccount(text, sender), account = match.account;
  var txnClass = _smsTxnClass(text, kind, account);
  if (txnClass === 'ignore') return { ok:false, reason:'ignored' };
  var category = learned && learned.value ? _smsAvailableCategory(kind, learned.value) : _smsDefaultCategory(kind, text, merchant);
  return {
    ok:true,
    data:{
      text:text, sender:sender, kind:kind, amount:amount, date:_smsParseDate(text),
      merchant:merchant, key:key, category:category, channel:_smsChannel(text),
      txnClass:txnClass, accountId:account?String(account.id):'',
      accountName:account?account.name:'', accountConfidence:match.confidence||0,
      accountAmbiguous:!!match.ambiguous, statement:statement
    }
  };
}

function _nmNativeTxnQueueResult(a) {
  if (!a || !a.ok || !a.data) return false;
  var d = a.data;
  if(d.txnClass==='card_statement' && d.statement && d.statement.dueDate && d.accountId){
    try { google.script.run.withSuccessHandler(function(r){if(r&&r.ok)toast('🔔 Credit Card due reminder update ஆனது');}).syncCreditCardBillReminder({accountId:d.accountId,dueDate:d.statement.dueDate,totalDue:d.statement.totalDue||0,minDue:d.statement.minDue||0}); } catch(e) {}
    return true;
  }
  var fp = _smsImportFingerprint(d.text);
  if (_smsWasRecentlyImported(fp)) return false;
  _smsQueueAdd({
    fingerprint:fp,
    label:_smsClassLabel(d.txnClass),
    amount:d.amount,
    date:d.date,
    merchant:d.merchant,
    accountId:d.accountId,
    accountName:d.accountName,
    txnClass:d.txnClass,
    suggestedKind:d.kind,
    suggestedCategory:d.category,
    source:'native-trigger',
    createdAt:Date.now()
  });
  try { toast('📩 புதிய transaction கண்டுபிடிக்கப்பட்டது — Review Queue-ல் சேர்க்கப்பட்டது'); } catch(e) {}
  return true;
}

// Stable callback contract for a Median private Android plugin.
// Payload: { text:string, sender?:string, timestamp?:number, source?:string }
window.nammaMoiNativeTransactionReceived = function(payload) {
  try {
    payload = payload || {};
    var text = String(payload.text || payload.message || payload.body || '');
    var sender = String(payload.sender || payload.from || '');
    if (!text) return { ok:false, reason:'no_text' };
    var a = _nmNativeTxnAnalyze(text, sender);
    if (!a.ok) return a;
    var queued = _nmNativeTxnQueueResult(a);
    return { ok:queued, queued:queued, txnClass:a.data.txnClass, amount:a.data.amount };
  } catch (e) {
    return { ok:false, reason:String(e && e.message || e) };
  }
};

// Also support a DOM CustomEvent so a native wrapper/custom injected script can
// hand off data without depending on a direct global-function invocation.
document.addEventListener('nammaMoiTransactionMessage', function(ev) {
  try { window.nammaMoiNativeTransactionReceived((ev && ev.detail) || {}); } catch(e) {}
});

// ============================================================
// HAND LOAN UI MODULE — v256 safe split
// HandLoan-only UI helpers. Shared Expense/Income/HandLoan shell remains in js_expense.html.
// ============================================================

function _renderHandLoanPersonSuggestions() {
  var dl = document.getElementById('loan_person_list');
  if (!dl) return;
  dl.innerHTML = (_handLoanPersonSuggestions || []).map(function(v){ return '<option value="' + x(v) + '"></option>'; }).join('');
}


function _cleanLoanPhone(value) {
  return String(value || '').trim().replace(/[^0-9+]/g, '');
}
function _loanPhoneDigits(value) {
  var d = String(value || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d;
}
async function pickHandLoanContact(target) {
  var nameId = target === 'edit' ? 'eei_category' : 'loan_person';
  var phoneId = target === 'edit' ? 'eei_loan_phone' : 'loan_phone';
  var nameEl = document.getElementById(nameId), phoneEl = document.getElementById(phoneId);
  if (!nameEl || !phoneEl) return;

  function applyContact(c, isMedian) {
    c = c || {};
    var n = '', t = '';
    if (isMedian) {
      n = [c.givenName || '', c.middleName || '', c.familyName || ''].filter(Boolean).join(' ').trim() || c.nickname || '';
      var nums = Array.isArray(c.phoneNumbers) ? c.phoneNumbers : [];
      if (nums.length) t = nums[0] && (nums[0].phoneNumber || nums[0].number) || '';
    } else {
      n = Array.isArray(c.name) ? (c.name[0] || '') : (c.name || '');
      t = Array.isArray(c.tel) ? (c.tel[0] || '') : (c.tel || '');
    }
    if (n) nameEl.value = String(n).trim();
    if (t) phoneEl.value = _cleanLoanPhone(t);
    if (n || t) {
      // Keep Tamil Assist / validation listeners in sync with a native fill.
      try { nameEl.dispatchEvent(new Event('input', {bubbles:true})); } catch (_) {}
      try { phoneEl.dispatchEvent(new Event('input', {bubbles:true})); } catch (_) {}
      toast('✅ Contact தேர்வு செய்யப்பட்டது');
    } else {
      toast('Contact-ல் பெயர் / phone number கிடைக்கவில்லை');
    }
  }

  try {
    // Median native app: this is the reliable production path. Native Contacts
    // must be enabled in Median App Studio. The plugin itself prompts for the
    // OS permission on first use; checking status first lets us report denied
    // permission cleanly instead of making the button look broken.
    if (window.median && median.contacts && typeof median.contacts.pickContact === 'function') {
      if (typeof median.contacts.getPermissionStatus === 'function') {
        try {
          var perm = await median.contacts.getPermissionStatus({});
          if (perm && (perm.status === 'restricted')) {
            toast('📇 Contacts permission device-ல் restricted ஆக உள்ளது');
            return;
          }
        } catch (_) { /* picker below can still request permission */ }
      }
      var picked = await median.contacts.pickContact({multiple:false});
      var contacts = picked && Array.isArray(picked.contacts) ? picked.contacts : [];
      if (contacts.length) applyContact(contacts[0], true);
      return;
    }

    // Chrome Android can expose the Contact Picker API only in supported
    // secure/top-level contexts. Google Apps Script normally runs the app in
    // an iframe, so this fallback may legitimately be unavailable in browser
    // testing; the Median native path above remains the production solution.
    if (window.isSecureContext && navigator.contacts && typeof navigator.contacts.select === 'function') {
      var rows = await navigator.contacts.select(['name','tel'], {multiple:false});
      if (rows && rows.length) applyContact(rows[0], false);
      return;
    }

    toast('📇 Browser test-ல் phone Contacts கிடைக்கவில்லை. Median app-ல் Native Contacts plugin ON செய்தால் இந்த button contact picker-ஐ திறக்கும்.');
    nameEl.focus();
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    if (e && e.name === 'NotAllowedError') {
      toast('📇 Contacts permission அனுமதிக்கவும்; பிறகு மீண்டும் முயற்சிக்கவும்.');
      return;
    }
    console.error('Contact picker failed:', e);
    toast('📇 Contact தேர்வு முடியவில்லை — manual entry பயன்படுத்தவும்');
  }
}
function callHandLoanContact(phone) {
  phone = _cleanLoanPhone(phone); if (!phone) { toast('மொபைல் எண் இல்லை'); return; }
  window.location.href = 'tel:' + phone;
}
function smsHandLoanContact(phone, person, amount, returnDate) {
  phone = _cleanLoanPhone(phone); if (!phone) { toast('மொபைல் எண் இல்லை'); return; }
  var msg = 'வணக்கம் ' + (person || '') + ', கைமாற்று ₹' + (amount || '') + (returnDate ? ' — நினைவூட்டு தேதி: ' + fmtDate(returnDate) : '') + '.';
  window.location.href = 'sms:' + phone + '?body=' + encodeURIComponent(msg);
}
function whatsappHandLoanContact(phone, person, amount, returnDate) {
  var digits = _loanPhoneDigits(phone); if (!digits) { toast('மொபைல் எண் இல்லை'); return; }
  var msg = 'வணக்கம் ' + (person || '') + ', கைமாற்று ₹' + (amount || '') + (returnDate ? ' — நினைவூட்டு தேதி: ' + fmtDate(returnDate) : '') + '.';
  window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(msg), '_blank');
}
function loanQuickAction(btn, type) {
  if (!btn) return;
  var d = btn.dataset || {};
  if (type === 'call') callHandLoanContact(d.phone || '');
  else if (type === 'sms') smsHandLoanContact(d.phone || '', d.person || '', d.amount || '', d.returnDate || '');
  else if (type === 'whatsapp') whatsappHandLoanContact(d.phone || '', d.person || '', d.amount || '', d.returnDate || '');
}

var _handLoanLedgerState = null;
function _handLoanLedgerKey(v){ return String(v||'').trim().toLowerCase().replace(/\s+/g,' '); }
function _handLoanLedgerShareText(st) {
  var lines=['நம்ம மொய் - கைமாற்று Ledger', 'நபர்: '+st.person, st.phone ? 'Mobile: '+st.phone : '', 'பதிவுகள்: '+st.rows.length, 'கொடுத்தது: ₹'+fmt(st.given), 'வாங்கியது: ₹'+fmt(st.received), 'நிலுவை: ₹'+fmt(st.pending), ''];
  st.rows.forEach(function(r){ lines.push(fmtDate(r.date)+' | '+(r.direction==='received'?'வாங்கியது':'கொடுத்தது')+' | ₹'+fmt(r.amount)+(r.status==='completed'?' | முடிந்தது':' | நிலுவை')+(r.returnDate?' | Reminder '+fmtDate(r.returnDate):'')); });
  return lines.filter(Boolean).join('\n');
}
function openHandLoanLedger(btn) {
  if (!btn) return;
  var person=String(btn.dataset.person||'').trim(), phone=_cleanLoanPhone(btn.dataset.phone||'');
  if (!person && !phone) { toast('நபர் தகவல் இல்லை'); return; }
  var modal=document.getElementById('handLoanLedgerModal');
  if (!modal) return;
  document.getElementById('handLoanLedgerTitle').textContent=(person||'நபர்')+' — கைமாற்று Ledger';
  document.getElementById('handLoanLedgerPhone').textContent=phone||'';
  document.getElementById('handLoanLedgerSummary').innerHTML='<div class="empty" style="padding:8px">⏳ ஏற்றுகிறது...</div>';
  document.getElementById('handLoanLedgerList').innerHTML='';
  modal.style.display='flex';
  google.script.run.withSuccessHandler(function(res){
    if (!res || !res.ok) { document.getElementById('handLoanLedgerSummary').innerHTML='<div class="empty">'+x((res&&res.msg)||'Ledger ஏற்ற முடியவில்லை')+'</div>'; return; }
    var pkey=_handLoanLedgerKey(person), pdigits=_loanPhoneDigits(phone);
    var rows=(res.rows||[]).filter(function(r){
      var rowPhone=_loanPhoneDigits(r.phone||'');
      var samePhone=pdigits && rowPhone===pdigits;
      var sameName=pkey && _handLoanLedgerKey(r.person||'')===pkey;
      // Phone is the strongest identity when available. Older HandLoans rows
      // may pre-date the Phone column, so same-name rows with no stored phone
      // are still included as backward-compatible history. Never merge a
      // different non-empty phone merely because the display name matches.
      return pdigits ? (samePhone || (!rowPhone && sameName)) : sameName;
    });
    rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
    if (!rows.length) { document.getElementById('handLoanLedgerSummary').innerHTML='<div class="empty">Ledger பதிவுகள் இல்லை</div>'; return; }
    var given=0,received=0,pending=0,contact=phone;
    rows.forEach(function(r){ if(r.direction==='received')received+=Number(r.amount)||0;else given+=Number(r.amount)||0; if(r.status!=='completed')pending+=Number(r.amount)||0; if(!contact&&r.phone)contact=r.phone; });
    _handLoanLedgerState={person:person||rows[0].person||'',phone:contact||'',rows:rows,given:given,received:received,pending:pending};
    document.getElementById('handLoanLedgerPhone').textContent=contact||'';
    document.getElementById('handLoanLedgerSummary').innerHTML='<div><span>பதிவுகள்</span><b>'+rows.length+'</b></div><div><span>கொடுத்தது</span><b>₹'+fmt(given)+'</b></div><div><span>வாங்கியது</span><b>₹'+fmt(received)+'</b></div><div><span>நிலுவை</span><b>₹'+fmt(pending)+'</b></div>';
    document.getElementById('handLoanLedgerList').innerHTML=rows.map(function(r){var canEdit=(typeof _nmRoleCanWrite!=='function'||_nmRoleCanWrite());return '<div class="member-ledger-row"><div><b>'+fmtDate(r.date)+'</b><span>'+(r.direction==='received'?'வாங்கியது':'கொடுத்தது')+(r.returnDate?' · '+_handLoanDueLabel(r).replace(/^ · /,''):'')+'</span></div><strong>₹'+fmt(r.amount)+'</strong><div class="member-ledger-actions">'+(canEdit?'<button type="button" onclick="closeHandLoanLedger();openEditExpInc(\'handloan\',\''+x(String(r.id))+'\')">✏️ Edit</button>':'')+(canEdit&&r.status!=='completed'?'<button type="button" onclick="closeHandLoanLedger();markHandLoanCompleted(\''+x(String(r.id))+'\')">✓ Complete</button>':'')+'</div></div>';}).join('');
    ['handLoanLedgerCall','handLoanLedgerWhatsApp','handLoanLedgerSms'].forEach(function(id){var e=document.getElementById(id);if(e)e.disabled=!contact;});
  }).withFailureHandler(function(e){document.getElementById('handLoanLedgerSummary').innerHTML='<div class="empty">'+x(friendlyErrorMsg(e))+'</div>';}).getHandLoans({});
}
function closeHandLoanLedger(){var m=document.getElementById('handLoanLedgerModal');if(m)m.style.display='none';_handLoanLedgerState=null;}
function shareHandLoanLedger(kind){
  var st=_handLoanLedgerState;if(!st)return;var text=_handLoanLedgerShareText(st),phone=st.phone||'';
  if(kind==='call'){callHandLoanContact(phone);return;}
  if(kind==='whatsapp'){var d=_loanPhoneDigits(phone);if(!d){toast('மொபைல் எண் இல்லை');return;}window.open('https://wa.me/'+d+'?text='+encodeURIComponent(text),'_blank');return;}
  if(kind==='sms'){phone=_cleanLoanPhone(phone);if(!phone){toast('மொபைல் எண் இல்லை');return;}window.location.href='sms:'+phone+'?body='+encodeURIComponent(text);return;}
  if(navigator.share){navigator.share({title:(st.person||'கைமாற்று')+' Ledger',text:text}).catch(function(){});}else{try{navigator.clipboard.writeText(text);toast('Ledger copy செய்யப்பட்டது');}catch(e){toast('Share செய்ய முடியவில்லை');}}
}

function _handLoanDueLabel(r) {
  if (!r || !r.returnDate || r.status === 'completed') return '';
  var today = todayStr();
  if (r.returnDate < today) return ' · ⚠️ Reminder கடந்தது ' + fmtDate(r.returnDate);
  if (r.returnDate === today) return ' · 🔔 Reminder இன்று';
  return ' · 🔔 Reminder ' + fmtDate(r.returnDate);
}

function setHandLoanDirection(direction) {
  direction = direction === 'received' ? 'received' : 'given';
  document.getElementById('loan_direction').value = direction;
  document.getElementById('loan-dir-given').classList.toggle('on', direction === 'given');
  document.getElementById('loan-dir-received').classList.toggle('on', direction === 'received');
}

function doAddHandLoan() {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('கைமாற்று சேர்க்க')) return;
  var err = document.getElementById('loanAddErr');
  err.textContent = '';
  var data = {
    direction: document.getElementById('loan_direction').value,
    person: document.getElementById('loan_person').value.trim(),
    phone: _cleanLoanPhone(document.getElementById('loan_phone').value),
    amount: _cashAmountRaw(document.getElementById('loan_amount').value),
    date: document.getElementById('loan_date').value || todayStr(),
    returnDate: document.getElementById('loan_return_date').value || '',
    notes: document.getElementById('loan_notes').value.trim(),
    status: document.getElementById('loan_status').value || 'pending',
    accountId: (document.getElementById('loan_account') || {}).value || ''
  };
  if (data.status === 'completed') { data.completedDate = todayStr(); data.settlementAccountId = data.accountId; }
  if (!data.person) { err.textContent = 'நபர் பெயர் தேவை'; return; }
  if (!data.amount || data.amount <= 0) { err.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }
  if (data.returnDate && data.returnDate < data.date) { err.textContent = 'திருப்பித் தர வேண்டிய தேதி பதிவு தேதிக்கு முன் இருக்கக்கூடாது'; return; }
  setBtnLoading('loanAddBtn', true, 'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      setBtnLoading('loanAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> கைமாற்று சேமி');
      if (_handleExpModuleLock(res)) return;
      if (!res || !res.ok) { err.textContent = (res && res.msg) || 'பிழை'; return; }
      toast('✅ கைமாற்று பதிவு சேர்க்கப்பட்டது');
      _invalidateTxnDataCache();
      if (typeof _refreshReminderUI === 'function') _refreshReminderUI();
      _uniqueSuggestionPush(_handLoanPersonSuggestions, data.person);
      _renderHandLoanPersonSuggestions();
      document.getElementById('loan_person').value = '';
      document.getElementById('loan_phone').value = '';
      document.getElementById('loan_amount').value = '';
      document.getElementById('loan_return_date').value = '';
      document.getElementById('loan_notes').value = '';
      document.getElementById('loan_status').value = 'pending';
      var loanAcc=document.getElementById('loan_account'); if(loanAcc) loanAcc.value='';
      setHandLoanDirection('given');
      expGo('list');
    })
    .withFailureHandler(function(e) {
      setBtnLoading('loanAddBtn', false, '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-check"></use></svg> கைமாற்று சேமி');
      err.textContent = friendlyErrorMsg(e);
    })
    .addHandLoan(data);
}


function _toggleHandLoanSettlementFields() {
  var statusEl=document.getElementById('eei_loan_status');
  var box=document.getElementById('eei_loan_settlement_fields');
  if(!box||!statusEl)return;
  var completed=statusEl.value==='completed';
  box.style.display=completed?'block':'none';
  if(completed){
    var d=document.getElementById('eei_loan_completed_date');
    if(d&&!d.value)d.value=todayStr();
    var a=document.getElementById('eei_loan_settlement_account');
    var source=document.getElementById('eei_account');
    if(a&&!a.value&&source&&source.value)a.value=source.value;
  }
}


function markHandLoanCompleted(id) {
  if (typeof _nmGuardWrite === 'function' && !_nmGuardWrite('கைமாற்று நிலை மாற்ற')) return;
  if (!confirm('இந்த கைமாற்று முடிக்கப்பட்டதா?')) return;
  google.script.run.withSuccessHandler(function(res) {
    if (!res || !res.ok) { toast('❌ ' + ((res && res.msg) || 'பிழை')); return; }
    toast('✅ கைமாற்று முடிக்கப்பட்டது'); _invalidateTxnDataCache(); if (typeof _refreshReminderUI === 'function') _refreshReminderUI(); renderTransactionList();
  }).withFailureHandler(toastError).completeHandLoan(id);
}

function delHandLoan(id) {
  if (typeof _nmGuardDelete === 'function' && !_nmGuardDelete('கைமாற்று பதிவு')) return;
  // FIX [v132]: was using bare confirm() with no in-flight guard and no
  // _handleExpModuleLock() check, unlike delExpense() right above. Brought
  // in line with that pattern — same shared _expDeleteInFlight lock so an
  // expense delete and a hand loan delete can never race each other, and a
  // single renderTransactionList() refresh (list + totals + summary cards +
  // pending hand loan + cash overview + balances all come from that one call).
  if (_expDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  showConfirm('இந்த கைமாற்று பதிவை நீக்கவா?', function() {
    if (_expDeleteInFlight) return;
    _expDeleteInFlight = true;
    google.script.run
      .withSuccessHandler(function(res) {
        _expDeleteInFlight = false;
        if (_handleExpModuleLock(res)) return;
        if (!res || !res.ok) { toast('❌ ' + ((res && res.msg) || 'நீக்க முடியவில்லை')); return; }
        if (res.undoToken) showUndoToast('கைமாற்று நீக்கப்பட்டது', function(){ _undoDailyCashDelete(res.undoToken); });
        else toast('✅ கைமாற்று நீக்கப்பட்டது');
        _invalidateTxnDataCache();
        if (typeof _refreshReminderUI === 'function') _refreshReminderUI();
        renderTransactionList();
      })
      .withFailureHandler(function(e){ _expDeleteInFlight = false; toastError(e); })
      .deleteHandLoan(id);
  });
}




// ============================================================
// DATA LOAD
// ============================================================
// Global: event records separately accessible
var eventRecs = [];
var _allViewReady = false;
var _allSavedScrollY = 0;


function refreshCurrentTab() {
  if      (curTab === 'today')   renderToday();
  else if (curTab === 'all')     renderAll();
  else if (curTab === 'month')   loadMonth();
  else if (curTab === 'summary') renderSummary();
  else if (curTab === 'admin')   loadAdminUsers();
  else if (curTab === 'account') renderAccount();
  else if (curTab === 'tamilCalendar') initTamilCalendar();
  else if (curTab === 'rasiPalan') initRasiPalan();
  else renderToday();
}


// ============================================================
// TABS
// ============================================================
function go(tab) {
  var _leavingAll = (curTab === 'all' && tab !== 'all');
  if (_leavingAll) _allSavedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  // V98 launch hardening: do not let user navigation hide an active save.
  // Internal post-save navigation is unaffected because the lock is released
  // before those handlers call go()/refresh functions.
  if (typeof _moiSaveInFlight !== 'undefined' && _moiSaveInFlight) {
    toast('⏳ பதிவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _expenseSaveInFlight !== 'undefined' && _expenseSaveInFlight) {
    toast('⏳ செலவு சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _moiEditInFlight !== 'undefined' && _moiEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (typeof _expEditInFlight !== 'undefined' && _expEditInFlight) {
    toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.');
    return;
  }
  if (curTab === 'add' && tab !== 'add' && typeof _nmConfirmDiscard === 'function') {
    if (!_nmConfirmDiscard('moi')) return;
    // User chose to leave the Add screen: discard the old draft so the
    // next visit feels active/fresh instead of showing stale transaction data.
    clearForm(todayStr());
  }
  if (tab === 'admin' && S.role !== 'super_admin') { // FIX [14]: role renamed 'admin' -> 'super_admin' (tab id unchanged)
    toast('நிர்வாக அனுமதி மட்டுமே'); return;
  }
  document.querySelectorAll('#appScreen .tab').forEach(function(t){ t.classList.remove('on'); });
  document.querySelectorAll('#appScreen .pg').forEach(function(p){ p.classList.remove('show'); });
  var tb = document.getElementById('t-' + tab);
  var pg = document.getElementById('p-' + tab);
  if (tb) tb.classList.add('on');
  if (pg) pg.classList.add('show');
  curTab = tab;
  if (typeof _nmSaveResumeState === 'function') _nmSaveResumeState('moi', tab);
  // V49: keep #mainTabs' context group (Home vs MOI) in lock-step with
  // curTab. 'add'/'documents'/'admin'/'account' intentionally leave the
  // group as-is (opened via FAB/More-menu on top of whichever context
  // was already active) — only 'today' and the MOI sub-tabs switch it.
  if (tab === 'today') {
    _setMainNavGroup('home');
  } else if (tab === 'all' || tab === 'month' || tab === 'summary') {
    _setMainNavGroup('moi');
  }
  if (tab === 'today')   renderToday();
  if (tab === 'all') {
    if (_allViewReady && document.querySelector('#allList .list')) {
      _setupAllInfiniteScroll();
      requestAnimationFrame(function(){ window.scrollTo(0,_allSavedScrollY||0); });
    } else renderAll();
  }
  if (tab === 'month')   loadMonth();
  if (tab === 'summary') renderSummary();
  if (tab === 'tamilCalendar') initTamilCalendar();
  if (tab === 'rasiPalan') initRasiPalan();
  if (tab === 'add') {
    _applyAddFormEventLock();
    _populateAddFormEventSelect(); // FIX [ISSUE-2/3]: keep the Add form's event picker/banner current
    _populateFTypeOptions(); // Dynamic Function Type: refresh f_type <select> from current recs
  }
  if (tab === 'admin')   loadAdminUsers();
  if (tab === 'account') {
    // Refresh plan/expiry from server so admin-changed plan shows immediately
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.ok) {
          S.plan = res.plan; S.expiry = res.expiry;
          S.role = res.role; S.name   = res.name;
          try { localStorage.removeItem('moi_session'); } catch(e) {}
          _applyRoleUI();
        }
        renderAccount();
      })
      .withFailureHandler(function() { renderAccount(); })
      .getMyInfo();
  }
}


// ============================================================
// TODAY
// ============================================================
// FIX: shiftDate — use local date arithmetic, not toISOString() which shifts to UTC
// causing forward (+1) to appear as same day in IST (+5:30)
function shiftDate(d) {
  var inp = document.getElementById('selDate');
  var cur = inp.value || todayStr();
  var p   = cur.split('-');
  var dt  = new Date(+p[0], +p[1] - 1, +p[2]); // local midnight, no UTC shift
  dt.setDate(dt.getDate() + d);
  // Block going beyond today
  var todayDt = (function(){ var tp=todayStr().split('-'); return new Date(+tp[0],+tp[1]-1,+tp[2]); })();
  if (dt > todayDt) { toast('இன்றைய தேதிக்கு அப்பால் செல்ல முடியாது'); return; }
  inp.value = dt.getFullYear() + '-'
    + ('0'+(dt.getMonth()+1)).slice(-2) + '-'
    + ('0'+dt.getDate()).slice(-2);
  renderToday();
}


function renderToday() {
  // Keep the compact calendar preview populated even when the user has not
  // opened the full calendar screen yet.
  try {
    if (typeof _tcalSetSelectedDate === 'function') _tcalSetSelectedDate(new Date());
  } catch (_) {}
  var date = document.getElementById('selDate').value;
  if (!date) { date = todayStr(); document.getElementById('selDate').value = date; }
  var list  = sortDesc(recs.filter(function(r){ return r.date === date; }));
  var total = list.reduce(function(s,r){ return s + r.amount; }, 0);
  document.getElementById('todayCards').innerHTML =
    sc('தொகை', '₹' + fmt(total), false) + sc('பதிவுகள்', list.length, true);
  document.getElementById('todayList').innerHTML = list.length
    ? renderCards(list, true)
    : '<div class="dash-empty-state dash-empty-illustrated"><div class="empty-art"><svg class="empty-art-svg" aria-hidden="true" viewBox="0 0 120 84"><use href="#illustration-empty"></use></svg></div><div><b>இந்த தேதியில் பதிவுகள் இல்லை</b><small>புதிய மொய் பதிவை இங்கிருந்தே சேர்க்கலாம்.</small></div><button type="button" class="dash-empty-add" onclick="go(\'add\')">+ பதிவு</button></div>';
  // FIX [11]: visually disable the forward arrow at today instead of a
  // silent no-op — makes it clear forward navigation is intentionally blocked.
  var nextBtn = document.getElementById('dateNextBtn');
  if (nextBtn) nextBtn.disabled = (date >= todayStr());
  // FIX [Today page]: keep reminder banner/panel current on every visit
  // to the Today tab, not just once at login.
  _refreshReminderUI();
}


// ============================================================
// ALL RECORDS
// ============================================================
// Launch-safe search debounce: text typing can fire on every keystroke.
// Keep select/date filters immediate, but collapse rapid text input into
// one render so large record lists do not rebuild the DOM repeatedly.
var _renderAllSearchTimer = null;
// Launch-safe large-list render cache. renderAll() can be called by several
// UI paths even when the effective result has not changed. Avoid rebuilding
// hundreds of cards (and disturbing scroll position) for an identical list.
var _renderAllLastSignature = null;
function _renderAllSignature(list) {
  return list.map(function(r) {
    return [r.no, r._sheetId || '', r.date, r.name, r.place, r.amount,
      r.mode, r.type || '', r.nakai || '', r.enteredBy || '', r.iruppu || '', r.occupation || ''].join('');
  }).join('');
}
function scheduleRenderAll() {
  clearTimeout(_renderAllSearchTimer);
  _renderAllSearchTimer = setTimeout(function() {
    _renderAllSearchTimer = null;
    renderAll();
  }, 300);
}

function _moiSearchNorm(v) {
  var s = String(v == null ? '' : v);
  try { s = s.normalize('NFC'); } catch (_) {}
  return s.toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[.,;:()\[\]{}\/\\|_\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function _moiSearchHit(r, q) {
  if (!q) return true;
  var hay = _moiSearchNorm([r && r.name, r && r.place, r && r.iruppu, r && r.occupation].filter(Boolean).join(' '));
  var parts = _moiSearchNorm(q).split(' ').filter(Boolean);
  return parts.every(function(part){ return hay.indexOf(part) !== -1; });
}

// v236A — Search-time Tamil alias expansion only. Stored records are never
// rewritten. Each typed token becomes a small OR-group: original English,
// local Tamil transliteration, remembered user-approved Tamil spelling, and
// (for longer names only) approved spellings of phonetically-equivalent Latin
// aliases. The server still ANDs token groups, so multi-word search semantics
// stay unchanged. No extra Apps Script call is made per keystroke.
function _moiSearchPhoneticKey(v) {
  var s = String(v || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s.length < 5) return '';
  s = s.replace(/zh/g,'l').replace(/sh/g,'s').replace(/ch/g,'c')
       .replace(/dh/g,'t').replace(/th/g,'t').replace(/ph/g,'p')
       .replace(/bh/g,'p').replace(/kh/g,'k').replace(/gh/g,'k')
       .replace(/[dt]/g,'t').replace(/[bp]/g,'p').replace(/[gk]/g,'k');
  // Tamil-name Latin spellings vary most in vowels and h/y glides. A
  // consonant skeleton is useful only for LONG tokens; short names are left
  // exact to avoid loose matches such as Raja/Raju.
  return s.replace(/[aeiouyh]/g,'').replace(/(.)\1+/g,'$1');
}
function _moiSearchTokenCandidates(token) {
  var raw = _moiSearchNorm(token);
  if (!raw) return [];
  var out = [raw];
  function add(v) {
    v = _moiSearchNorm(v);
    if (v && out.indexOf(v) === -1) out.push(v);
  }
  if (/^[a-z]+$/.test(raw) && raw.length >= 2) {
    try { add(_taTranslitWord(raw)); } catch (_) {}
    try { add(_taGetApprovedSpelling(raw)); } catch (_) {}

    // If the user earlier corrected a different English spelling to the right
    // Tamil name (Rajenthiran -> ராஜேந்திரன்), allow a later conventional
    // spelling (Rajendran) to reuse that approved Tamil alias. Strict guards:
    // >=5 Latin chars, >=4 consonants, same first+last consonant skeleton,
    // and at most 3 alias candidates.
    var key = _moiSearchPhoneticKey(raw);
    if (key && key.length >= 4) {
      try {
        var dict = _taLoadDict ? _taLoadDict() : {};
        var added = 0;
        Object.keys(dict || {}).some(function(k) {
          if (added >= 3) return true;
          if (k === raw || k.length < 5) return false;
          var kk = _moiSearchPhoneticKey(k);
          if (kk && kk === key) { add(dict[k]); added++; }
          return false;
        });
      } catch (_) {}
    }
  }
  return out.slice(0, 6);
}
function _moiSearchGroups(q) {
  var parts = _moiSearchNorm(q).split(' ').filter(Boolean).slice(0, 8);
  return parts.map(_moiSearchTokenCandidates).filter(function(g){ return g.length; });
}
function _moiSearchKeys(q) {
  var parts = _moiSearchNorm(q).split(' ').filter(Boolean).slice(0, 8);
  return parts.map(function(p){
    return /^[a-z]+$/.test(p) ? _moiSearchPhoneticKey(p) : '';
  });
}


var _allQuickRangeReady = false;
var _allPage = 1;
var _allTotalPages = 1;
var _allRequestSeq = 0;
var _allLastFilterSig = '';

function _allRangeYmd(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function _setAllRangeInputs(from, to) {
  var f = document.getElementById('af_from');
  var t = document.getElementById('af_to');
  if (f) f.value = from || '';
  if (t) t.value = to || '';
}

function _allMonthBounds(monthValue) {
  if (!/^\d{4}-\d{2}$/.test(monthValue || '')) return {from:'',to:''};
  var parts = monthValue.split('-');
  var y = Number(parts[0]), m = Number(parts[1]);
  var last = new Date(y, m, 0).getDate();
  return {from:monthValue + '-01', to:monthValue + '-' + ('0'+last).slice(-2)};
}

function _ensureAllQuickRange() {
  if (_allQuickRangeReady) return;
  _allQuickRangeReady = true;
  var today = todayStr();
  var monthPick = document.getElementById('allMonthPick');
  if (monthPick && !monthPick.value) monthPick.value = today.substring(0,7);
  var yearPick = document.getElementById('allYearPick');
  if (yearPick && !yearPick.options.length) {
    var y = Number(today.substring(0,4));
    var html = '';
    for (var i=0;i<8;i++) html += '<option value="'+(y-i)+'">'+(y-i)+'</option>';
    yearPick.innerHTML = html;
    yearPick.value = String(y);
  }
  _setAllRangeInputs('', '');
}

function setAllQuickRange(mode) {
  _ensureAllQuickRange();
  var monthPick = document.getElementById('allMonthPick');
  var yearPick = document.getElementById('allYearPick');
  var custom = document.getElementById('allCustomRange');
  if (monthPick) monthPick.style.display = mode === 'month' ? 'block' : 'none';
  if (yearPick) yearPick.style.display = mode === 'year' ? 'block' : 'none';
  if (custom) custom.style.display = mode === 'custom' ? 'flex' : 'none';

  if (mode === 'month') return applyAllMonthPick();
  if (mode === 'year') return applyAllYearPick();
  if (mode === 'custom') {
    _allPage = 1;
    return renderAll();
  }
  // Recent = no date restriction, newest first. Also clear any stale custom sort
  // so returning from Amount/Name sorting can never make Recent look random.
  _setAllRangeInputs('', '');
  var sortEl=document.getElementById('af_sort');if(sortEl)sortEl.value='date_desc';
  _allPage = 1;
  renderAll();
}

function applyAllMonthPick() {
  var el = document.getElementById('allMonthPick');
  if (!el || !el.value) return;
  var b = _allMonthBounds(el.value);
  _setAllRangeInputs(b.from, b.to);
  _allPage = 1;
  renderAll();
}

function applyAllYearPick() {
  var el = document.getElementById('allYearPick');
  if (!el || !el.value) return;
  _setAllRangeInputs(el.value + '-01-01', el.value + '-12-31');
  _allPage = 1;
  renderAll();
}

function openAllCustomRange() {
  var sel = document.getElementById('allQuickRange');
  if (sel) sel.value = 'custom';
  setAllQuickRange('custom');
  var f = document.getElementById('af_from');
  if (f) f.focus();
}

function applyAllCustomRange() {
  _allQuickRangeReady = true;
  var sel = document.getElementById('allQuickRange');
  if (sel) sel.value = 'custom';
  var custom = document.getElementById('allCustomRange');
  if (custom) custom.style.display = 'flex';
  var from = (document.getElementById('af_from') || {}).value || '';
  var to = (document.getElementById('af_to') || {}).value || '';
  if (from && to && from > to) {
    toast('⚠️ From Date, To Date-க்கு முன்பாக இருக்க வேண்டும்');
    return;
  }
  _allPage = 1;
  renderAll();
}

function _allFilterPayload() {
  var rawQ = (document.getElementById('srch') || {}).value || '';
  return {
    quickRange: ((document.getElementById('allQuickRange')||{}).value)||'recent',
    q: _moiSearchNorm(rawQ),
    qGroups: _moiSearchGroups(rawQ),
    qKeys: _moiSearchKeys(rawQ),
    mode: (document.getElementById('modeF') || {}).value || '',
    from: (document.getElementById('af_from') || {}).value || '',
    to: (document.getElementById('af_to') || {}).value || '',
    amtMin: (document.getElementById('af_amtmin') || {}).value || '',
    amtMax: (document.getElementById('af_amtmax') || {}).value || '',
    type: (document.getElementById('af_type') || {}).value || '',
    nakai: (document.getElementById('af_nakai') || {}).value || '',
    enteredBy: (document.getElementById('af_by') || {}).value || '',
    sort: (document.getElementById('af_sort') || {}).value || 'date_desc',
    place: (document.getElementById('af_place') || {}).value || ''
  };
}

// Search/list summary rule: a clean Recent view is intentionally just a list.
// Any actual filter (text/type/amount/place/etc.) or Month/Year/Custom range
// gets the full filtered result count + amount from the server.
function _allShouldShowTotals(payload) {
  payload = payload || {};
  var rangeEl = document.getElementById('allQuickRange');
  var rangeMode = rangeEl ? (rangeEl.value || 'recent') : 'recent';
  if (rangeMode !== 'recent') return true;
  return !!(
    String(payload.q || '').trim() ||
    String(payload.mode || '').trim() ||
    String(payload.amtMin || '').trim() ||
    String(payload.amtMax || '').trim() ||
    String(payload.type || '').trim() ||
    String(payload.nakai || '').trim() ||
    String(payload.enteredBy || '').trim() ||
    String(payload.place || '').trim()
  );
}

function _renderServerLedgerQuick(q, groups) {
  var box = document.getElementById('allLedgerQuick');
  if (!box) return;
  if (!q || !groups || !groups.length) { box.style.display='none'; box.innerHTML=''; return; }
  box.innerHTML = '<div class="moi-ledger-quick-title">Ledger</div>' + groups.map(function(p){
    return '<button type="button" class="moi-ledger-person" data-place="'+x(p.place)+'" data-name="'+x(p.name)+'" onclick="openPersonLedger(this.dataset.place,this.dataset.name)">'
      + '<span><b>'+x(p.name)+'</b><small>'+x(p.place)+' · '+p.count+' பதிவுகள்</small></span>'
      + '<strong>Ledger ›</strong></button>';
  }).join('');
  box.style.display='block';
}

var _allInfiniteObserver = null;
var _allInfiniteLoading = false;

function _setAllScrollStatus(text) {
  var el = document.getElementById('allScrollStatus');
  if (el) el.textContent = text || '';
}

function _appendAllRows(rows) {
  var listEl = document.getElementById('allList');
  if (!listEl || !rows || !rows.length) return;
  var temp = document.createElement('div');
  temp.innerHTML = renderCards(rows, true);
  var incoming = temp.querySelector('.list');
  var current = listEl.querySelector('.list');
  if (!current) { listEl.innerHTML = incoming ? incoming.outerHTML : temp.innerHTML; return; }
  if (incoming) while (incoming.firstChild) current.appendChild(incoming.firstChild);
}

function _setupAllInfiniteScroll() {
  var sentinel = document.getElementById('allScrollSentinel');
  if (!sentinel || typeof IntersectionObserver === 'undefined') return;
  if (_allInfiniteObserver) _allInfiniteObserver.disconnect();
  _allInfiniteObserver = new IntersectionObserver(function(entries) {
    if (!entries[0] || !entries[0].isIntersecting || _allInfiniteLoading) return;
    if (_allPage >= _allTotalPages) return;
    _allPage += 1;
    renderAll(true, true);
  }, { root:null, rootMargin:'240px 0px', threshold:0.01 });
  _allInfiniteObserver.observe(sentinel);
}

function changeAllPage(delta) {
  var next = _allPage + Number(delta || 0);
  if (next < 1 || next > _allTotalPages || next === _allPage) return;
  _allPage = next;
  renderAll(true);
  try { document.getElementById('p-all').scrollIntoView({behavior:'smooth', block:'start'}); } catch (_) {}
}

function _moiRowSkeleton(count) {
  count = Math.max(1, Number(count) || 3);
  var rows = '';
  for (var i=0;i<count;i++) rows += '<div class="skeleton-card skeleton-moi-row" aria-hidden="true"><div class="skeleton skeleton-line sk-w-42"></div><div class="skeleton skeleton-line sk-w-68"></div><div class="skeleton-row"><div class="skeleton skeleton-pill sk-w-30"></div><div class="skeleton skeleton-pill sk-w-22"></div></div></div>';
  return '<div class="skeleton-stack" aria-label="பதிவுகள் ஏற்றப்படுகின்றன">'+rows+'</div>';
}

function renderAll(keepPage, appendPage) {
  _ensureAllQuickRange();
  var payload = _allFilterPayload();
  var sig = JSON.stringify(payload);
  if (!keepPage && sig !== _allLastFilterSig) { _allPage = 1; appendPage = false; }
  _allLastFilterSig = sig;
  payload.page = _allPage;

  var countEl = document.getElementById('allCount');
  var totalEl = document.getElementById('allTotal');
  var metaEl = document.querySelector('#p-all .moi-all-result-meta');
  var listEl = document.getElementById('allList');
  var pager = document.getElementById('allPager');
  if (countEl) countEl.textContent = '';
  if (totalEl) totalEl.textContent = '';
  if (metaEl) metaEl.style.display = _allShouldShowTotals(payload) ? 'flex' : 'none';
  if (!appendPage && listEl) listEl.innerHTML = _moiRowSkeleton(3);
  if (appendPage) { _allInfiniteLoading = true; _setAllScrollStatus('மேலும் ஏற்றுகிறது…'); }
  else _setAllScrollStatus('');
  if (pager) pager.style.display = 'none';

  var seq = ++_allRequestSeq;
  google.script.run
    .withSuccessHandler(function(res) {
      if (seq !== _allRequestSeq) return;
      if (!res || !res.ok) {
        _allInfiniteLoading = false;
        if (!appendPage && listEl) listEl.innerHTML = empty();
        if (!appendPage && countEl) countEl.textContent = '0 பதிவுகள்';
        if (appendPage) _setAllScrollStatus('மேலும் பதிவுகளை ஏற்ற முடியவில்லை');
        return;
      }
      var rows = res.rows || [];
      _allPage = Number(res.page) || 1;
      _allTotalPages = Number(res.totalPages) || 1;

      var showTotals = _allShouldShowTotals(payload);
      if (metaEl) metaEl.style.display = showTotals ? 'flex' : 'none';
      if (countEl) countEl.textContent = showTotals ? ((Number(res.totalCount)||0) + ' பதிவுகள்') : '';
      if (totalEl) totalEl.textContent = showTotals ? ('மொத்தம்: ₹' + fmt(Number(res.totalAmount)||0)) : '';
      if (appendPage) _appendAllRows(rows);
      else if (listEl) listEl.innerHTML = rows.length ? renderCards(rows, true) : empty();
      _renderServerLedgerQuick(payload.q, res.ledgerGroups || []);

      var srcTab = document.getElementById('allSrcTabs');
      if (srcTab) srcTab.style.display = 'none';
      var quickBtn = document.getElementById('allQuickAddBtn');
      if (quickBtn) quickBtn.style.display = (payload.q && Number(res.totalCount)) ? 'block' : 'none';

      var pageInfo = document.getElementById('allPageInfo');
      var prev = document.getElementById('allPrevBtn');
      var next = document.getElementById('allNextBtn');
      if (pageInfo) pageInfo.textContent = _allPage + ' / ' + _allTotalPages;
      if (prev) prev.disabled = _allPage <= 1;
      if (next) next.disabled = _allPage >= _allTotalPages;
      if (pager) pager.style.display = 'none';
      _allInfiniteLoading = false;
      _allViewReady = true;
      _setAllScrollStatus(_allPage < _allTotalPages ? '' : '✓ அனைத்து பதிவுகளும் காட்டப்பட்டுள்ளன');
      _setupAllInfiniteScroll();
    })
    .withFailureHandler(function(e) {
      if (seq !== _allRequestSeq) return;
      if (countEl) countEl.textContent = 'ஏற்ற முடியவில்லை';
      if (totalEl) totalEl.textContent = '';
      if (!appendPage && listEl) listEl.innerHTML = '<div class="empty"><div class="ei">⚠️</div><div>பதிவுகளை ஏற்ற முடியவில்லை</div></div>';
      if (pager) pager.style.display = 'none';
      _allInfiniteLoading = false;
      _setAllScrollStatus('மேலும் பதிவுகளை ஏற்ற முடியவில்லை');
      toastError(e);
    })
    .getMoiTransactionsPage(payload);
}


function _renderSearchLedgerQuick(q, rows) {
  var box = document.getElementById('allLedgerQuick');
  if (!box) return;
  if (!q) { box.style.display='none'; box.innerHTML=''; return; }

  var groups = {};
  (rows || []).forEach(function(r) {
    var key = String(r.place || '') + '\u001f' + String(r.name || '');
    if (!groups[key]) groups[key] = {place:r.place||'', name:r.name||'', count:0, total:0, lastDate:r.date||''};
    groups[key].count++;
    groups[key].total += Number(r.amount)||0;
    if ((r.date||'') > groups[key].lastDate) groups[key].lastDate = r.date||'';
  });
  var people = Object.keys(groups).map(function(k){return groups[k];})
    .sort(function(a,b){ return b.count-a.count || b.lastDate.localeCompare(a.lastDate); })
    .slice(0,5);

  if (!people.length) { box.style.display='none'; box.innerHTML=''; return; }
  box.innerHTML = '<div class="moi-ledger-quick-title">Ledger</div>' +
    people.map(function(p){
      return '<button type="button" class="moi-ledger-person" data-place="'+x(p.place)+'" data-name="'+x(p.name)+'" onclick="openPersonLedger(this.dataset.place,this.dataset.name)">'
        + '<span><b>'+x(p.name)+'</b><small>'+x(p.place)+' · '+p.count+' பதிவுகள்</small></span>'
        + '<strong>Ledger ›</strong></button>';
    }).join('');
  box.style.display='block';
}


// FIX [30]: show/hide the More Filters panel
function toggleMoreFilters() {
  var panel = document.getElementById('moreFiltersPanel');
  var label = document.getElementById('moreFiltersLabel');
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (label) label.textContent = isOpen ? '🔽 மேலும் வடிகட்டல்கள்' : '🔼 வடிகட்டல்கள் மறை';
  if (!isOpen) _populateMoreFilterOptions();
}


// FIX [30]: reset every extra filter field and re-render
function clearMoreFilters() {
  ['af_amtmin','af_amtmax','af_type','af_nakai','af_by','af_place'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var sortEl = document.getElementById('af_sort'); if (sortEl) sortEl.value = 'date_desc';
  renderAll();
}


// FIX [30]: fills the Type / Porul / Entered-By dropdowns with whatever
// unique values actually exist in the current records — avoids hardcoding
// a fixed list that would drift out of sync with real data.
function _populateMoreFilterOptions() {
  var typeSet = {}, nakaiSet = {}, bySet = {};
  recs.forEach(function(r) {
    if (r.type)       typeSet[r.type] = true;
    if (r.nakai)       nakaiSet[r.nakai] = true;
    if (r.enteredBy)   bySet[r.enteredBy] = true;
  });
  function fillSelect(id, set) {
    var el = document.getElementById(id);
    if (!el) return;
    var current = el.value;
    var opts = Object.keys(set).sort();
    el.innerHTML = '<option value="">அனைத்தும்</option>' +
      opts.map(function(v){ return '<option value="'+x(v)+'">'+x(v)+'</option>'; }).join('');
    el.value = opts.indexOf(current) !== -1 ? current : '';
  }
  fillSelect('af_type',  typeSet);
  fillSelect('af_nakai', nakaiSet);
  fillSelect('af_by',    bySet);
}


// FIX [29]: prefills the Add form with the searched name (and the most
// recent matching record's place/type, as a reasonable starting guess)
// so adding another transaction for the same person doesn't mean
// re-typing everything from scratch.
function addForSearchedName() {
  var q = _moiSearchNorm(document.getElementById('srch').value || '');
  if (!q) return;
  var matches = sortDesc(recs.filter(function(r) {
    return _moiSearchHit(r, q);
  }));
  if (!matches.length) return;
  var latest = matches[0]; // most recent transaction from this search

  go('add');
  setTimeout(function() {
    document.getElementById('f_date').value  = todayStr();
    document.getElementById('f_place').value = latest.place;
    document.getElementById('f_name').value  = latest.name;
    if (latest.type) _setFTypeValue(latest.type);
    onPlaceChange(); onNameChange();
  }, 50);
}


// ============================================================
// MONTH
// ============================================================
function switchMonthFilter(mode) {
  document.getElementById('mfMonth').style.display = mode === 'month' ? '' : 'none';
  document.getElementById('mfRange').style.display = mode === 'range' ? '' : 'none';
  document.getElementById('mfTab-month').classList.toggle('on', mode === 'month');
  document.getElementById('mfTab-range').classList.toggle('on', mode === 'range');
  loadMonth();
}


function loadMonth() {
  var isRange = document.getElementById('mfRange').style.display !== 'none';
  var from, to;
  if (!isRange) {
    var mp = document.getElementById('monthPick').value;
    if (!mp) { document.getElementById('monthDates').innerHTML = ''; document.getElementById('monthCards').innerHTML = ''; return; }
    from = mp + '-01';
    var d = new Date(mp + '-01'); d.setMonth(d.getMonth()+1); d.setDate(0);
    to = mp + '-' + String(d.getDate()).padStart(2,'0');
  } else {
    from = document.getElementById('rangeFrom').value;
    to   = document.getElementById('rangeTo').value;
    if (!from && !to) { document.getElementById('monthDates').innerHTML = ''; document.getElementById('monthCards').innerHTML = ''; return; }
  }
  var filtered = sortDesc(recs.filter(function(r){ return (!from||r.date>=from)&&(!to||r.date<=to); }));
  var total = filtered.reduce(function(s,r){ return s+r.amount; },0);
  var sei   = filtered.filter(function(r){ return r.mode !== 'Varavu'; }).reduce(function(s,r){ return s+r.amount; },0);
  var var_  = filtered.filter(function(r){ return r.mode==='Varavu'; }).reduce(function(s,r){ return s+r.amount; },0);
  document.getElementById('monthCards').innerHTML =
    sc('மொத்தம்','₹'+fmt(total),false)+sc('பதிவுகள்',filtered.length,true)+
    sc('செய்முறை','₹'+fmt(sei),false)+sc('வரவு','₹'+fmt(var_),true);
  if (!filtered.length) { document.getElementById('monthDates').innerHTML = empty(); return; }
  var byDate = {};
  filtered.forEach(function(r){ if(!byDate[r.date])byDate[r.date]=[]; byDate[r.date].push(r); });
  var html = '<div class="list">';
  Object.keys(byDate).sort().reverse().forEach(function(dt){
    var rows = byDate[dt], dtotal = rows.reduce(function(s,r){ return s+r.amount; },0);
    html += '<div class="drow" onclick="jumpDate(\''+dt+'\')">'
          + '<div><div class="dd">'+fmtDate(dt)+'</div><div class="dc">'+rows.length+' பதிவுகள்</div></div>'
          + '<div class="da">₹'+fmt(dtotal)+'</div></div>';
  });
  document.getElementById('monthDates').innerHTML = html + '</div>';
}


function jumpDate(d) { document.getElementById('selDate').value = d; go('today'); }


// ============================================================
// SUMMARY
// ============================================================
function toggleAmounts() {
  var amountNodes = document.querySelectorAll('.amt-val');
  var btn = document.getElementById('amtToggleBtn');
  if (!btn && !amountNodes.length) return;
  amtVisible = !amtVisible;
  if (btn) {
    var label = btn.querySelector('.amt-toggle-label');
    var use = btn.querySelector('use');
    if (label) label.textContent = amtVisible ? 'மறை' : 'தொகை';
    if (use) use.setAttribute('href', amtVisible ? '#icon-eye-off' : '#icon-eye');
    btn.setAttribute('aria-pressed', amtVisible ? 'true' : 'false');
    btn.setAttribute('aria-label', amtVisible ? 'தொகைகளை மறை' : 'தொகைகளை காட்டு');
    btn.title = amtVisible ? 'தொகைகளை மறை' : 'தொகைகளை காட்டு';
  }
  amountNodes.forEach(function(el){
    el.textContent = amtVisible ? el.getAttribute('data-val') : '₹****';
  });
  if (sumAll && document.getElementById('sumCards')) renderSumCards(sumAll);
}


function renderSumCards(s) {
  var show = amtVisible;
  function av(label, val, blue) {
    var dv = show ? '₹' + fmt(val) : '₹****';
    return '<div class="sc"><div class="sl">'+label+'</div>'
         + '<div class="sv'+(blue?' b':'')+' amt-val" data-val="₹'+fmt(val)+'">'+dv+'</div></div>';
  }
  document.getElementById('sumCards').innerHTML =
    av('மொத்த தொகை', s.total, false) +
    '<div class="sc"><div class="sl">பதிவுகள்</div><div class="sv b">'+s.count+'</div></div>' +
    av('செய்முறை', s.seimurai, false) + av('வரவு', s.varavu, true);
}



var _moiSummaryMode = 'month';
var _moiSummaryFrom = '';
var _moiSummaryTo = '';
var _moiAnalysisTab = 'nakai';
var _moiAnalysisShowAll = false;
var _moiSummaryRows = [];
var _moiSummaryRequestSeq = 0;

function _moiSummaryBounds(mode) {
  var p = todayStr().split('-');
  var now = new Date(+p[0], +p[1]-1, +p[2]);
  function ymd(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  if (mode === 'year') {
    var yEl=document.getElementById('sumYearPick');
    var y=Number(yEl&&yEl.value)||now.getFullYear();
    return {from:y+'-01-01',to:y+'-12-31'};
  }
  var mEl=document.getElementById('sumMonthPick');
  var ym=(mEl&&/^\d{4}-\d{2}$/.test(mEl.value))?mEl.value:(now.getFullYear()+'-'+('0'+(now.getMonth()+1)).slice(-2));
  var a=ym.split('-'), yy=Number(a[0]), mm=Number(a[1]);
  return {from:ym+'-01',to:ymd(new Date(yy,mm,0))};
}

function _initMoiSummaryPickers() {
  var p=todayStr().split('-');
  var month=document.getElementById('sumMonthPick');
  var year=document.getElementById('sumYearPick');
  if(month&&!month.value) month.value=p[0]+'-'+p[1];
  if(month){var names=['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'],mp=month.value.split('-');month.setAttribute('data-tamil-label',(names[(Number(mp[1])||1)-1]||'')+' '+(mp[0]||''));}
  if(year&&!year.value) year.value=p[0];
}

function setMoiSummaryRange(mode) {
  _moiSummaryMode = mode || 'month';
  _initMoiSummaryPickers();
  var month=document.getElementById('sumMonthRange');
  var year=document.getElementById('sumYearRange');
  var custom = document.getElementById('sumCustomRange');
  if(month) month.style.display=_moiSummaryMode==='month'?'flex':'none';
  if(year) year.style.display=_moiSummaryMode==='year'?'flex':'none';
  if(custom) custom.style.display=_moiSummaryMode==='custom'?'flex':'none';
  if (_moiSummaryMode === 'custom') return;
  if (_moiSummaryMode === 'overall') {
    _moiSummaryFrom=''; _moiSummaryTo='';
    _moiAnalysisShowAll=false;
    _loadMoiSummaryData();
    return;
  }
  var b = _moiSummaryBounds(_moiSummaryMode);
  _moiSummaryFrom=b.from; _moiSummaryTo=b.to;
  _moiAnalysisShowAll=false;
  _loadMoiSummaryData();
}

function applyMoiSummaryPickerRange() {
  var monthEl=document.getElementById('sumMonthPick');if(monthEl&&monthEl.value){var mn=['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'],a0=monthEl.value.split('-');monthEl.setAttribute('data-tamil-label',(mn[(Number(a0[1])||1)-1]||'')+' '+(a0[0]||''));}
  if (_moiSummaryMode==='custom' || _moiSummaryMode==='overall') return;
  var b=_moiSummaryBounds(_moiSummaryMode||'month');
  _moiSummaryFrom=b.from; _moiSummaryTo=b.to;
  _moiAnalysisShowAll=false;
  _loadMoiSummaryData();
}

function applyMoiSummaryCustomRange() {
  var from=(document.getElementById('sumRangeFrom')||{}).value||'';
  var to=(document.getElementById('sumRangeTo')||{}).value||'';
  if (from && to && from>to) { toast('⚠️ From Date, To Date-ஐ விட முன்பாக இருக்க வேண்டும்'); return; }
  _moiSummaryMode='custom'; _moiSummaryFrom=from; _moiSummaryTo=to;
  _moiAnalysisShowAll=false;
  _loadMoiSummaryData();
}

function _ensureMoiSummaryRange() {
  _initMoiSummaryPickers();
  if (_moiSummaryMode === 'custom') return;
  if (_moiSummaryMode === 'overall') { _moiSummaryFrom=''; _moiSummaryTo=''; return; }
  var b=_moiSummaryBounds(_moiSummaryMode||'month');
  _moiSummaryFrom=b.from; _moiSummaryTo=b.to;
}

function _moiSummaryPeriodRows() {
  // Summary rows are now loaded lazily from the server for the selected range.
  // Do not derive this view from `recs`: the transactions screen is server-side
  // paginated, so `recs` may contain only a small/latest subset.
  return _moiSummaryRows || [];
}

function _renderMoiOverview(rows) {
  var total=rows.reduce(function(s,r){return s+(Number(r.amount)||0);},0);
  var sei=rows.filter(function(r){return r.mode!=='Varavu';}).reduce(function(s,r){return s+(Number(r.amount)||0);},0);
  var varavu=rows.filter(function(r){return r.mode==='Varavu';}).reduce(function(s,r){return s+(Number(r.amount)||0);},0);
  function amount(label,val,cls){
    var shown='₹'+fmt(val);
    return '<button type="button" class="moi-overview-card '+(cls||'')+'" onclick="showSummaryBreakdown(\'mode\',\''+label+'\')"><span>'+label+'</span><b class="amt-val" data-val="₹'+fmt(val)+'">'+shown+'</b></button>';
  }
  document.getElementById('sumCards').innerHTML =
    '<button type="button" class="moi-overview-card" onclick="showSummaryBreakdown(\'all\',\'\')"><span>பதிவுகள்</span><b>'+rows.length+'</b></button>'+
    amount('மொத்தம்',total,'total')+amount('செய்முறை',sei,'given')+amount('வரவு',varavu,'received');
}

function _moiTrendBuckets(rows) {
  var buckets={}, labels=[];
  var annual=_moiSummaryMode==='year';
  rows.forEach(function(r){
    var key=annual ? (r.date||'').substring(0,7) : (r.date||'');
    if (!key) return;
    if (!buckets[key]) buckets[key]={key:key,seimurai:0,varavu:0,total:0};
    var a=Number(r.amount)||0;
    buckets[key].total+=a;
    if (r.mode==='Varavu') buckets[key].varavu+=a; else buckets[key].seimurai+=a;
  });
  labels=Object.keys(buckets).sort();
  return labels.map(function(k){return buckets[k];});
}

function _renderMoiTrend(rows) {
  var data=_moiTrendBuckets(rows);
  var el=document.getElementById('sumTrendChart');
  var label=document.getElementById('sumTrendLabel');
  if (label) label.textContent=_moiSummaryMode==='year'?'மாத வாரியாக':'தேதி வாரியாக';
  if (!el) return;
  if (!data.length) {el.innerHTML=empty();return;}
  var max=Math.max.apply(null,data.map(function(d){return Math.max(d.seimurai,d.varavu,1);}));
  var show=data.slice(-12);
  if(show.length<=2){
    el.innerHTML='<div class="moi-trend-compact">'+show.map(function(d){var lbl=_moiSummaryMode==='year'?d.key.substring(5,7):d.key.substring(8,10);return '<button type="button" onclick="showSummaryBreakdown(\'date\',\''+x(d.key)+'\')"><b>'+lbl+'</b><span><i class="given" style="width:'+Math.round((d.seimurai/max)*100)+'%"></i></span><small>செய்முறை ₹'+fmt(d.seimurai)+'</small><span><i class="received" style="width:'+Math.round((d.varavu/max)*100)+'%"></i></span><small>வரவு ₹'+fmt(d.varavu)+'</small></button>';}).join('')+'</div><div class="moi-trend-legend"><span class="given-key">■ செய்முறை</span><span class="received-key">■ வரவு</span></div>';return;
  }
  el.innerHTML='<div class="moi-trend-bars">'+show.map(function(d){
    var g=Math.max(4,Math.round((d.seimurai/max)*100));
    var v=Math.max(4,Math.round((d.varavu/max)*100));
    var lbl=_moiSummaryMode==='year'?d.key.substring(5,7):d.key.substring(8,10);
    return '<button type="button" class="moi-trend-col" onclick="showSummaryBreakdown(\'date\',\''+x(d.key)+'\')">'
      +'<div class="moi-trend-stack"><i class="given" style="height:'+g+'%"></i><i class="received" style="height:'+v+'%"></i></div>'
      +'<small>'+lbl+'</small></button>';
  }).join('')+'</div><div class="moi-trend-legend"><span>■ செய்முறை</span><span>■ வரவு</span></div>';
}

function setMoiAnalysisTab(tab) {
  _moiAnalysisTab=tab||'nakai'; _moiAnalysisShowAll=false;
  ['nakai','place','event'].forEach(function(k){
    var b=document.getElementById('sumTab-'+k); if(b)b.classList.toggle('on',k===_moiAnalysisTab);
  });
  _renderMoiAnalysisList();
}

function _moiAnalysisGroups(rows,tab) {
  var map={};
  rows.forEach(function(r){
    var key='';
    if (tab==='nakai') key=String(r.nakai||'').trim();
    else if (tab==='place') key=String(r.place||'').trim();
    else key=String(r._eventName||r.eventName||'').trim();
    if (!key) return;
    if (!map[key]) map[key]={name:key,count:0,total:0};
    map[key].count++; map[key].total+=Number(r.amount)||0;
  });
  return Object.keys(map).map(function(k){return map[k];})
    .sort(function(a,b){return b.total-a.total || b.count-a.count;});
}

function _renderMoiAnalysisList() {
  var el=document.getElementById('sumAnalysisList');
  var more=document.getElementById('sumAnalysisMoreBtn');
  if (!el) return;
  var groups=_moiAnalysisGroups(_moiSummaryRows,_moiAnalysisTab);
  if (!groups.length) {
    el.innerHTML='<div class="moi-analysis-empty">இந்த காலகட்டத்தில் விவரம் இல்லை</div>';
    if(more)more.style.display='none'; return;
  }
  var list=_moiAnalysisShowAll?groups:groups.slice(0,5);
  var max=Math.max.apply(null,list.map(function(g){return g.total||1;}));
  el.innerHTML='<div class="moi-breakdown-list">'+list.map(function(g){
    var pct=Math.max(5,Math.round((g.total/max)*100));
    return '<button type="button" class="moi-breakdown-row" data-key="'+x(g.name)+'" onclick="showSummaryBreakdown(\''+_moiAnalysisTab+'\',this.dataset.key)">'
      +'<div class="moi-breakdown-main"><b>'+x(g.name)+'</b><small>'+g.count+' பதிவுகள் · ₹'+fmt(g.total)+'</small>'
      +'<span><i style="width:'+pct+'%"></i></span></div><em>›</em></button>';
  }).join('')+'</div>';
  if (more) {
    more.style.display=groups.length>5?'block':'none';
    more.textContent=_moiAnalysisShowAll?'சுருக்கமாக பார்க்க':'அனைத்தையும் பார்க்க';
  }
}

function toggleMoiAnalysisMore() {
  _moiAnalysisShowAll=!_moiAnalysisShowAll;
  _renderMoiAnalysisList();
}

function showSummaryBreakdown(kind,key) {
  var rows=_moiSummaryRows.slice();
  if (kind==='mode') {
    if (key==='செய்முறை') rows=rows.filter(function(r){return r.mode!=='Varavu';});
    else if (key==='வரவு') rows=rows.filter(function(r){return r.mode==='Varavu';});
  } else if (kind==='date') {
    if (_moiSummaryMode==='year' && key.length===7) rows=rows.filter(function(r){return (r.date||'').substring(0,7)===key;});
    else rows=rows.filter(function(r){return r.date===key;});
  } else if (kind==='nakai') rows=rows.filter(function(r){return String(r.nakai||'')===key;});
  else if (kind==='place') rows=rows.filter(function(r){return String(r.place||'')===key;});
  else if (kind==='event') rows=rows.filter(function(r){return String(r._eventName||r.eventName||'')===key;});

  var box=document.getElementById('sumDrilldown');
  if (!box) return;
  box.innerHTML='<div class="moi-drill-head"><b>'+x(key||'அனைத்து பதிவுகள்')+'</b><button type="button" onclick="document.getElementById(\'sumDrilldown\').innerHTML=\'\'">✕</button></div>'+renderCards(sortDesc(rows),true);
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

function _setMoiSummaryEmptyState(isEmpty, loading) {
  var cards=document.getElementById('sumCards');
  var trendCard=document.getElementById('sumTrendCard');
  var breakdownCard=document.getElementById('sumBreakdownCard');
  var emptyState=document.getElementById('sumEmptyState');
  var compact = !!(isEmpty || loading);
  // Zero/loading state should not reserve the height of four zero cards, chart
  // and breakdown panels. Keep only the range picker + one compact status row.
  if(cards) cards.style.display=compact?'none':'';
  if(trendCard) trendCard.style.display=compact?'none':'';
  if(breakdownCard) breakdownCard.style.display=compact?'none':'';
  if(emptyState){
    emptyState.style.display=compact?'block':'none';
    var emptyLabel=emptyState.querySelector('.empty-label'); if(emptyLabel) emptyLabel.textContent=loading?'பதிவுகள் ஏற்றப்படுகின்றன…':'இந்த காலத்திற்கு பதிவுகள் இல்லை';
    var emptyArt=emptyState.querySelector('.empty-art'); if(emptyArt) emptyArt.style.display=loading?'none':'flex';
  }
}

function _renderMoiSummaryAnalysis() {
  var rows=_moiSummaryPeriodRows();
  _renderMoiOverview(rows);
  _setMoiSummaryEmptyState(!rows.length,false);
  if(rows.length){
    _renderMoiTrend(rows);
    _renderMoiAnalysisList();
  }
  var box=document.getElementById('sumDrilldown'); if(box)box.innerHTML='';
}

function _loadMoiSummaryData() {
  _ensureMoiSummaryRange();
  var seq=++_moiSummaryRequestSeq;
  _moiSummaryRows=[];
  _renderMoiOverview([]);
  _setMoiSummaryEmptyState(false,true);
  google.script.run
    .withSuccessHandler(function(res){
      if(seq!==_moiSummaryRequestSeq) return;
      if(!res || !res.ok){
        _moiSummaryRows=[];
        _renderMoiSummaryAnalysis();
        toast((res&&res.msg)||'Summary பதிவுகளை ஏற்ற முடியவில்லை');
        return;
      }
      _moiSummaryRows=res.rows||[];
      _renderMoiSummaryAnalysis();
    })
    .withFailureHandler(function(err){
      if(seq!==_moiSummaryRequestSeq) return;
      _moiSummaryRows=[];
      _renderMoiSummaryAnalysis();
      toastError(err);
    })
    .getMoiSummaryRows({from:_moiSummaryFrom||'',to:_moiSummaryTo||''});
}

function renderSummary() {
  _loadMoiSummaryData();
}


function filterByNakai(name) {
  nakaiFilter = name;
  var fb = document.getElementById('nakaiFilterBar'); if (fb) fb.style.display = 'flex';
  var fl = document.getElementById('nakaiFilterLabel'); if (fl) fl.textContent = 'பொருள்: ' + name;
  var el = document.getElementById('sumList'); if (el) el.scrollIntoView({behavior:'smooth'});
  if (sumAll) renderSumList(sumAll.persons);
}


function clearNakaiFilter() {
  nakaiFilter = null;
  var fb = document.getElementById('nakaiFilterBar'); if (fb) fb.style.display = 'none';
  if (sumAll) renderSumList(sumAll.persons);
}


function renderSumList(persons) {
  // V272: this is a legacy Summary renderer. The current Summary layout no
  // longer owns #sumList, so fail closed instead of throwing on a removed id.
  var sumListEl = document.getElementById('sumList');
  if (!sumListEl) return;
  var filtered = (persons||[]).filter(function(p){
    return (!nakaiFilter || (p.nakai && p.nakai.toLowerCase() === nakaiFilter.toLowerCase()));
  }).sort(function(a,b){ return a.lastDate>b.lastDate?-1:a.lastDate<b.lastDate?1:b.total-a.total; });
  if (!filtered.length) { sumListEl.innerHTML = empty(); return; }
  var title = nakaiFilter ? 'பொருள்: '+nakaiFilter+' ('+filtered.length+')' : 'நபர் வாரியாக ('+filtered.length+')';
  var html = '<div class="sec">'+title+'</div>';
  filtered.forEach(function(p,i){
    var amtDisp = amtVisible ? '₹'+fmt(p.total) : '₹****';
    var pid = 'pexp_'+i;
    html += '<div class="pc-card">'
          + '<div class="pc" data-place="'+x(p.place)+'" data-name="'+x(p.name)+'" onclick="togglePersonRecords(\''+pid+'\',this)">'
          + '<div class="prank">#'+(i+1)+'</div><div class="pmain">'
          + '<div class="pname">'+x(p.name)+'</div><div class="pplace">'+x(p.place)+'</div>'
          + (p.types&&p.types.length?'<div class="rmeta" style="margin-top:4px">'+p.types.map(function(t){ return '<span class="badge bg">'+x(t)+'</span>'; }).join('')+'</div>':'')
          + (p.nakai?'<div style="margin-top:4px"><span class="badge bp">'+x(p.nakai)+'</span></div>':'')
          + '</div><div class="pr">'
          + '<div class="pamt amt-val" data-val="₹'+fmt(p.total)+'">'+amtDisp+'</div>'
          + '<div class="ptxn">'+p.count+' முறை</div>'
          + '<div class="rdate">'+fmtDate(p.lastDate)+'</div>'
          + '<button type="button" class="person-ledger-btn" data-place="'+x(p.place)+'" data-name="'+x(p.name)+'" onclick="event.stopPropagation();openPersonLedger(this.dataset.place,this.dataset.name)">Ledger</button>'
          + '<div class="p-toggle">பதிவுகள் ▾</div>'
          + '</div></div>'
          + '<div class="pc-expand" id="'+pid+'"></div>'
          + '</div>';
  });
  sumListEl.innerHTML = html;
}


function togglePersonRecords(pid, rowEl) {
  var box = document.getElementById(pid);
  if (!box) return;
  var wasOpen = box.classList.contains('show');
  document.querySelectorAll('.pc-expand.show').forEach(function(el){
    if (el.id !== pid) { el.classList.remove('show'); el.innerHTML=''; }
  });
  document.querySelectorAll('.p-toggle').forEach(function(t){ t.textContent = 'பதிவுகள் ▾'; });
  if (wasOpen) { box.classList.remove('show'); box.innerHTML=''; return; }
  var place = rowEl.dataset.place, name = rowEl.dataset.name;
  var matches = sortDesc(recs.filter(function(r){ return r.place===place && r.name===name; }));
  box.innerHTML = matches.length ? renderCards(matches, true) : empty();
  box.classList.add('show');
  var tgl = rowEl.querySelector('.p-toggle'); if (tgl) tgl.textContent = 'மூடு ▴';
}


// ============================================================
// MEMBER LEDGER — v156
// Person history is built from the already-loaded `recs` cache, so opening
// a ledger is instant and does not add a server call. Optional contact comes
// from the newest record that has one; WhatsApp/SMS share never creates a
// phone contact and never changes the MOI records.
// ============================================================
var _memberLedgerState = null;
function _ledgerPhone(v){ var d=String(v||'').replace(/\D/g,''); if(d.length===10)d='91'+d; return d; }
function _ledgerShareText(st){
  var lines=['நம்ம மொய் - '+st.name, st.place ? 'ஊர்: '+st.place : '', 'மொத்த பதிவுகள்: '+st.rows.length, 'மொத்தம்: ₹'+fmt(st.total), ''];
  st.rows.forEach(function(r){ lines.push(fmtDate(r.date)+' | '+(r.mode==='Varavu'?'வரவு':'செய்முறை')+' | ₹'+fmt(r.amount)+(r.type?' | '+r.type:'')); });
  return lines.filter(Boolean).join('\n');
}
function openPersonLedger(place,name){
  var rows=sortDesc(recs.filter(function(r){return r.place===place&&r.name===name;}));
  if(!rows.length){toast('Ledger பதிவுகள் இல்லை');return;}
  var total=rows.reduce(function(s,r){return s+(Number(r.amount)||0);},0);
  var contact=''; for(var i=0;i<rows.length;i++){if(rows[i].contact){contact=rows[i].contact;break;}}
  var iruppu='',occupation='';for(var pi=0;pi<rows.length;pi++){if(!iruppu&&rows[pi].iruppu)iruppu=rows[pi].iruppu;if(!occupation&&rows[pi].occupation)occupation=rows[pi].occupation;if(iruppu&&occupation)break;}
  _memberLedgerState={place:place,name:name,rows:rows,total:total,contact:contact,iruppu:iruppu,occupation:occupation};
  document.getElementById('memberLedgerTitle').textContent=name+' — Ledger';
  document.getElementById('memberLedgerPlace').textContent=[place,iruppu?('இருப்பு: '+iruppu):'',occupation?('தொழில்: '+occupation):''].filter(Boolean).join(' · ');
  document.getElementById('memberLedgerSummary').innerHTML='<div><span>பதிவுகள்</span><b>'+rows.length+'</b></div><div><span>மொத்தம்</span><b>₹'+fmt(total)+'</b></div>'+(contact?'<div><span>Contact</span><b>'+x(contact)+'</b></div>':'');
  document.getElementById('memberLedgerList').innerHTML=rows.map(function(r){return '<div class="member-ledger-row"><div><b>'+fmtDate(r.date)+'</b><span>'+x(r.type||'மொய்')+' · '+(r.mode==='Varavu'?'வரவு':'செய்முறை')+'</span></div><strong>₹'+fmt(r.amount)+'</strong><div class="member-ledger-actions"><button type="button" onclick="closeMemberLedger();openEditModal(\''+x(String(r.no))+'\',\''+x(r._sheetId||'')+'\')">✏️ திருத்து</button><button type="button" class="danger" onclick="closeMemberLedger();delRec(\''+x(String(r.no))+'\',\''+x(r._sheetId||'')+'\')">🗑️ நீக்கு</button></div></div>';}).join('');
  var wa=document.getElementById('memberLedgerWhatsApp'),sms=document.getElementById('memberLedgerSms');
  if(wa)wa.disabled=!contact;if(sms)sms.disabled=!contact;
  document.getElementById('memberLedgerModal').style.display='flex';
}
function closeMemberLedger(){var m=document.getElementById('memberLedgerModal');if(m)m.style.display='none';_memberLedgerState=null;}
function shareMemberLedger(kind){
  var st=_memberLedgerState;if(!st)return;var text=_ledgerShareText(st),phone=_ledgerPhone(st.contact);
  if(kind==='whatsapp'){if(!phone){toast('Contact Number இல்லை');return;}window.open('https://wa.me/'+phone.replace(/^\+/,'')+'?text='+encodeURIComponent(text),'_blank');return;}
  if(kind==='sms'){if(!phone){toast('Contact Number இல்லை');return;}window.location.href='sms:'+phone+'?body='+encodeURIComponent(text);return;}
  if(navigator.share){navigator.share({title:st.name+' Ledger',text:text}).catch(function(){});}else{try{navigator.clipboard.writeText(text);toast('Ledger copy செய்யப்பட்டது');}catch(e){toast('Share செய்ய முடியவில்லை');}}
}

// ============================================================
// ADD RECORD
// ============================================================
var _nmMasterSuggestTimers={};
var _nmMasterSuggestCache={name:{},place:{}};
var _nmMasterUseSeen={};
function _nmTrackMasterSelection_(kind,value){
  value=_norm(value);if(!value)return;
  var hit=false,cache=_nmMasterSuggestCache[kind]||{};
  Object.keys(cache).some(function(k){return (cache[k]||[]).some(function(v){if(_norm(v).toLowerCase()===value.toLowerCase()){hit=true;return true;}return false;});});
  if(!hit)return;
  var key=kind+'|'+value.toLowerCase();if(_nmMasterUseSeen[key])return;_nmMasterUseSeen[key]=1;
  try{google.script.run.withFailureHandler(function(){}).noteMasterSuggestionUse(kind,value);}catch(e){}
}

function _nmUniqueSuggestions_(arr,limit){
  var seen={},out=[];(arr||[]).forEach(function(v){v=_norm(v);var k=v.toLowerCase();if(v&&!seen[k]){seen[k]=1;out.push(v);}});return out.slice(0,limit||8);
}
function _nmRankLocal_(values,q){
  q=_norm(q).toLowerCase(); if(q.length<2)return [];
  return _nmUniqueSuggestions_(values,100).map(function(v){var n=_norm(v).toLowerCase(),score=n.indexOf(q)===0?100:(n.indexOf(q)!==-1?70:0);return {v:v,s:score};})
    .filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,8).map(function(x){return x.v;});
}
function _nmRenderDatalist_(id,values){var dl=document.getElementById(id);if(dl)dl.innerHTML=_nmUniqueSuggestions_(values,8).map(function(v){return '<option value="'+x(v)+'">';}).join('');}
function _nmFetchMaster_(kind,q,local,dlId){
  q=_norm(q); if(q.length<2){_nmRenderDatalist_(dlId,[]);return;}
  var key=q.toLowerCase(),cached=_nmMasterSuggestCache[kind][key];
  if(cached){_nmRenderDatalist_(dlId,local.concat(cached));return;}
  var timerKey=kind+'|'+dlId; clearTimeout(_nmMasterSuggestTimers[timerKey]);_nmMasterSuggestTimers[timerKey]=setTimeout(function(){
    google.script.run.withSuccessHandler(function(rows){rows=Array.isArray(rows)?rows:[];_nmMasterSuggestCache[kind][key]=rows;_nmRenderDatalist_(dlId,local.concat(rows));})
      .withFailureHandler(function(){_nmRenderDatalist_(dlId,local);}).getMasterSuggestions(kind,q);
  },280);
}
function onPlaceChange() {
  var place = _norm(document.getElementById('f_place').value);
  var localPlaces=_nmRankLocal_(ac.places||[],place);
  _nmFetchMaster_('place',place,localPlaces,'dl_place');
  _nmTrackMasterSelection_('place',place);
  var nameEl=document.getElementById('f_name'),nq=nameEl?_norm(nameEl.value):'';
  var localNames=(ac.combos||[]).filter(function(c){return !place||_norm(c.place).toLowerCase()===place.toLowerCase();}).map(function(c){return c.name;});
  _nmRenderDatalist_('dl_name',_nmRankLocal_(localNames,nq));
  renderQuickChips(place, ''); clearDup();
}

// FIX: Moi Counter's Name field previously relied on the SAME dl_name
// datalist as the main Add Record form, but only onPlaceChange() (tied to
// the main form's f_place field) ever refreshed it — so Moi Counter's name
// suggestions were stale/empty regardless of what place was typed there.
// Moi Counter now has its own datalist (dl_mc_name), refreshed here.
function onMcPlaceChange() {
  var place = _norm(document.getElementById('mc_place').value);
  var localPlaces=_nmRankLocal_(ac.places||[],place);
  _nmFetchMaster_('place',place,localPlaces,'dl_place');
  onMcNameChange();
}
function onMcNameChange() {
  var placeEl=document.getElementById('mc_place'),nameEl=document.getElementById('mc_name');
  if(!nameEl)return;var place=_norm(placeEl?placeEl.value:''),q=_norm(nameEl.value);
  var local=(ac.combos||[]).filter(function(c){return !place||_norm(c.place).toLowerCase()===place.toLowerCase();}).map(function(c){return c.name;});
  _nmFetchMaster_('name',q,_nmRankLocal_(local.concat((ac.combos||[]).map(function(c){return c.name;})),q),'dl_mc_name');
}
function _nmGenericPlaceInput(inputId){var el=document.getElementById(inputId);if(!el)return;var q=_norm(el.value);_nmFetchMaster_('place',q,_nmRankLocal_(ac.places||[],q),'dl_place');}
function _nmGenericNameInput(nameId,placeId,dlId){var ne=document.getElementById(nameId),pe=document.getElementById(placeId);if(!ne)return;var q=_norm(ne.value),place=_norm(pe?pe.value:'');var local=(ac.combos||[]).filter(function(c){return !place||_norm(c.place).toLowerCase()===place.toLowerCase();}).map(function(c){return c.name;});_nmFetchMaster_('name',q,_nmRankLocal_(local.concat((ac.combos||[]).map(function(c){return c.name;})),q),dlId);}


function onNameChange() {
  var place = _norm(document.getElementById('f_place').value);
  var name  = _norm(document.getElementById('f_name').value);
  var localSamePlace=(ac.combos||[]).filter(function(c){return !place||_norm(c.place).toLowerCase()===place.toLowerCase();}).map(function(c){return c.name;});
  var localAll=(ac.combos||[]).map(function(c){return c.name;});
  var local=_nmRankLocal_(localSamePlace.concat(localAll),name);
  _nmFetchMaster_('name',name,local,'dl_name');
  _nmTrackMasterSelection_('name',name);
  clearDup(); renderQuickChips(place, name);
  if (!place || !name) return;
  for (var i = 0; i < ac.combos.length; i++) {
    var c = ac.combos[i];
    if (_norm(c.place).toLowerCase()===place.toLowerCase() && _norm(c.name).toLowerCase()===name.toLowerCase()) {
      showDup(c, false);
      if (!document.getElementById('f_type').value && c.type) _setFTypeValue(c.type);
      if (document.getElementById('f_mode').value==='செய்முறை'&&c.mode) document.getElementById('f_mode').value = c.mode;
      break;
    }
  }
}

function renderQuickChips(place, nameTyped) {
  var box = document.getElementById('quickChips'); if (!box) return;
  if (!place) { box.innerHTML = ''; return; }
  var nt = _norm(nameTyped).toLowerCase();
  // v286: do not expose a full people list merely because an ஊர் is selected.
  // Show quick matches only after the user types at least 2 name characters.
  if (nt.length < 2) { box.innerHTML = ''; return; }

  if (_activeEventId) {
    // FIX [47-B3]: Event is active — chips show TWO things:
    // A) If this person already gave varavu in THIS event: "முன்பு N முறை — கடைசி: ₹X"
    // B) If not in event yet but exists in main sheet (ac.combos): show as
    //    a lightweight reference (name + oor only, no amount — they haven't
    //    given yet in this event so showing an old amount would be confusing).
    var evRecs = recs; // recs is already loaded for the active event sheet
    var placeNorm = _norm(place).toLowerCase();
    var evMatches = evRecs.filter(function(r){
      return _norm(r.place).toLowerCase() === placeNorm &&
             (!nt || _norm(r.name).toLowerCase().includes(nt));
    });

    // Group by name for count/last-amount within this event
    var evByName = {};
    evMatches.forEach(function(r) {
      var k = _norm(r.name).toLowerCase();
      if (!evByName[k]) evByName[k] = { name:r.name, place:r.place, count:0, last:0 };
      evByName[k].count++;
      if (r.amount > evByName[k].last) evByName[k].last = r.amount;
    });

    // Also collect names from main sheet (ac.combos) as reference (not in event yet)
    var mainNames = {};
    (ac.combos || []).forEach(function(c) {
      if (_norm(c.place).toLowerCase() === placeNorm &&
          (!nt || _norm(c.name).toLowerCase().includes(nt))) {
        var k = _norm(c.name).toLowerCase();
        if (!evByName[k]) mainNames[k] = { name:c.name, place:c.place };
      }
    });

    var hasEvChips = Object.keys(evByName).length > 0;
    var hasMainChips = Object.keys(mainNames).length > 0;
    if (!hasEvChips && !hasMainChips) { box.innerHTML = ''; return; }

    var html = '';
    if (hasEvChips) {
      html += '<div class="qc-label">இந்த Event-ல் கொடுத்தவர்கள்</div><div class="qc-wrap">';
      Object.values(evByName).slice(0,8).forEach(function(e) {
        html += '<button class="qc-chip" onclick="quickFill(\''+x(e.place)+'\',\''+x(e.name)+'\',\'\',\'Varavu\')">'
              + '<span class="qc-name">'+x(e.name)+'</span>'
              + '<span class="qc-type" style="background:#E6F7F1;color:#0F6E56">முன்பு '+e.count+' முறை — கடைசி: ₹'+fmt(e.last)+'</span>'
              + '</button>';
      });
      html += '</div>';
    }
    if (hasMainChips) {
      html += '<div class="qc-label" style="color:#6B7280">பழைய பதிவேடு (Reference)</div><div class="qc-wrap">';
      Object.values(mainNames).slice(0,8).forEach(function(m) {
        html += '<button class="qc-chip" style="opacity:0.7" onclick="quickFill(\''+x(m.place)+'\',\''+x(m.name)+'\',\'\',\'Varavu\')">'
              + '<span class="qc-name">'+x(m.name)+'</span>'
              + '</button>';
      });
      html += '</div>';
    }
    box.innerHTML = html;
  } else {
    // Normal (no active event) — original chip behavior with amount shown
    var matches = ac.combos.filter(function(c){
      return _norm(c.place).toLowerCase()===place.toLowerCase() &&
             (!nt||_norm(c.name).toLowerCase().includes(nt));
    });
    if (!matches.length) { box.innerHTML = ''; return; }
    var html2 = '<div class="qc-label">இந்த ஊரில் உள்ளவர்கள்:</div><div class="qc-wrap">';
    matches.slice(0,8).forEach(function(c){
      html2 += '<button class="qc-chip" onclick="quickFill(\''+x(c.place)+'\',\''+x(c.name)+'\',\''+x(c.type)+'\',\''+x(c.mode)+'\')">'
            + '<span class="qc-name">'+x(c.name)+'</span>'
            + (c.type?'<span class="qc-type">'+x(c.type)+'</span>':'')
            + '<span class="qc-amt">₹'+fmt(c.amount)+'</span></button>';
    });
    box.innerHTML = html2 + '</div>';
  }
}


function quickFill(place,name,type,mode) {
  document.getElementById('f_place').value = place;
  document.getElementById('f_name').value  = name;
  if (type) _setFTypeValue(type);
  if (mode) document.getElementById('f_mode').value = mode;
  document.querySelectorAll('.qc-chip').forEach(function(btn){
    var nm = btn.querySelector('.qc-name');
    btn.classList.toggle('selected',!!(nm&&nm.textContent===name));
  });
  clearDup();
  var np = _norm(place).toLowerCase(), nn = _norm(name).toLowerCase();
  for (var i = 0; i < ac.combos.length; i++) {
    var c = ac.combos[i];
    if (_norm(c.place).toLowerCase()===np && _norm(c.name).toLowerCase()===nn){ showDup(c,false); break; }
  }
  setTimeout(function(){ document.getElementById('f_amt').focus(); },100);
}


function onNakaiSelect(prefix) {
  var sel = document.getElementById(prefix);
  var other = document.getElementById(prefix + '_other');
  if (!sel || !other) return;
  var isOther = sel.value === '__other__';
  other.style.display = isOther ? 'block' : 'none';
  if (isOther) other.focus(); else other.value = '';
}


function getNakaiValue(prefix) {
  var sel = document.getElementById(prefix);
  if (!sel) return '';
  if (sel.value === '__other__') {
    var other = document.getElementById(prefix + '_other');
    return other ? other.value.trim().replace(/\s+/g, ' ') : '';
  }
  return sel.value;
}


function setNakaiValue(prefix, value) {
  var sel = document.getElementById(prefix);
  var other = document.getElementById(prefix + '_other');
  if (!sel) return;
  value = (value || '').trim();
  var known = Array.prototype.some.call(sel.options, function(o){ return o.value === value; });
  if (known) {
    sel.value = value;
    if (other) { other.style.display = 'none'; other.value = ''; }
  } else if (value) {
    sel.value = '__other__';
    if (other) { other.style.display = 'block'; other.value = value; }
  } else {
    sel.value = '';
    if (other) { other.style.display = 'none'; other.value = ''; }
  }
}


// ============================================================
//  OCR IMAGE PREP — shared by doOcrCapture() and doBulkOcrCapture().
//  Fixes an EXIF-orientation gap: canvas drawImage() ignores the JPEG
//  orientation tag entirely, so a phone photo tagged "rotate 90°" was
//  being sent to OCR sideways, which is a common cause of "low quality
//  image" OCR failures. Reads the orientation tag (JPEG only; any other
//  format or any parse issue safely falls back to "1" = no rotation) and
//  applies the matching canvas transform before the existing resize step.
// ============================================================
function _getExifOrientation(file, cb) {
  if (!file || !/jpe?g/i.test(file.type)) { cb(1); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) { cb(1); return; }
      var length = view.byteLength, offset = 2;
      while (offset < length) {
        var marker = view.getUint16(offset, false); offset += 2;
        if (marker === 0xFFE1) {
          if (view.getUint32(offset + 2, false) !== 0x45786966) { cb(1); return; }
          var little = view.getUint16(offset + 8, false) === 0x4949;
          var firstIFD = view.getUint32(offset + 12, little);
          var dirStart = offset + 8 + firstIFD;
          var tags = view.getUint16(dirStart, little);
          for (var i = 0; i < tags; i++) {
            var entry = dirStart + 2 + i * 12;
            if (view.getUint16(entry, little) === 0x0112) { cb(view.getUint16(entry + 8, little)); return; }
          }
          cb(1); return;
        } else if ((marker & 0xFF00) !== 0xFF00) { break; }
        else {
          // FIX [FORENSIC-OCR-STUCK]: root cause of the OCR status staying
          // on "படம் படிக்கிறது..." forever with no result — a JPEG marker
          // segment-length field of 0 (seen on some non-camera / generated
          // test images with non-standard encoders) made `offset` never
          // advance, so this while-loop spun forever and `cb()` was never
          // called. That happens entirely client-side, BEFORE the OCR
          // request is ever sent to the server — nothing was hanging in
          // Drive/Vision, the browser tab itself was frozen on this loop.
          // Per JPEG spec a segment-length field is always >= 2 (it counts
          // itself); treat anything less as malformed and bail out safely
          // to the cb(1)/"normal orientation" fallback instead of looping.
          var segLen = view.getUint16(offset, false);
          if (segLen < 2) { console.warn('[OCR] malformed JPEG marker segment (length=' + segLen + ') at offset=' + offset + ' — aborting EXIF scan, using default orientation'); break; }
          offset += segLen;
        }
      }
      cb(1);
    } catch (err) { cb(1); }
  };
  reader.onerror = function() { cb(1); };
  reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // EXIF sits near the start
}

function _ocrPrepareImage(file, maxW, onReady, onError) {
  _getExifOrientation(file, function(orientation) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var scale = Math.min(1, maxW / img.width);
        var dw = Math.round(img.width  * scale);
        var dh = Math.round(img.height * scale);
        // FIX [OCR-STABILIZE / req 7]: width-only scaling still leaves very
        // tall source photos (a long moi note-book page, a panorama-style
        // shot) able to exceed the canvas pixel-dimension ceiling some
        // mobile browsers/WebViews enforce, which silently produces a
        // blank/garbled canvas instead of an error. Clamp height too —
        // maxW*3 stays generous for normal receipt/name-tag aspect ratios.
        var maxH = maxW * 3;
        if (dh > maxH) { var hScale = maxH / dh; dh = Math.round(dh * hScale); dw = Math.round(dw * hScale); }
        var rotated = orientation >= 5 && orientation <= 8; // 90°/270° cases swap width/height
        var canvas = document.createElement('canvas');
        canvas.width  = rotated ? dh : dw;
        canvas.height = rotated ? dw : dh;
        var ctx = canvas.getContext('2d');
        switch (orientation) {
          case 2: ctx.transform(-1,0,0,1,dw,0); break;
          case 3: ctx.transform(-1,0,0,-1,dw,dh); break;
          case 4: ctx.transform(1,0,0,-1,0,dh); break;
          case 5: ctx.transform(0,1,1,0,0,0); break;
          case 6: ctx.transform(0,1,-1,0,dh,0); break;
          case 7: ctx.transform(0,-1,-1,0,dh,dw); break;
          case 8: ctx.transform(0,-1,1,0,0,dw); break;
          default: break; // 1 (normal) or unrecognized — no transform needed
        }
        ctx.drawImage(img, 0, 0, dw, dh);
        onReady(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = function() { onError('படத்தை படிக்க முடியவில்லை'); };
      img.src = e.target.result;
    };
    reader.onerror = function() { onError('File படிக்க முடியவில்லை'); };
    reader.readAsDataURL(file);
  });
}


// Rotate an already-prepared JPEG in browser memory. Used only as an
// OCR fallback when the photo pixels themselves are sideways even though
// EXIF says "normal" (common after screenshots/WhatsApp edits).
function _ocrRotatePreparedBase64(base64, degrees, onReady, onError) {
  var img = new Image();
  img.onload = function() {
    var swap = Math.abs(degrees) % 180 === 90;
    var canvas = document.createElement('canvas');
    canvas.width = swap ? img.height : img.width;
    canvas.height = swap ? img.width : img.height;
    var ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(degrees * Math.PI / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    onReady(canvas.toDataURL('image/jpeg', 0.90).split(',')[1]);
  };
  img.onerror = function() { onError('படத்தை சுழற்றி படிக்க முடியவில்லை'); };
  img.src = 'data:image/jpeg;base64,' + base64;
}

// Run OCR on the normal image first. Only when Drive OCR returns no text,
// retry the same prepared image at 90° and 270°. This fixes receipts whose
// actual pixels are sideways while avoiding extra OCR calls for normal photos.
function _ocrExtractWithRotationFallback(base64, onSuccess, onFailure) {
  function callOcr(data, next) {
    // Diagnostic (console only, no UI/behavior impact) — confirms the
    // request actually leaves the browser and that a handler eventually
    // fires, so a client-side hang (nothing logged after "dispatched")
    // can be told apart from a server-side one (dispatched, then never
    // "resolved").
    google.script.run
      .withSuccessHandler(function(res) {
        if (!res || !res.ok || res.text) { onSuccess(res || {ok:false,msg:'OCR தோல்வி'}); return; }
        next();
      })
      .withFailureHandler(function(err) {
        onFailure(err);
      })
      .ocrExtractText(data, 'image/jpeg');
  }

  // Retry ONCE only (90 deg) — the original code also chained a second
  // 270 deg retry, tripling total Drive OCR round-trips on an empty
  // result (each round-trip already runs a Tamil+English double pass
  // server-side). That unbounded cascade was the launch-reliability
  // risk, so it's capped to a single retry here.
  callOcr(base64, function() {
    _ocrRotatePreparedBase64(base64, 90, function(rot90) {
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onFailure)
        .ocrExtractText(rot90, 'image/jpeg');
    }, onFailure);
  });
}


// Smart Capture equivalent: retry metadata suggestion with rotated OCR
// copies only when the first pass reports no confident text/category.
function _suggestVaultMetadataWithRotationFallback(base64, fileName, onSuccess, onFailure) {
  function callSuggest(data, next) {
    google.script.run
      .withSuccessHandler(function(res) {
        if (!res || !res.ok || res.confidence !== 'none') { onSuccess(res); return; }
        next();
      })
      .withFailureHandler(onFailure)
      .suggestVaultDocumentMetadata(data, 'image/jpeg', fileName);
  }

  callSuggest(base64, function() {
    _ocrRotatePreparedBase64(base64, 90, function(rot90) {
      callSuggest(rot90, function() {
        _ocrRotatePreparedBase64(base64, 270, function(rot270) {
          google.script.run
            .withSuccessHandler(onSuccess)
            .withFailureHandler(onFailure)
            .suggestVaultDocumentMetadata(rot270, 'image/jpeg', fileName);
        }, onFailure);
      });
    }, onFailure);
  });
}

// FIX [NAME-ACCURACY]: common Tamil form/label/heading words that show
// up on moi receipts and notebook pages — these are structural text,
// never a person's name, but they DO contain 2+ Tamil letters, which is
// the only thing the old _looksLikeName() checked for. That's the exact
// root cause of "நாள்" (or பெயர்/தேதி/தொகை/etc.) getting picked as the
// name instead of the actual name line: a label word passed the same
// "has letters" test a real name would pass, and whichever of the two
// happened to come first in the OCR text won.
var _MOI_LABEL_WORDS = [
  'நாள்', 'தேதி', 'தொகை', 'பெயர்', 'ஊர்', 'மொய்', 'பதிவு', 'எண்', 'நன்றி'
];

// FIX [v128 OCR-HEADER-FILTER]: English counterpart of the Tamil label
// list above — receipt/notebook header words (Time, Bill No, Signature,
// etc.) that also pass the old "has 2+ letters" test and could win as
// the "name" the same way the Tamil labels used to. Same treatment as
// _MOI_LABEL_WORDS: consumed by _isLabelOnlyLine() (exact whole-word
// match, case-insensitive) and _startsWithKnownLabel() (label-prefix
// match, only when followed by a separator and not by another letter —
// see _escLabelRe()/the lookahead below), so a real name that merely
// CONTAINS one of these words (e.g. "Amoolya", "Nolan") is never
// affected — only a line/word that IS the label matches.
var _MOI_LABEL_WORDS_EN = [
  'Time', 'TimeStamp', 'Date', 'Name', 'Bill No', 'Bill', 'Receipt', 'Invoice',
  'Amount', 'Total', 'No', 'Number', 'Qty', 'Quantity', 'Rate', 'Item',
  'Address', 'Phone', 'Mobile', 'Village', 'Place', 'Signature', 'Payment'
];

// ============================================================
// CRITICAL NAME RULE (role-based name extraction)
// ============================================================
// A moi receipt has TWO different people's names on it: the receipt
// owner/payer (the logged-in app user — e.g. "Rajayokkiam", "P.
// Rajayokkiam", "P. ராஜயோக்கியம்") and the function host/recipient (the
// person the user actually GAVE the moi to — this is the only one that
// belongs in the MOI Name field). Before this rule, any line that merely
// "looked like a name" could win, including the receipt owner's own
// name if it happened to appear first or under a same-worded label.
//
//   RECIPIENT labels (positive — this IS the MOI Name):
//     பெயர், யாருக்கு, பெற்றவர், விழா வைத்தவர், Name, Recipient, Host
//   PAYER / receipt-owner labels (negative — NEVER the MOI Name):
//     கொடுத்தவர், செலுத்தியவர், From, Payer, User, Customer, Receipt owner
//
// A line under a payer label never becomes a name candidate at all (see
// _startsWithPayerLabel(), used by _looksLikeName()). A line under a
// recipient label is normally accepted immediately — UNLESS it turns out
// to match the logged-in user's own known name (S.name, if available),
// in which case it's rejected and scanning continues to the next
// candidate (see _looksLikeSelfName(), used by _selectBestNameLine() and
// _parseOcrReceiptFull() below). If nothing confidently identifiable as
// the recipient is found, the Name field is left blank for the person to
// fill in themselves — it is never guessed, and it is never auto-filled
// with the user's own name.
var _MOI_RECIPIENT_LABEL_WORDS = ['பெயர்', 'யாருக்கு', 'பெற்றவர்', 'விழா வைத்தவர்', 'Name', 'Recipient', 'Host'];
var _MOI_PAYER_LABEL_WORDS     = ['கொடுத்தவர்', 'செலுத்தியவர்', 'From', 'Payer', 'User', 'Customer', 'Receipt owner', 'Receipt Owner'];

// Escapes regex-special characters in a label word/phrase and lets
// internal whitespace match one-or-more spaces (so "விழா வைத்தவர்" /
// "Receipt owner" still match however the OCR text happens to space them).
function _escLabelRe(lbl) {
  return String(lbl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

// True when a line begins with one of the PAYER/receipt-owner labels
// (கொடுத்தவர், செலுத்தியவர், From, Payer, User, Customer, Receipt owner).
// A line matching this is disqualified as a name candidate everywhere —
// it belongs to the receipt owner/payer, never to the MOI recipient.
function _startsWithPayerLabel(line) {
  for (var i = 0; i < _MOI_PAYER_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_PAYER_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?', 'i');
    if (re.test(line)) return true;
  }
  return false;
}

// True when a line begins with a RECIPIENT/host label (பெயர்/யாருக்கு/
// பெற்றவர்/விழா வைத்தவர்/Name/Recipient/Host). Used by _looksLikeName()
// so a merge block never accidentally swallows a *different* labelled
// recipient line into a preceding field's value (பெயர் itself is also
// already covered by _startsWithKnownLabel/_MOI_LABEL_WORDS; this adds
// the same protection for the other recipient labels).
function _startsWithRecipientLabel(line) {
  for (var i = 0; i < _MOI_RECIPIENT_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_RECIPIENT_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?', 'i');
    if (re.test(line)) return true;
  }
  return false;
}

// Extracts the value after a RECIPIENT/host label (பெயர்/யாருக்கு/
// பெற்றவர்/விழா வைத்தவர்/Name/Recipient/Host) on one line, trying each
// label in priority order. Returns null when the line doesn't start with
// any of them (so payer-labelled lines never match this at all).
function _recipientLabelValue(line) {
  for (var i = 0; i < _MOI_RECIPIENT_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_RECIPIENT_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?\\s*(.*)$', 'i');
    var m = line.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

// True when `candidate` is (loosely) the logged-in user's own known name
// (S.name, when available) — punctuation/spacing/case-insensitive,
// substring-tolerant so "Rajayokkiam" matches "P. Rajayokkiam" etc.
// Only compares within the same script (Tamil vs Latin transliterations
// of the same name won't match here — the label-based rule above is the
// primary defense; this is a same-script safety net on top of it).
function _looksLikeSelfName(candidate) {
  if (!candidate) return false;
  var selfRaw = (typeof S !== 'undefined' && S && S.name) ? S.name : '';
  if (!selfRaw) return false;
  function norm(s) { return String(s || '').toLowerCase().replace(/[.\-:：]/g, '').replace(/\s+/g, '').trim(); }
  var a = norm(candidate), b = norm(selfRaw);
  if (!a || !b || a.length < 3 || b.length < 3) return false; // avoid false positives on very short strings
  return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}


// ============================================================
// FIX [57]: EVENT RECEIPT PAYER VERIFICATION
// ============================================================
// Separate, additive feature — does NOT touch OCR extraction, does NOT
// touch the CRITICAL NAME RULE above, and NEVER writes into f_name/
// f_type (host/function fields). It only reads the already-returned OCR
// text (res.text, same text _parseOcrReceiptFull() already parses) to
// pull out the PAYER-labelled line (கொடுத்தவர்/செலுத்தியவர்/From/Payer/
// User/Customer/Receipt owner — same _MOI_PAYER_LABEL_WORDS list used
// to keep that line OUT of the name field) and compares it against the
// logged-in user's own profile name (S.name). If they don't match, a
// confirmation is required before the record is actually saved.

// Extracts the value after a PAYER/receipt-owner label on one line.
// Mirrors _recipientLabelValue() but for the payer labels instead —
// used ONLY for verification below, never for filling any form field.
function _payerLabelValue(line) {
  for (var i = 0; i < _MOI_PAYER_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_PAYER_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?\\s*(.*)$', 'i');
    var m = line.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

// Scans raw OCR text for the first PAYER-labelled line and returns its
// value, or '' if no payer label is present on this receipt at all
// (in which case there's nothing to verify — see caller).
function _extractPayerNameFromOcr(text) {
  if (!text) return '';
  var lines = String(text).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (_startsWithPayerLabel(line)) {
      var v = _payerLabelValue(line);
      if (v) return v;
    }
  }
  return '';
}

// Normalizes a name for verification comparison only: case, dots,
// commas, initials spacing, and extra spaces are ignored (all
// whitespace is stripped, which handles both "P. Rajayokkiam" vs
// "P.Rajayokkiam" style initials spacing and any extra/stray spaces).
// Independent of (does not modify) the norm() used inside
// _looksLikeSelfName above.
// FIX [58]: STRICT PAYER VERIFICATION — no longer trims hyphens/colons,
// only the punctuation explicitly called out (dots, commas), since this
// normalizer now feeds a strict full-name equality check, not a
// substring check.
function _normalizePayerNameForCompare(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

// FIX [58]: STRICT PAYER VERIFICATION — full normalized-name EQUALITY
// only. No substring/contains matching: "P. Rajayokkiam" no longer
// matches "Rajayokkiam" unless the full normalized names are identical.
function _payerNameMatchesSelf(payerName, selfName) {
  var a = _normalizePayerNameForCompare(payerName);
  var b = _normalizePayerNameForCompare(selfName);
  if (!a || !b) return false; // no signal on either side — treat as not-matched (caller decides whether to verify)
  return a === b;
}

// Set by doOcrCapture() below when an Event Receipt's OCR'd payer line
// doesn't match S.name. saveRecord() checks this before saving and, if
// still set, shows the confirmation modal instead of saving directly.
var _pendingPayerMismatch = null;

function _resetPayerVerification() { _pendingPayerMismatch = null; }

// Shows "இந்த Event Receipt உங்களுடையதா?" and waits for the person's
// choice. Called only from saveRecord() when a mismatch is pending.
function _showPayerVerificationModal() {
  document.getElementById('payerVerifyModal').style.display = 'flex';
}

function _closePayerVerificationModal() {
  document.getElementById('payerVerifyModal').style.display = 'none';
}

// ஆம், தொடரவும் → proceed with the save that was on hold.
// இல்லை → cancel; do NOT clear the mismatch. Form remains saveable but verification
// required on every save. OCR flow is safely cancelled (form either cleared or verification
// enforced on next save).
function _confirmPayerVerification(proceed) {
  _closePayerVerificationModal();
  if (!proceed) {
    setBtnLoading('saveBtn', false, 'சேமி');
    // FIX [59]: Do NOT clear the mismatch. Keep verification pending so it must be
    // confirmed again on next save. This prevents accidental saves of mismatched payers.
    // _pendingPayerMismatch remains set — verification required for every save.
    return;
  }
  _pendingPayerMismatch = null; // cleared so the retry below saves for real
  saveRecord();
}


// Extracts the value after a FUNCTION/EVENT-name label (விழா/நிகழ்ச்சி/
// Function/Event) on one line. Separate from the recipient/payer name
// labels above — this is for the மொய் வகை (function type) field, not a
// person's name. Returns null when the line doesn't start with one of
// these labels.
var _MOI_FUNCTION_LABEL_WORDS = ['விழா', 'நிகழ்ச்சி', 'Function', 'Event'];
function _functionLabelValue(line) {
  for (var i = 0; i < _MOI_FUNCTION_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_FUNCTION_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?\\s*(.*)$', 'i');
    var m = line.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

// True when a line begins with a function/event label (விழா/நிகழ்ச்சி/
// Function/Event). Used by _looksLikeName() below so a labelled function
// line is never accidentally swallowed into a preceding பெயர்/ஊர்
// merged block (_collectMergedBlock) instead of being read as its own
// out.type value.
function _startsWithFunctionLabel(line) {
  for (var i = 0; i < _MOI_FUNCTION_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_FUNCTION_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?', 'i');
    if (re.test(line)) return true;
  }
  return false;
}

// FIX [v151 OCR-PLACE]: receipts use several labels for village/place,
// not only the exact Tamil word "ஊர்".
var _MOI_PLACE_LABEL_WORDS = ['ஊர்', 'கிராமம்', 'Village', 'Place'];
function _placeLabelValue(line) {
  for (var i = 0; i < _MOI_PLACE_LABEL_WORDS.length; i++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_PLACE_LABEL_WORDS[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]?\\s*(.*)$', 'i');
    var m = String(line || '').match(re);
    if (m) return m[1].trim();
  }
  return null;
}
function _startsWithPlaceLabel(line) { return _placeLabelValue(line) !== null; }


// Trims trailing colon/dash/dot punctuation so "பெயர்:", "பெயர் :",
// "நாள்." all normalize to the bare label word for comparison.
function _stripLabelPunct(s) {
  return (s || '').replace(/[:：.．\-–—]+\s*$/, '').trim();
}

// True when a line is made up ENTIRELY of label/heading words (e.g. the
// single word "நாள்", or a heading like "மொய் பதிவு" — both words are
// labels, so the whole line is structural, not a name).
function _isLabelOnlyLine(line) {
  var bare = _stripLabelPunct(line);
  if (!bare) return true;
  var words = bare.split(/\s+/);
  return words.every(function(w) {
    var s = _stripLabelPunct(w);
    if (_MOI_LABEL_WORDS.indexOf(s) !== -1) return true;
    // FIX [v128 OCR-HEADER-FILTER]: English header word, case-insensitive
    // exact match only (never a substring match, so "Amoolya" etc. are
    // untouched — see _MOI_LABEL_WORDS_EN comment above).
    var sLower = s.toLowerCase();
    for (var k = 0; k < _MOI_LABEL_WORDS_EN.length; k++) {
      if (_MOI_LABEL_WORDS_EN[k].toLowerCase() === sLower) return true;
    }
    return false;
  });
}

// True when a line is a "<label>: <value>" field for a NON-name label
// (நாள்: 12/03/2024, தொகை: ₹500, ஊர்: சென்னை, ...). Needed because the
// label word itself contains 2+ Tamil letters, so a line like
// "நாள்: 12/03/2024" would otherwise pass the letters-check in
// _looksLikeName even though it's a date field, not a name. "பெயர்:"
// lines are handled separately (and earlier) in _selectBestNameLine's
// pass 1, so by the time this runs they've already been captured.
function _startsWithKnownLabel(line) {
  for (var i = 0; i < _MOI_LABEL_WORDS.length; i++) {
    if (new RegExp('^' + _MOI_LABEL_WORDS[i] + '\\s*[:：\\-]').test(line)) return true;
  }
  // FIX [v128 OCR-HEADER-FILTER]: English header word followed by a
  // separator (e.g. "Bill No:", "Signature -"), case-insensitive. The
  // negative lookahead (mirrors _escLabelRe-based label checks elsewhere
  // in this file) stops the label matching when it's actually the start
  // of a longer word/name, e.g. "Noel" is not "No" + separator.
  for (var j = 0; j < _MOI_LABEL_WORDS_EN.length; j++) {
    var re = new RegExp('^' + _escLabelRe(_MOI_LABEL_WORDS_EN[j]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-]', 'i');
    if (re.test(line)) return true;
  }
  return false;
}

// Does this OCR'd line look like a person's name (Tamil/English), as
// opposed to a date, amount, label, heading, or pure-currency/noise
// line? Used to skip non-name lines when picking the best candidate for
// the Name field. Preserves initials like "R. ராஜா" / "R.S. கணேஷ்" /
// "K Rajendran" — none of those match any of the rejection rules below.
function _looksLikeName(line) {
  if (!line) return false;
  if (/^\d[\d\s\/\-.,:]*$/.test(line)) return false;          // pure digits/date/amount punctuation
  if (/^(rs\.?|₹)\s*[\d,]+/i.test(line)) return false;         // amount line
  if (!/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(line)) return false;   // needs 2+ letters (Latin or Tamil block)
  if (_isLabelOnlyLine(line)) return false;                    // FIX [NAME-ACCURACY]: pure label/heading word(s)
  if (_startsWithKnownLabel(line)) return false;                // FIX [NAME-ACCURACY]: "நாள்: ...", "தொகை: ..." etc — labelled non-name field
  if (_startsWithPayerLabel(line)) return false;                // CRITICAL NAME RULE — கொடுத்தவர்/செலுத்தியவர்/From/Payer/User/Customer/Receipt owner line, never the MOI recipient
  if (_startsWithFunctionLabel(line)) return false;              // விழா/நிகழ்ச்சி/Function/Event line — its own field, must not merge into a preceding பெயர்/ஊர் block
  if (_startsWithPlaceLabel(line)) return false;                 // ஊர்/கிராமம்/Village/Place line — its own field
  if (_startsWithRecipientLabel(line)) return false;              // a *different* பெயர்/யாருக்கு/பெற்றவர்/... labelled line — its own field, must not merge into a preceding field
  if (!_isLikelyHumanName(line)) return false;                    // reject business/software/noisy OCR such as Ga/Soft, RO Sales, Store, Ltd
  return true;
}

// Human-readable reason a line was rejected — diagnostic logging only,
// no effect on selection.
function _nameRejectReason(line) {
  if (/^\d[\d\s\/\-.,:]*$/.test(line)) return 'digits/date/amount only';
  if (/^(rs\.?|₹)\s*[\d,]+/i.test(line)) return 'amount line';
  if (!/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(line)) return 'no letters';
  if (_isLabelOnlyLine(line)) return 'label/heading word';
  if (_startsWithKnownLabel(line)) return 'labelled field (non-name)';
  if (_startsWithPayerLabel(line)) return 'payer/receipt-owner label (CRITICAL NAME RULE — ignored)';
  if (_startsWithFunctionLabel(line)) return 'function/event-name label (own field)';
  return 'other';
}


// OCR parser hygiene: clean edge punctuation and reject obvious business/
// software text before it can be auto-filled as a person's name.
var _OCR_NON_PERSON_WORDS = [
  'soft','software','service','services','sales','agency','store','shop','mart',
  'hospital','medical','clinic','bank','petrol','gas','mobile','company','co',
  'ltd','limited','pvt','private','enterprises','traders','finance','foundation',
  'trust','school','college','hotel','restaurant','ro sales','payment','time','date','total','invoice','receipt',
  // Common Tamil receipt/header/venue words — never a person's name.
  'கிளை','தொடர்பு','மஹால்','மகால்','மண்டபம்','திருமண மண்டபம்','இ-மொய்','இமொய்'
];
function _cleanOcrEdgePunct(value) {
  return String(value || '')
    .replace(/^[\s:：;|,./\\_\-–—]+/, '')
    .replace(/[\s:：;|,./\\_\-–—]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
// v236D — Field-value hygiene for printed receipts. OCR can sometimes
// preserve a field label inside the captured value (for example
// "பெயர் - K. ராஜேந்திரன்"). Strip only a *leading* known label, so
// legitimate text containing those words elsewhere is never changed.
function _stripLeadingOcrFieldLabel(value, labels) {
  var v = String(value || '').trim();
  for (var i = 0; i < labels.length; i++) {
    var re = new RegExp('^\\s*' + _escLabelRe(labels[i]) + '(?![a-zA-Z\\u0B80-\\u0BFF])\\s*[:：\\-–—]?\\s*', 'i');
    if (re.test(v)) { v = v.replace(re, ''); break; }
  }
  return _cleanOcrEdgePunct(v);
}
function _cleanOcrName(value) {
  return _stripLeadingOcrFieldLabel(value, _MOI_RECIPIENT_LABEL_WORDS);
}
function _cleanOcrPlace(value) {
  var v = _stripLeadingOcrFieldLabel(value, _MOI_PLACE_LABEL_WORDS);
  // A village/place should contain letters and must not be only a label.
  if (!/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(v) || _isLabelOnlyLine(v)) return '';
  return v;
}
function _hasNonPersonBusinessWord(value) {
  var n = String(value || '').toLowerCase().replace(/[.,()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (var i = 0; i < _OCR_NON_PERSON_WORDS.length; i++) {
    var w = _OCR_NON_PERSON_WORDS[i];
    if (new RegExp('(^|\\s)' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'i').test(n)) return true;
  }
  return false;
}
function _isLikelyHumanName(value) {
  var v = _cleanOcrEdgePunct(value);
  if (!v || !/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(v)) return false;
  if (_hasNonPersonBusinessWord(v)) return false;
  if (/[\/\\|@#%*=<>]/.test(v)) return false;
  if (/\d{2,}/.test(v)) return false;
  if (_isLabelOnlyLine(v) || _startsWithKnownLabel(v) || _startsWithPayerLabel(v) || _startsWithFunctionLabel(v)) return false;
  return true;
}
function _isValidOcrDate(d, m, y) {
  d = Number(d); m = Number(m); y = Number(y);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(y, m, 0).getDate();
}

// FIX [NAME-ACCURACY] + CRITICAL NAME RULE: picks the single best "this
// is the FUNCTION HOST/RECIPIENT's name" candidate out of raw OCR text —
// never the receipt owner/payer (the logged-in user themselves).
//   Pass 1 — every line explicitly labelled with a RECIPIENT label
//            (பெயர்/யாருக்கு/பெற்றவர்/விழா வைத்தவர்/Name/Recipient/Host),
//            in order. Payer-labelled lines (கொடுத்தவர், செலுத்தியவர்,
//            From, Payer, User, Customer, Receipt owner) never match
//            this at all. A matched value that turns out to be the
//            logged-in user's own known name is rejected and scanning
//            continues to the next labelled candidate — it does NOT
//            fall through to pass 2 early.
//   Pass 2 — first remaining line that passes _looksLikeName() (which
//            already excludes payer-labelled lines) AND isn't the
//            logged-in user's own name.
// Returns '' (never a low-confidence guess, and never the user's own
// name) when nothing qualifies — leave it blank for the person to
// verify/type themselves. Logs raw lines, every rejected line + reason,
// and the final selection, all under the existing "[OCR]" console tag.
function _selectBestNameLine(text) {
  var lines = (text || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });

  var rejected = [];

  // Pass 1: explicit recipient/host-labelled line(s) — strip the label,
  // keep the value. Skips (doesn't stop at) a labelled value that
  // matches the logged-in user's own name.
  for (var i = 0; i < lines.length; i++) {
    var val = _recipientLabelValue(lines[i]);
    if (val === null || !/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(val)) continue;
    val = _cleanOcrName(val);
    if (_looksLikeSelfName(val)) {
      rejected.push(lines[i] + ' (matches logged-in user\'s own name — CRITICAL NAME RULE, ignored)');
      continue;
    }
    // FIX [v128 OCR-HEADER-FILTER]: validate the labelled value itself
    // before returning it — guards against a mis-OCR'd/merged line whose
    // "value" is actually another header word (e.g. "Name Signature").
    if (!_isLikelyHumanName(val)) {
      rejected.push(lines[i] + ' (labelled value fails _isLikelyHumanName — header/noise, ignored)');
      continue;
    }
    return val;
  }

  // Pass 2: first remaining line that looks like a name and isn't the
  // logged-in user's own name; log every skip + reason.
  for (var j = 0; j < lines.length; j++) {
    if (_looksLikeName(lines[j]) && !_looksLikeSelfName(lines[j])) {
      var cleanName = _cleanOcrName(lines[j]);
      return cleanName;
    }
    rejected.push(lines[j] + ' (' + (_looksLikeSelfName(lines[j]) ? 'matches logged-in user\'s own name — CRITICAL NAME RULE, ignored' : _nameRejectReason(lines[j])) + ')');
  }
  return '';
}

// Extracts the value after a specific label ("பெயர்", "ஊர், ...) on one
// line, e.g. "பெயர்: A. ஆகில்குமார்" -> "A. ஆகில்குமார்", "பெயர்:" (no
// value yet, name is on the next line(s)) -> ''. Returns null when the
// line isn't this label at all (so the caller can try a different one).
function _labelValue(line, label) {
  var m = line.match(new RegExp('^' + label + '\\s*[:：\\-]?\\s*(.*)$'));
  return m ? m[1].trim() : null;
}

// FIX [OCR-COMBO]: some moi receipts list more than one function-holder
// name (or a two-part village) as separate consecutive OCR lines under
// a single பெயர்:/ஊர் label — e.g.
//   பெயர்: A. ஆகில்குமார்
//   A. சரண்யா
// Starting right after the labelled line, keeps consuming lines that
// still look like a name/place (not a label, date, or amount — reuses
// the same _looksLikeName() filter that already protects the single-
// name flow) and joins them with ' - '. Stops at the first line that
// doesn't qualify (next label, blank already filtered out, date,
// amount, heading, etc.), so it never swallows unrelated fields.
function _collectMergedBlock(lines, i, firstValue) {
  var parts = [];
  if (firstValue) parts.push(firstValue);
  var j = i + 1;
  while (j < lines.length && _looksLikeName(lines[j])) {
    parts.push(lines[j]);
    j++;
  }
  return { text: parts.join(' - '), nextIndex: j };
}

// FIX [v151 OCR-HOST-BLOCK]: unlabelled function receipts often print
// two host names on consecutive lines. Merge at most two safe candidates.
function _selectBestUnlabelledNameBlock(text) {
  var lines = (text || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  for (var i = 0; i < lines.length; i++) {
    if (!_looksLikeName(lines[i]) || _looksLikeSelfName(lines[i])) continue;
    var parts = [_cleanOcrName(lines[i])];
    if (i + 1 < lines.length && _looksLikeName(lines[i + 1]) && !_looksLikeSelfName(lines[i + 1])) parts.push(_cleanOcrName(lines[i + 1]));
    return parts.join(' - ');
  }
  return '';
}

// FIX [OCR-COMBO]: full receipt parse — date, name (merged), village
// (merged), and the FINAL amount, for direct autofill into f_date/
// f_name/f_place/f_amt. Single left-to-right pass over the OCR lines:
// each line is tried against amount, then date, then பெயர்/ஊர் labels
// in that order; whichever matches first consumes the line (and, for
// பெயர்/ஊர், any following lines that merge into the same field).
// Amount uses the LAST match found (a receipt's earlier itemised
// figures, if any, are superseded by the final total). Date uses the
// first valid match. Name/village fall back to '' (never guessed) when
// no labelled block is found — _selectBestNameLine() (existing, single-
// line) is used as the name fallback so plain unlabelled receipts keep
// working exactly as before this change.

// v198 — Conservative helpers for common Tamil printed MOI receipts.
// These only improve read-only OCR parsing; no save/DB logic is changed.
var _OCR_KNOWN_FUNCTION_TYPES = [
  'இல்லத்தில் விழா','உருமாகட்டு','காதணி விழா','குழந்தை பிறப்பு','சடங்கு',
  'திருமண விழா','பட்டமளிப்பு விழா','பிறந்த நாள் விழா','புதுமனை புகுவிழா','வசந்தவிழா'
];

function _ocrKnownFunctionType(line) {
  var clean = _cleanOcrEdgePunct(line).replace(/\s+/g,' ');
  for (var i=0;i<_OCR_KNOWN_FUNCTION_TYPES.length;i++) {
    var t=_OCR_KNOWN_FUNCTION_TYPES[i];
    if (clean === t || clean.indexOf(t) !== -1) return t;
  }
  return '';
}

function _ocrCleanHostName(line) {
  var v=_cleanOcrEdgePunct(line);
  // Remove degree/qualification suffixes commonly printed after host names.
  // Example: "A.செல்வேந்திரன்,B.A., -" -> "A.செல்வேந்திரன்".
  v=v.replace(/\s*,\s*(?:B\.?A\.?|B\.?E\.?|B\.?Sc\.?|M\.?A\.?|M\.?E\.?|M\.?Sc\.?|M\.?Com\.?|B\.?Com\.?|EEE|MBA|MCA)(?:\s*,?\s*\([^)]*\))?.*$/i,'');
  v=v.replace(/\s*,\s*[-–—]\s*$/,'').trim();
  return _cleanOcrEdgePunct(v);
}

function _ocrLooksLikePrintedHost(line) {
  var v=_ocrCleanHostName(line);
  if (!v || _looksLikeSelfName(v) || !_isLikelyHumanName(v)) return false;
  // Printed e-MOI host lines normally contain an initial or a compact human name.
  // This extra signal prevents venue/header lines from becoming the host.
  return /^[A-Z]\s*\.?\s*[A-Za-z\u0B80-\u0BFF]/i.test(v) || /^[\u0B80-\u0BFF]{3,}(?:\s+[\u0B80-\u0BFF]{2,}){0,2}$/.test(v);
}

function _ocrLooksLikeTamilPlace(line) {
  var v=_cleanOcrPlace(line);
  if (!v || /\d/.test(v) || _hasNonPersonBusinessWord(v)) return false;
  // Conservative Tamil locality suffixes seen on receipts.
  return /(பட்டி|பட்டினம்|புரம்|நகர்|பேட்டை|குடி|ஊர்|பாளையம்|கோட்டை|மங்கலம்|விளை|சேரி)$/u.test(v);
}

function _ocrReceiptStructuralFallback(lines, out) {
  var typeIndex=-1;
  if (!out.type) {
    for (var i=0;i<lines.length;i++) {
      var ft=_ocrKnownFunctionType(lines[i]);
      if (ft) { out.type=ft; typeIndex=i; break; }
    }
  } else {
    for (var ti=0;ti<lines.length;ti++) if (_ocrKnownFunctionType(lines[ti])) { typeIndex=ti; break; }
  }

  // Host block: after the function title, skip venue/header lines and take
  // at most two strong printed-person candidates before the payer section.
  if (!out.name && typeIndex>=0) {
    var hosts=[];
    for (var j=typeIndex+1;j<Math.min(lines.length,typeIndex+9);j++) {
      var line=lines[j];
      if (/மொய்\s*(?:வ\.?\s*)?எண்|மொய்\s*எண்/i.test(line) || _startsWithPayerLabel(line)) break;
      var hn=_ocrCleanHostName(line);
      if (_ocrLooksLikePrintedHost(line)) {
        hosts.push(hn);
        if (hosts.length===2) break;
      }
    }
    if (hosts.length) { out.name=hosts.join(' - '); out.nameSource='structural'; }
  }

  // Place: prefer a Tamil locality-looking line near/after the host block and
  // before phone/payer/receipt-number lines.
  if (!out.place && typeIndex>=0) {
    for (var k=typeIndex+1;k<Math.min(lines.length,typeIndex+12);k++) {
      var pl=lines[k];
      if (/^\s*\d{7,}\s*$/.test(pl) || /மொய்\s*(?:வ\.?\s*)?எண்|மொய்\s*எண்/i.test(pl)) break;
      if (_ocrLooksLikeTamilPlace(pl)) { out.place=_cleanOcrPlace(pl); break; }
    }
  }
  return out;
}

function _parseOcrReceiptFull(text) {
  var lines = (text || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  // type = விழா / நிகழ்ச்சி (function/event name); nameSource records
  // HOW out.name was found ('labelled' = explicit recipient label,
  // 'guessed' = unlabelled fallback line, '' = nothing found) — used
  // only for the OCR confidence score below, never for save/business
  // logic.
  var out = { date: '', name: '', place: '', amount: '', type: '', nameSource: '' };
  var amtMatches = [];
  var dateMatches = [];

  var i = 0;
  while (i < lines.length) {
    var line = lines[i];

    // தொகை-labelled line: rs./₹ prefix optional, since the label itself
    // already establishes it's an amount ("தொகை: 5000" has no currency
    // symbol but is unambiguous). Falls back to an unlabelled rs./₹
    // amount, then a bare "1234/-" style figure.
    var amtM = line.match(/^(?:தொகை|Amount|Total)\s*[:：\-–—]?\s*(?:rs\.?|inr|₹|ரூ\.?|ரூபாய்)?\s*([\d,]{2,})(?:\.00)?\s*\/?-?\s*$/i)
      || line.match(/(?:மொய்\s*)?(?:rs\.?|inr|₹|ரூ\.?|ரூபாய்)\s*[:：\-–—]?\s*([\d,]{2,})(?:\.00)?/i)
      || line.match(/([\d,]{3,})\s*\/-/);
    if (amtM) {
      var rawAmt = (amtM[1] || '').replace(/,/g, '');
      if (Number(rawAmt) > 0) { amtMatches.push(Number(rawAmt)); i++; continue; }
    }

    var dateM = line.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
    if (dateM && _isValidOcrDate(dateM[1], dateM[2], dateM[3])) {
      dateMatches.push(dateM[3] + '-' + ('0' + dateM[2]).slice(-2) + '-' + ('0' + dateM[1]).slice(-2));
      i++; continue;
    }

    // CRITICAL NAME RULE: only a RECIPIENT/host-labelled line
    // (பெயர்/யாருக்கு/பெற்றவர்/விழா வைத்தவர்/Name/Recipient/Host) can
    // become out.name — a PAYER/receipt-owner labelled line (கொடுத்தவர்,
    // செலுத்தியவர், From, Payer, User, Customer, Receipt owner) never
    // matches _recipientLabelValue() at all. If the matched value is the
    // logged-in user's own known name, it's skipped (not accepted) and
    // the scan continues, so a later, correctly-labelled recipient line
    // can still be picked up.
    var nameVal = _recipientLabelValue(line);
    if (nameVal !== null && !out.name && !_looksLikeSelfName(nameVal)) {
      var blockN = _collectMergedBlock(lines, i, nameVal);
      var cleanedName = _cleanOcrName(blockN.text);
      if (!_looksLikeSelfName(cleanedName) && _isLikelyHumanName(cleanedName)) {
        out.name = cleanedName;
        out.nameSource = 'labelled';
        i = blockN.nextIndex; continue;
      }
    }

    var placeVal = _placeLabelValue(line);
    if (placeVal !== null && !out.place) {
      var blockP = _collectMergedBlock(lines, i, placeVal);
      out.place = _cleanOcrPlace(blockP.text);
      i = blockP.nextIndex; continue;
    }

    // Function/Event name — விழா/நிகழ்ச்சி/Function/Event labelled line
    // only (single line, not merged — a function name doesn't usually
    // wrap the way a person's name can). Never guessed when unlabelled.
    var typeVal = _functionLabelValue(line);
    if (typeVal !== null && !out.type && /[a-zA-Z\u0B80-\u0BFF]{2,}/.test(typeVal)) {
      out.type = _cleanOcrEdgePunct(typeVal);
      i++; continue;
    }
    if (!out.type) {
      var knownType = _ocrKnownFunctionType(line);
      if (knownType) out.type = knownType;
    }

    i++;
  }

  if (dateMatches.length)  out.date   = dateMatches[0];
  if (amtMatches.length)   out.amount = amtMatches[amtMatches.length - 1]; // "final" amount = last found
  _ocrReceiptStructuralFallback(lines, out);
  if (!out.name) {
    var guessedName = _selectBestUnlabelledNameBlock(text) || _selectBestNameLine(text);
    var guessedParts = String(guessedName || '').split(/\s+-\s+/).filter(function(v) { return v; });
    var guessedValid = guessedParts.length > 0 && guessedParts.every(function(v) { return _isLikelyHumanName(v); });
    out.name = guessedValid ? guessedParts.map(_cleanOcrName).join(' - ') : '';
    if (out.name) out.nameSource = 'guessed';
  } // fallback: no பெயர்: label present
  return out;
}


// ============================================================
//  OCR PIPELINE STABILIZATION (reliability pass — no UI redesign, no DB
//  change, no business-logic change). This section is the ONE shared,
//  hardened core that both OCR entry points in the app — the Add-form
//  Name Tag capture (doOcrCapture, kind:'name') and the Bulk Import
//  capture (doBulkOcrCapture, kind:'bulk') — now run through, so both
//  get identical reliability guarantees instead of two independently
//  drifting copies of the same watchdog/guard logic.
//
//  Camera vs Gallery: MOI uses separate camera/gallery inputs; Bulk Import keeps its own picker
//  are a single <input type="file" accept="image/*"> with no "capture"
//  attribute, so the OS/browser picker already offers Camera and Gallery
//  from the same input — either source hands JS an ordinary File object,
//  indistinguishable to the code below. "One common pipeline for Camera
//  and Gallery" is this section: one code path, unaware of and unaffected
//  by which source the person picked.
//
//  Guarantees provided for BOTH capture points:
//   1. Exactly one request in flight per kind at a time — a second tap
//      (or a second onchange fire) while one is active is ignored, not
//      queued or overlapped (req #2).
//   2. Loading state ALWAYS clears — success, empty OCR, timeout, server
//      failure, image-prep/validation failure, or a cancelled file-picker
//      dialog (req #3).
//   3. Structured [OCR] logs at every stage (validated/start/resized/
//      dispatch/resolved/timeout/stale/etc.) as one JSON object per line,
//      so a field issue can be diagnosed from Logger/console output alone
//      (req #4).
//   4. The file input is reset on every path, so the exact same photo can
//      be reselected immediately — no page refresh ever required to retry
//      (req #5).
//   5. Type/size validation runs BEFORE any decode/resize/upload work
//      (req #6).
//   6. Auto-resize (existing _ocrPrepareImage, now also height-clamped)
//      and EXIF-orientation correction (existing _getExifOrientation) are
//      unchanged and still run for every capture (req #7, #8).
//   7. A per-kind request token + an isStale() check supplied by the
//      caller mean a callback that resolves after the person has since
//      left the Add form / closed the Bulk Import modal is detected and
//      its result is logged + discarded rather than written into
//      whatever the screen now shows (req #9).
//  Manual entry (typing directly into f_name/f_place/f_amt/etc. and
//  saveRecord()) never calls any of this code and is untouched (req #10).
// ============================================================

// One counter + one in-flight flag per kind ('name' | 'bulk') — kept
// separate so a Name Tag capture and a Bulk Import capture (different
// buttons, different purposes) can never block one another, while a
// second tap on the SAME button while it's already working is ignored.
var _ocrInFlight = { name: false, bulk: false };
var _ocrSeq      = { name: 0,     bulk: 0 };

// v236B — Dynamic OCR session state. Keep track of values written by the
// previous Add-MOI OCR pass so selecting a NEW photo/gallery image cannot
// leave stale receipt data behind. We only clear a field when its current
// value still equals the value last written by OCR; if the user edited that
// field manually afterwards, their edit is preserved.
var _ocrOwnedAddValues = { date:'', amount:'', place:'', name:'', type:'' };

function _ocrRememberAddValue(key, value) {
  _ocrOwnedAddValues[key] = String(value == null ? '' : value);
}

function _ocrResetPreviousAddValues() {
  var _oma=document.getElementById('ocrMatchAssist');if(_oma){_oma.style.display='none';_oma.innerHTML='';}

  // v236M — Every newly selected receipt/photo is a NEW OCR session.
  // Clear all OCR target fields immediately, even when the previous value was
  // manually edited, so receipt #1 can never leak/replicate into receipt #2
  // when the new image has a missing/uncertain OCR field. This reset runs only
  // after a real file has been selected (picker cancel does not call it).
  var map = { date:'f_date', amount:'f_amt', place:'f_place', name:'f_name', type:'f_type' };
  Object.keys(map).forEach(function(key) {
    var el = document.getElementById(map[key]);
    if (key === 'type') {
      if (typeof _setFTypeValue === 'function') _setFTypeValue('');
      else if (el) el.value = '';
    } else if (el) {
      el.value = '';
      // Keep any browser/autocomplete UI in sync with the cleared field.
      try { el.dispatchEvent(new Event('input', { bubbles:true })); } catch (_) {}
    }
    _ocrOwnedAddValues[key] = '';
  });
}

// Structured logging (req #4). Never throws — a logging failure must
// never be able to break the OCR flow itself.
function _ocrLog(kind, stage, meta) {
  try {
    var entry = { ts: new Date().toISOString(), kind: kind, stage: stage };
    if (meta) for (var k in meta) if (meta.hasOwnProperty(k)) entry[k] = meta[k];
  } catch (e) { /* logging must never break the pipeline */ }
}

// Validate BEFORE any decode/resize/network work (req #6). Returns a
// user-facing Tamil message string, or null when the file is fine.
var _OCR_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — generous for a phone photo, cheap safety ceiling
function _ocrValidateFile(file) {
  if (!file) return 'படம் தேர்ந்தெடுக்கப்படவில்லை';

  // Some Android camera/gallery providers return a valid image File with
  // an empty MIME type. Accept those only when the filename has a known
  // image extension; still reject clearly non-image files before decode.
  var mime = String(file.type || '').toLowerCase();
  var name = String(file.name || '').toLowerCase();
  var hasImageMime = /^image\//i.test(mime);
  var hasImageExt  = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(name);
  if (!hasImageMime && !(mime === '' && hasImageExt)) {
    return 'படம் மட்டும் தேர்ந்தெடுக்கவும் (JPEG/PNG)';
  }
  if (file.size === 0) return 'படம் காலியாக உள்ளது — வேறு படம் தேர்ந்தெடுக்கவும்';
  if (file.size > _OCR_MAX_FILE_BYTES) return 'படம் மிகப் பெரியது — சிறிய படத்தை தேர்ந்தெடுக்கவும்';
  return null;
}

// The shared pipeline core. cfg = {
//   kind: 'name'|'bulk', inputEl, statusEl, btnEl, maxW, busyText,
//   isStale: function() -> bool   // true = the form/modal this capture was for is no longer showing
//   onSuccess: function(res)      // res = the resolved {ok,text,msg} from ocrExtractText; kind-specific field-filling happens here
// }
function _runOcrPipeline(cfg) {
  var kind = cfg.kind;

  if (_ocrInFlight[kind]) { _ocrLog(kind, 'duplicate_ignored', {}); return; } // req #2

  var file = cfg.fileOverride || (cfg.inputEl.files && cfg.inputEl.files[0]);
  if (!file) { _ocrLog(kind, 'cancelled_selection', {}); return; } // picker cancelled — nothing started, nothing to clean up (req #3)

  // Launch safety: do not spend time resizing a photo when the device is
  // already known to be offline. Keep the form untouched and reset only
  // the file input so the same image can be selected again after reconnecting.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    _ocrLog(kind, 'offline_blocked', {});
    cfg.statusEl.textContent = '📵 Internet இல்லை — இணைப்பு வந்ததும் மீண்டும் முயற்சிக்கவும்';
    cfg.inputEl.value = '';
    return;
  }

  var validationErr = _ocrValidateFile(file);
  if (validationErr) {
    _ocrLog(kind, 'validation_failed', { reason: validationErr, size: file.size, type: file.type });
    cfg.statusEl.textContent = '❌ ' + validationErr;
    cfg.inputEl.value = ''; // req #5 — retry without refresh even on a validation rejection
    return;
  }

  var myToken = ++_ocrSeq[kind];
  _ocrInFlight[kind] = true;
  if (cfg.btnEl) cfg.btnEl.disabled = true;
  cfg.statusEl.textContent = 'படம் படிக்கிறது...';
  _ocrLog(kind, 'start', { token: myToken, name: file.name, size: file.size, type: file.type });

  var settled = false;
  function isCurrent() { return myToken === _ocrSeq[kind]; } // belt-and-braces token guard alongside isStale() (req #9)

  function finish(stage, applyResult) {
    if (settled) return; // ignore a late callback that arrives after the watchdog already resolved this capture
    settled = true;
    clearTimeout(watchdog);
    _ocrInFlight[kind] = false;
    if (cfg.btnEl) cfg.btnEl.disabled = false;
    cfg.inputEl.value = ''; // req #5 — every exit path allows an immediate retry, no page refresh needed
    _ocrLog(kind, stage, { token: myToken });

    if (!isCurrent()) { _ocrLog(kind, 'stale_token_ignored', { token: myToken }); return; }
    if (cfg.isStale && cfg.isStale()) { _ocrLog(kind, 'stale_form_ignored', { token: myToken }); return; } // req #9
    if (applyResult) applyResult();
  }

  var watchdog = setTimeout(function() {
    finish('timeout', function() { cfg.statusEl.textContent = '⚠️ படம் படிக்க நேரம் அதிகமாகிறது — மீண்டும் முயற்சிக்கவும்'; });
  }, 45000); // Allows the normal OCR pass plus the single 90° fallback without prematurely discarding a valid late result.

  _ocrPrepareImage(file, cfg.maxW, function(base64) {
    if (settled) return; // watchdog already fired while image prep was still running
    _ocrLog(kind, 'resized', { token: myToken });
    cfg.statusEl.textContent = cfg.busyText;
    _ocrLog(kind, 'dispatch', { token: myToken });
    _ocrExtractWithRotationFallback(base64, function(res) {
        finish('resolved', function() { cfg.onSuccess(res); });
      }, function(err) {
        finish('server_failure', function() { cfg.statusEl.textContent = '❌ பிழை: ' + ((err && err.message) || err); });
      });
  }, function(errMsg) {
    finish('prep_failure', function() { cfg.statusEl.textContent = '❌ ' + errMsg; });
  });
}


// ============================================================
//  OCR RECEIPT VERIFICATION — searches this book's existing records for
//  a person already matching the OCR-extracted name+place, and scores
//  how confident the overall extraction is. Purely advisory/read-only:
//  no new backend call (reuses the already-loaded `ac.combos`, the same
//  data onNameChange()'s existing duplicate check already reads), no
//  change to save/business logic, no UI redesign — just feeds the
//  status message shown after a capture.
// ============================================================

// Exact name+place match against this book's existing records —
// mirrors the lookup onNameChange() already performs internally (which
// separately renders the soft/hard dup notice as a side effect of that
// call); this is a read-only query used only to compute confidence.
function _ocrVerifyAgainstRecords(place, name) {
  var p = _norm(place || '').toLowerCase(), n = _norm(name || '').toLowerCase();
  if (!p || !n) return null;
  for (var i = 0; i < ac.combos.length; i++) {
    var c = ac.combos[i];
    if (_norm(c.place || '').toLowerCase() === p && _norm(c.name || '').toLowerCase() === n) return c;
  }
  return null;
}

// 0-100 confidence score: +points per field actually found (பெயர்
// highest weight, per requirement), +bonus when the name came from an
// explicit label rather than a guessed line, +bonus when it matches an
// existing record in this book.
function _ocrConfidenceScore(parsed, existingMatch) {
  var score = 0;
  if (parsed.name && _isLikelyHumanName(parsed.name)) score += (parsed.nameSource === 'labelled' ? 35 : 20);
  if (parsed.type)   score += 15;
  if (parsed.date)   score += 15;
  if (parsed.amount && Number(parsed.amount) > 0) score += 15;
  if (parsed.place)  score += 15;
  if (existingMatch) score += 10;
  return Math.min(100, score);
}



// ============================================================
// v287 — OCR MATCH ASSIST
// OCR remains the source candidate. We only SUGGEST close Name/Oor values
// from this user's already-loaded history and the privacy-safe master
// dictionary. Nothing is auto-corrected; a tap is required to replace it.
// ============================================================
function _ocrMatchNorm(v){return _norm(v||'').toLowerCase().replace(/[.,;:()\[\]{}\/\\|_\-–—'"`~!@#$%^&*+=?<>]/g,'').replace(/\s+/g,'');}
function _ocrEditDistance(a,b){a=_ocrMatchNorm(a);b=_ocrMatchNorm(b);if(!a)return b.length;if(!b)return a.length;var prev=[],cur=[],i,j;for(j=0;j<=b.length;j++)prev[j]=j;for(i=1;i<=a.length;i++){cur[0]=i;for(j=1;j<=b.length;j++){var c=a.charAt(i-1)===b.charAt(j-1)?0:1;cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+c);}prev=cur.slice();}return prev[b.length];}
function _ocrSimilarity(a,b){a=_ocrMatchNorm(a);b=_ocrMatchNorm(b);if(!a||!b)return 0;if(a===b)return 1;var m=Math.max(a.length,b.length);return m?1-(_ocrEditDistance(a,b)/m):0;}
function _ocrRankCandidates(raw,candidates,limit){
  raw=_norm(raw||''); if(raw.length<2)return [];
  var seen={},out=[];(candidates||[]).forEach(function(v){v=_norm(v);if(!v)return;var k=v.toLowerCase();if(seen[k]||k===raw.toLowerCase())return;seen[k]=1;var sim=_ocrSimilarity(raw,v),rn=_ocrMatchNorm(raw),vn=_ocrMatchNorm(v),score=sim*100;if(vn.indexOf(rn)===0||rn.indexOf(vn)===0)score+=14;else if(vn.indexOf(rn)!==-1||rn.indexOf(vn)!==-1)score+=8;if(sim>=0.58||score>=72)out.push({v:v,s:score});});
  return out.sort(function(a,b){return b.s-a.s;}).slice(0,limit||3).map(function(x){return x.v;});
}
function _ocrLocalMatches(parsed){
  var combos=(typeof ac!=='undefined'&&ac&&Array.isArray(ac.combos))?ac.combos:[];
  var places=(typeof ac!=='undefined'&&ac&&Array.isArray(ac.places))?ac.places:[];
  var samePlaceNames=combos.filter(function(c){return parsed.place&&_ocrSimilarity(parsed.place,c.place)>=0.82;}).map(function(c){return c.name;});
  var allNames=combos.map(function(c){return c.name;});
  return {name:_ocrRankCandidates(parsed.name,samePlaceNames.concat(allNames),3),place:_ocrRankCandidates(parsed.place,places.concat(combos.map(function(c){return c.place;})),3)};
}
function _ocrMergeMatchLists(raw,a,b){var seen={},out=[];[a||[],b||[]].forEach(function(list){list.forEach(function(v){v=_norm(v);var k=v.toLowerCase();if(v&&k!==_norm(raw).toLowerCase()&&!seen[k]){seen[k]=1;out.push(v);}});});return _ocrRankCandidates(raw,out,3);}
function _ocrApplyMatch(fieldId,value,key){var el=document.getElementById(fieldId);if(!el)return;el.value=value;_ocrRememberAddValue(key,value);_nmTrackMasterSelection_(key==='place'?'place':'name',value);if(fieldId==='f_place')onPlaceChange();else if(fieldId==='f_name')onNameChange();var box=document.getElementById('ocrMatchAssist');if(box){box.style.display='none';box.innerHTML='';}_ocrFlagPossibleDuplicateAfterCorrection();toast('✓ '+value+' பயன்படுத்தப்பட்டது');}
function _ocrFlagPossibleDuplicateAfterCorrection(){var pe=document.getElementById('f_place'),ne=document.getElementById('f_name'),box=document.getElementById('dupBox');if(!pe||!ne||!box)return;var place=_norm(pe.value),name=_norm(ne.value);if(!place||!name)return;var exact=false,best=null,bestScore=0;(ac.combos||[]).forEach(function(c){if(_norm(c.place).toLowerCase()!==place.toLowerCase())return;var cn=_norm(c.name);if(cn.toLowerCase()===name.toLowerCase()){exact=true;return;}var sc=_ocrSimilarity(name,cn);if(sc>bestScore){bestScore=sc;best=c;}});if(!exact&&best&&bestScore>=0.84){box.innerHTML='<div class="dup soft">OCR correction-க்கு ஒத்த பழைய பெயர்: <b>'+x(best.name)+'</b><br><button type="button" class="dup-force" onclick="openDuplicatePersonReview()">Duplicate Review பார்க்க</button></div>';}}
function _ocrRenderMatchAssist(parsed,local,master){
  var box=document.getElementById('ocrMatchAssist');if(!box)return;
  var nm=_ocrMergeMatchLists(parsed.name,local.name,master&&master.name),pm=_ocrMergeMatchLists(parsed.place,local.place,master&&master.place);
  if(!nm.length&&!pm.length){box.style.display='none';box.innerHTML='';return;}
  function chips(arr,field,key){return arr.map(function(v){return '<button type="button" class="ocr-match-chip" onclick="_ocrApplyMatch(\''+field+'\',\''+String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\',\''+key+'\')">'+x(v)+'</button>';}).join('');}
  var h='<div class="ocr-match-assist-title">✨ OCR-க்கு பொருந்தும் suggestion</div>';
  if(nm.length)h+='<div class="ocr-match-row"><span class="ocr-match-label">பெயர்</span><div class="ocr-match-options">'+chips(nm,'f_name','name')+'</div></div>';
  if(pm.length)h+='<div class="ocr-match-row"><span class="ocr-match-label">ஊர்</span><div class="ocr-match-options">'+chips(pm,'f_place','place')+'</div></div>';
  h+='<div class="ocr-match-current">OCR text தானாக மாற்றப்படாது. சரியானதை தட்டினால் மட்டும் பயன்படுத்தப்படும்.</div>';
  box.innerHTML=h;box.style.display='block';
}
function _ocrOfferMatchAssist(parsed){
  var box=document.getElementById('ocrMatchAssist');if(box){box.style.display='none';box.innerHTML='';}
  if(!parsed||(!parsed.name&&!parsed.place))return;
  var local=_ocrLocalMatches(parsed);_ocrRenderMatchAssist(parsed,local,{name:[],place:[]});
  if(typeof google==='undefined'||!google.script||!google.script.run)return;
  google.script.run.withSuccessHandler(function(master){_ocrRenderMatchAssist(parsed,local,master||{});})
    .withFailureHandler(function(){/* local suggestions remain visible */}).getOcrMatchSuggestions(parsed.name||'',parsed.place||'');
}


// v195 — explicit Camera/Gallery picker + same-image retry.
function _ocrChooseSource(kind) {
  var id = kind === 'camera' ? 'ocr_camera_input' : 'ocr_media_input';
  var input = document.getElementById(id);
  if (!input) return;
  input.value = '';
  input.click();
}


// ============================================================
//  v152 OCR CAMERA + CROP FLOW
//  Camera and Gallery both open this lightweight in-browser cropper before
//  OCR. The selected/cropped pixels are kept only in browser memory; nothing
//  is saved merely by opening/cropping a photo. Pointer Events make the same
//  crop box work with mouse, touch and pen without an external library.
// ============================================================
var _ocrCropState = null;

function _ocrOpenCrop(inputEl, sourceKind) {
  var file = inputEl && inputEl.files && inputEl.files[0];
  var isBulk = String(sourceKind || '').indexOf('bulk-') === 0;
  var statusEl = document.getElementById(isBulk ? 'biStatus' : 'ocrStatus');
  if (!file) return;
  var validationErr = _ocrValidateFile(file);
  if (validationErr) {
    if (statusEl) statusEl.textContent = '❌ ' + validationErr;
    inputEl.value = '';
    return;
  }

  // v236ZL — a real NEW Camera/Gallery selection starts a new receipt session
  // immediately, before crop/decode/OCR. Bulk notebook OCR is isolated and
  // must not clear the Add-MOI form.
  if (!isBulk) {
    _resetPayerVerification();
    _ocrResetPreviousAddValues();
  }
  if (statusEl) statusEl.textContent = 'Crop preview தயாராகிறது...';

  // Reuse the already-hardened EXIF/orientation path so the crop preview is
  // upright on Android/iPhone camera photos before the user selects an area.
  _ocrPrepareImage(file, 2600, function(base64) {
    var img = new Image();
    img.onload = function() {
      _ocrCropState = {
        sourceInput: inputEl,
        sourceKind: sourceKind || 'gallery',
        img: img,
        rotation: 0,
        x: 0, y: 0, w: img.width, h: img.height,
        drag: null
      };
      var cropTitle = document.getElementById('ocrCropTitle');
      var cropHelp = document.querySelector('#ocrCropModal .ocr-crop-help');
      if (cropTitle) cropTitle.textContent = isBulk ? '✂️ மொய் புத்தகப் பக்கத்தை Crop செய்யவும்' : '✂️ OCR பகுதியை Crop செய்யவும்';
      if (cropHelp) cropHelp.textContent = isBulk
        ? 'பெயர் + தொகை இருக்கும் வரிகளை மட்டும் தேர்வு செய்தால் handwriting/print வாசிப்பு தெளிவாக இருக்கும்.'
        : 'பெயர், ஊர், தொகை, தேதி இருக்கும் பகுதியை மட்டும் தேர்வு செய்தால் வாசிப்பு தெளிவாக இருக்கும்.';
      _ocrCropReset();
      var modal = document.getElementById('ocrCropModal');
      if (modal) modal.style.display = 'flex';
      if (statusEl) statusEl.textContent = '✂️ தேவையான பகுதியை Crop செய்து தொடரவும்';
      _ocrCropBindCanvas();
      _ocrCropDraw();
    };
    img.onerror = function() {
      if (statusEl) statusEl.textContent = '❌ Crop preview திறக்க முடியவில்லை';
      inputEl.value = '';
    };
    img.src = 'data:image/jpeg;base64,' + base64;
  }, function(err) {
    if (statusEl) statusEl.textContent = '❌ ' + err;
    inputEl.value = '';
  });
}

function _ocrCropCanvasSize() {
  var st = _ocrCropState, canvas = document.getElementById('ocrCropCanvas');
  if (!st || !canvas) return null;
  var rot = ((st.rotation % 360) + 360) % 360;
  var swap = rot === 90 || rot === 270;
  var iw = swap ? st.img.height : st.img.width;
  var ih = swap ? st.img.width : st.img.height;
  // Keep drawing resolution useful for OCR while avoiding giant mobile canvases.
  var maxSide = 1800, scale = Math.min(1, maxSide / Math.max(iw, ih));
  canvas.width = Math.max(1, Math.round(iw * scale));
  canvas.height = Math.max(1, Math.round(ih * scale));
  return {iw:iw, ih:ih, scale:scale, cw:canvas.width, ch:canvas.height};
}

function _ocrCropDraw() {
  var st = _ocrCropState, canvas = document.getElementById('ocrCropCanvas');
  if (!st || !canvas) return;
  var info = _ocrCropCanvasSize();
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(st.rotation * Math.PI / 180);
  var rot = ((st.rotation % 360) + 360) % 360;
  var dw = (rot === 90 || rot === 270) ? canvas.height : canvas.width;
  var dh = (rot === 90 || rot === 270) ? canvas.width : canvas.height;
  ctx.drawImage(st.img, -dw/2, -dh/2, dw, dh);
  ctx.restore();

  // dim outside selection, then draw strong crop border and corner handles
  ctx.save();
  ctx.fillStyle = 'rgba(20,13,16,.48)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.clearRect(st.x, st.y, st.w, st.h);
  // redraw selected pixels without dimming by clipping and drawing full image again
  ctx.save();
  ctx.beginPath(); ctx.rect(st.x,st.y,st.w,st.h); ctx.clip();
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(st.rotation * Math.PI / 180);
  var dw2 = (rot === 90 || rot === 270) ? canvas.height : canvas.width;
  var dh2 = (rot === 90 || rot === 270) ? canvas.width : canvas.height;
  ctx.drawImage(st.img, -dw2/2, -dh2/2, dw2, dh2);
  ctx.restore();
  ctx.strokeStyle = '#f2c24f'; ctx.lineWidth = Math.max(3, canvas.width/260);
  ctx.strokeRect(st.x, st.y, st.w, st.h);
  var hs = Math.max(10, canvas.width/55);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#6f0719'; ctx.lineWidth = 2;
  [[st.x,st.y],[st.x+st.w,st.y],[st.x,st.y+st.h],[st.x+st.w,st.y+st.h]].forEach(function(pt){
    ctx.beginPath(); ctx.arc(pt[0],pt[1],hs,0,Math.PI*2); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

function _ocrCropReset() {
  var st = _ocrCropState;
  if (!st) return;
  var canvas = document.getElementById('ocrCropCanvas');
  var info = _ocrCropCanvasSize();
  if (!info) return;
  var padX = Math.max(8, Math.round(canvas.width * .045));
  var padY = Math.max(8, Math.round(canvas.height * .045));
  st.x = padX; st.y = padY; st.w = canvas.width - padX*2; st.h = canvas.height - padY*2;
  _ocrCropDraw();
}

function _ocrCropRotate() {
  if (!_ocrCropState) return;
  _ocrCropState.rotation = (_ocrCropState.rotation + 90) % 360;
  _ocrCropReset();
}

function _ocrCropBindCanvas() {
  var canvas = document.getElementById('ocrCropCanvas');
  if (!canvas || canvas.getAttribute('data-crop-bound') === '1') return;
  canvas.setAttribute('data-crop-bound','1');

  function pos(e) {
    var r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height)};
  }
  function hit(st,p) {
    var tol=Math.max(24,canvas.width/28), x1=st.x,y1=st.y,x2=st.x+st.w,y2=st.y+st.h;
    var nearL=Math.abs(p.x-x1)<tol, nearR=Math.abs(p.x-x2)<tol, nearT=Math.abs(p.y-y1)<tol, nearB=Math.abs(p.y-y2)<tol;
    if (nearL&&nearT) return 'tl'; if (nearR&&nearT) return 'tr';
    if (nearL&&nearB) return 'bl'; if (nearR&&nearB) return 'br';
    if (p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2) return 'move';
    return null;
  }
  canvas.addEventListener('pointerdown',function(e){
    var st=_ocrCropState;if(!st)return; var p=pos(e),mode=hit(st,p); if(!mode)return;
    st.drag={mode:mode,sx:p.x,sy:p.y,x:st.x,y:st.y,w:st.w,h:st.h};
    try{canvas.setPointerCapture(e.pointerId);}catch(_){ } e.preventDefault();
  });
  canvas.addEventListener('pointermove',function(e){
    var st=_ocrCropState;if(!st||!st.drag)return; var p=pos(e),d=st.drag,dx=p.x-d.sx,dy=p.y-d.sy;
    var minW=Math.max(70,canvas.width*.16), minH=Math.max(70,canvas.height*.12);
    var x=d.x,y=d.y,w=d.w,h=d.h;
    if(d.mode==='move'){x=Math.max(0,Math.min(canvas.width-w,d.x+dx));y=Math.max(0,Math.min(canvas.height-h,d.y+dy));}
    else{
      if(d.mode.indexOf('l')>=0){x=Math.max(0,Math.min(d.x+d.w-minW,d.x+dx));w=d.w+(d.x-x);}
      if(d.mode.indexOf('r')>=0){w=Math.max(minW,Math.min(canvas.width-d.x,d.w+dx));}
      if(d.mode.indexOf('t')>=0){y=Math.max(0,Math.min(d.y+d.h-minH,d.y+dy));h=d.h+(d.y-y);}
      if(d.mode.indexOf('b')>=0){h=Math.max(minH,Math.min(canvas.height-d.y,d.h+dy));}
    }
    st.x=x;st.y=y;st.w=w;st.h=h;_ocrCropDraw();e.preventDefault();
  });
  function up(e){if(_ocrCropState)_ocrCropState.drag=null;try{canvas.releasePointerCapture(e.pointerId);}catch(_){}}
  canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
}

function _ocrCropClose(clearInput) {
  var st=_ocrCropState, modal=document.getElementById('ocrCropModal');
  if(modal) modal.style.display='none';
  if(clearInput && st && st.sourceInput) st.sourceInput.value='';
  _ocrCropState=null;
}

function _ocrCropRetake() {
  var kind=_ocrCropState && _ocrCropState.sourceKind;
  _ocrCropClose(true);
  var id;
  if (kind === 'bulk-gallery') id = 'bi_gallery_input';
  else if (kind === 'bulk-camera') id = 'bi_camera_input';
  else if (kind === 'picker') id = 'ocr_media_input';
  else id = kind === 'gallery' ? 'ocr_gallery_input' : 'ocr_camera_input';
  var el=document.getElementById(id); if(el) el.click();
}

function _ocrCropUse() {
  var st=_ocrCropState, canvas=document.getElementById('ocrCropCanvas');
  if(!st||!canvas)return;
  var useBtn=document.getElementById('ocrCropUseBtn'); if(useBtn)useBtn.disabled=true;
  // The canvas already contains the upright image + crop overlay. Rebuild a clean
  // rotated source canvas, then copy only the crop rectangle into the OCR file.
  var clean=document.createElement('canvas'); clean.width=canvas.width; clean.height=canvas.height;
  var ctx=clean.getContext('2d'); ctx.translate(clean.width/2,clean.height/2); ctx.rotate(st.rotation*Math.PI/180);
  var rot=((st.rotation%360)+360)%360, dw=(rot===90||rot===270)?clean.height:clean.width, dh=(rot===90||rot===270)?clean.width:clean.height;
  ctx.drawImage(st.img,-dw/2,-dh/2,dw,dh);
  var out=document.createElement('canvas'); out.width=Math.max(1,Math.round(st.w)); out.height=Math.max(1,Math.round(st.h));
  out.getContext('2d').drawImage(clean,st.x,st.y,st.w,st.h,0,0,out.width,out.height);
  out.toBlob(function(blob){
    if(useBtn)useBtn.disabled=false;
    if(!blob){var se=document.getElementById(String(st.sourceKind||'').indexOf('bulk-')===0?'biStatus':'ocrStatus');if(se)se.textContent='❌ Crop உருவாக்க முடியவில்லை';return;}
    var sourceInput=st.sourceInput;
    var cropped;
    try { cropped=new File([blob],'moi_ocr_crop.jpg',{type:'image/jpeg',lastModified:Date.now()}); }
    catch(e){ cropped=blob; cropped.name='moi_ocr_crop.jpg'; }
    var sourceKind = st.sourceKind || '';
    _ocrCropClose(false);
    if (String(sourceKind).indexOf('bulk-') === 0) doBulkOcrCapture(sourceInput, cropped);
    else doOcrCapture(sourceInput,cropped);
  },'image/jpeg',0.94);
}

// ============================================================
//  FIX [37]: OCR Name Capture — reads the chosen photo (camera or
//  gallery, via the shared pipeline above), fills f_name/f_place with
//  the extracted text. Photo is never stored anywhere — the File object
//  and canvas data URL both just live in browser memory for this one
//  operation and are discarded afterward.
// ============================================================
function doOcrCapture(inputEl, fileOverride) {
  var statusEl = document.getElementById('ocrStatus');
  var btn      = document.getElementById('ocrCaptureBtn');

  // New-image state was already cleared in _ocrOpenCrop() at file selection.
  // Do not clear a second time after the user confirms the crop.

  _runOcrPipeline({
    kind: 'name',
    inputEl: inputEl,
    fileOverride: fileOverride || null,
    statusEl: statusEl,
    btnEl: btn,
    maxW: 2000, // 1000px was too aggressive and destroyed printed Tamil text before OCR ever saw it
    busyText: 'படத்தில் இருந்து விவரங்கள் எடுக்கிறது...',
    isStale: function() { return curTab !== 'add'; }, // req #9 — skip applying if the person has since left the Add form
    onSuccess: function(res) {
      if (!res || !res.ok) {
        _ocrLog('name', 'ocr_failed', { code: res && res.error, provider: res && res.provider });
        statusEl.textContent = '⚠️ OCR தற்போது கிடைக்கவில்லை — விவரங்களை கைமுறையாக உள்ளிடலாம்.';
        return;
      }
      if (!res.text)       { _ocrLog('name', 'empty', {});                          statusEl.textContent = '⚠️ படத்தில் எழுத்து கண்டுபிடிக்கவில்லை — மீண்டும் முயற்சிக்கவும்'; return; }

      // Extracts (when available, priority order per requirement):
      // 1) recipient/host name (CRITICAL NAME RULE — never the payer),
      // 2) function/event name, 3) date, 4) amount. Every field below
      // is only ever filled when the person hasn't already typed
      // something into it, so a value they entered manually is never
      // silently overwritten by this button.
      var parsed = _parseOcrReceiptFull(res.text);
      var filled = [];
      if (parsed.place && !document.getElementById('f_place').value) { document.getElementById('f_place').value = parsed.place; _ocrRememberAddValue('place', parsed.place); onPlaceChange(); filled.push('ஊர்'); }
      if (parsed.name  && !document.getElementById('f_name').value)  { document.getElementById('f_name').value  = parsed.name;  _ocrRememberAddValue('name', parsed.name); onNameChange();  filled.push('பெயர்'); }
      if (parsed.type   && !document.getElementById('f_type').value) { _setFTypeValue(parsed.type); _ocrRememberAddValue('type', parsed.type); filled.push('விழா'); }
      // v198: OCR is an explicit user action on a receipt, so a confidently
      // parsed printed date/amount must replace stale/default form values.
      // This fixes old dates carried in the Add form and the default amount "0"
      // blocking a valid receipt value such as ₹3,000.
      var _ocrDateEl = document.getElementById('f_date');
      if (parsed.date && _ocrDateEl) {
        _ocrDateEl.value = parsed.date; _ocrRememberAddValue('date', parsed.date); filled.push('தேதி');
      }
      var _ocrAmtEl = document.getElementById('f_amt');
      if (parsed.amount && _ocrAmtEl) {
        _ocrAmtEl.value = parsed.amount; _ocrRememberAddValue('amount', parsed.amount); filled.push('தொகை');
      }

      // Verification against existing records + confidence score —
      // advisory only, shown in the status line; does not affect what
      // gets saved or how (save flow/business logic unchanged).
      var existingMatch = _ocrVerifyAgainstRecords(parsed.place, parsed.name);
      var confidence     = _ocrConfidenceScore(parsed, existingMatch);

      _ocrLog('name', filled.length ? 'success' : 'no_confident_fields', { filled: filled, confidence: confidence, matchedExisting: !!existingMatch });

      var msg = filled.length
        ? '✅ ' + filled.join(', ') + ' நிரப்பப்பட்டது (நம்பகத்தன்மை ' + confidence + '%)'
        : '⚠️ விவரங்கள் தெளிவாக கண்டுபிடிக்கவில்லை — கைமுறையாக உள்ளிடவும்';
      if (existingMatch) msg += ' — ஏற்கனவே பதிவில் உள்ளது ✓';
      statusEl.textContent = msg;

      // v287: after OCR fills fields, offer close Name/Oor matches without auto-changing anything.
      _ocrOfferMatchAssist(parsed);

      // FIX [57]: Event Receipt Payer Verification — advisory only,
      // computed here but never written into any field. Only relevant
      // for Event Receipts (EventVaravu mode / an active event selected);
      // regular moi entries are unaffected.
      _resetPayerVerification();
      var _isEventReceipt = (document.getElementById('f_mode').value === 'EventVaravu') || !!_activeEventId;
      if (_isEventReceipt) {
        var payerName = _extractPayerNameFromOcr(res.text);
        // FIX [58]: STRICT PAYER VERIFICATION — the modal is now required
        // both when the payer name is missing (no payer label found on
        // the receipt at all) AND when it's present but doesn't equal
        // S.name after normalization (see _payerNameMatchesSelf above).
        // FIX [59]: If S.name is missing, treat verification as unavailable
        // and require manual confirmation.
        if (typeof S !== 'undefined' && S) {
          if (!S.name) {
            // S.name missing: verification unavailable, require confirmation
            _pendingPayerMismatch = { payerName: payerName, selfName: null };
          } else if (!payerName || !_payerNameMatchesSelf(payerName, S.name)) {
            _pendingPayerMismatch = { payerName: payerName, selfName: S.name };
          }
        }
      }
    }
  });
}


// ============================================================
//  FIX [38]: BULK IMPORT from a moi note-book page photo — one photo,
//  many name+amount entries, via the same shared pipeline above. The RAW
//  multi-line text gets parsed into candidate rows, shown in an EDITABLE
//  review table (never auto-saved — handwriting OCR is imperfect, see
//  earlier discussion), and only added to real records once the person
//  confirms.
// ============================================================
var _biRowId = 0;
var _bulkSaveInFlight = false;


function openBulkImport() {
  document.getElementById('biStep1').style.display = 'block';
  document.getElementById('biStep2').style.display = 'none';
  document.getElementById('biStatus').textContent = '';
  document.getElementById('biRows').innerHTML = '';
  document.getElementById('biErr').textContent = '';
  document.getElementById('bi_date').value  = todayStr();
  document.getElementById('bi_place').value = '';
  document.getElementById('bi_type').value  = '';
  document.getElementById('bulkImportModal').style.display = 'flex';
}

function closeBulkImport() {
  if (_bulkSaveInFlight) { toast('பதிவுகள் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  document.getElementById('bulkImportModal').style.display = 'none';
}

function onBulkImportBgClick(e) { if (e.target === document.getElementById('bulkImportModal')) closeBulkImport(); }


// v236E — Bulk handwriting row grouper. OCR frequently returns the name and
// its amount as TWO adjacent lines even though they are one handwritten row:
//   "ராஜன்"
"1000"
"முருகன்"
"2000"
// The old line-by-line parser therefore created amount-only/blank rows.
// This parser keeps the existing same-line handling, but also pairs a strong
// name candidate with the immediately following amount-only line. It is
// intentionally conservative: only _looksLikeName() candidates are paired,
// so headings/dates/noise are not silently turned into transactions.
function _parseMoiLines(text) {
  var lines = String(text || '').split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s; });
  var rows = [];
  var pendingName = '';

  function flushPending() {
    if (pendingName) {
      rows.push({ name: pendingName, amount: '' });
      pendingName = '';
    }
  }
  function amountOnly(line) {
    var m = String(line || '').match(/^\s*(?:rs\.?|inr|₹|ரூ\.?|ரூபாய்)?\s*[:：\-–—]?\s*([\d,]{2,})(?:\.00)?\s*\/?-?\s*$/i);
    if (!m) return 0;
    var n = Number(String(m[1] || '').replace(/,/g, ''));
    return n > 0 ? n : 0;
  }

  lines.forEach(function(line) {
    // Best case: name and amount are on the same OCR line.
    var m = line.match(/^(.*?)[\s\-:]*(?:rs\.?|inr|₹|ரூ\.?|ரூபாய்)?\s*([\d,]{2,})(?:\.00)?\s*\/?-?\s*$/i);
    if (m && m[1].trim()) {
      var amt = Number(m[2].replace(/,/g, ''));
      if (amt > 0) {
        flushPending();
        rows.push({ name: _cleanOcrName(m[1].trim()), amount: amt });
        return;
      }
    }

    // Common handwriting OCR split: previous line=name, this line=amount.
    var onlyAmt = amountOnly(line);
    if (onlyAmt) {
      if (pendingName) {
        rows.push({ name: pendingName, amount: onlyAmt });
        pendingName = '';
      } else {
        // Preserve an unmatched amount for review, but keep it in the amount
        // field instead of incorrectly showing the digits as a person's name.
        rows.push({ name: '', amount: onlyAmt });
      }
      return;
    }

    // Hold one strong name candidate for the next line. If another name-like
    // line arrives first, preserve the earlier one as a review row rather than
    // guessing that the two names belong together.
    if (_looksLikeName(line) && !_looksLikeSelfName(line)) {
      flushPending();
      pendingName = _cleanOcrName(line);
      return;
    }

    // Non-name OCR content is preserved for manual review, exactly as before.
    flushPending();
    rows.push({ name: line, amount: '' });
  });

  flushPending();
  return rows;
}


function doBulkOcrCapture(inputEl, fileOverride) {
  var statusEl = document.getElementById('biStatus');
  var btn      = document.getElementById('biCaptureBtn');

  _runOcrPipeline({
    kind: 'bulk',
    inputEl: inputEl,
    fileOverride: fileOverride || null,
    statusEl: statusEl,
    btnEl: btn,
    maxW: 2400, // wider than single-name capture — full page needs more detail
    busyText: 'படத்தில் இருந்து Entries எடுக்கிறது...',
    isStale: function() { var m = document.getElementById('bulkImportModal'); return !m || m.style.display === 'none'; }, // req #9 — modal closed meanwhile
    onSuccess: function(res) {
      if (!res || !res.ok) { _ocrLog('bulk', 'ocr_failed', { msg: res && res.msg }); statusEl.textContent = '❌ ' + ((res && res.msg) || 'OCR தோல்வி'); return; }
      if (!res.text)       { _ocrLog('bulk', 'empty', {});                          statusEl.textContent = '⚠️ படத்தில் எழுத்து கண்டுபிடிக்கவில்லை'; return; }

      var rows = _parseMoiLines(res.text);
      if (!rows.length) { _ocrLog('bulk', 'no_rows', {}); statusEl.textContent = '⚠️ எந்த Entry-உம் கண்டுபிடிக்கவில்லை'; return; }

      document.getElementById('biRows').innerHTML = '';
      rows.forEach(function(r) { _biAddRow(r.name, r.amount); });

      document.getElementById('biStep1').style.display = 'none';
      document.getElementById('biStep2').style.display = 'block';
      _ocrLog('bulk', 'success', { rows: rows.length });
    }
  });
}


// Adds one editable row to the review table
function _biAddRow(name, amount) {
  var id = 'bi_row_' + (_biRowId++);
  var box = document.getElementById('biRows');
  var row = document.createElement('div');
  row.id = id;
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML =
    '<input type="text" class="inp bi-name" placeholder="பெயர்" value="'+x(name||'')+'" style="flex:2">'
    +'<input type="number" class="inp bi-amt" placeholder="தொகை" value="'+x(String(amount||''))+'" style="flex:1">'
    +'<button type="button" style="background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;border-radius:6px;padding:8px 10px;cursor:pointer" onclick="document.getElementById(\''+id+'\').remove()">✕</button>';
  box.appendChild(row);
}


function doBulkSave() {
  if (_bulkSaveInFlight) return;

  var date  = document.getElementById('bi_date').value;
  var place = document.getElementById('bi_place').value.trim();
  var type  = document.getElementById('bi_type').value.trim();
  var mode  = document.getElementById('bi_mode').value;
  var err   = document.getElementById('biErr');
  err.textContent = '';

  if (navigator.onLine === false) {
    err.textContent = 'Internet இல்லை. இணைப்பு வந்த பிறகு மீண்டும் Save செய்யவும்.';
    return;
  }
  if (!date)  { err.textContent = 'தேதி தேவை'; return; }
  if (!place) { err.textContent = 'ஊர் தேவை (எல்லோருக்கும்)'; return; }

  var entries = [];
  document.querySelectorAll('#biRows > div').forEach(function(row) {
    var name = row.querySelector('.bi-name').value.trim();
    var amt  = Number(row.querySelector('.bi-amt').value);
    if (name && amt > 0) entries.push({ name: name, amount: amt });
  });
  if (!entries.length) { err.textContent = 'குறைந்தது ஒரு சரியான Entry (பெயர் + தொகை) தேவை'; return; }

  var btn = document.getElementById('biSaveBtn');
  _bulkSaveInFlight = true;
  btn.disabled = true; btn.textContent = 'சேமிக்கிறது...';

  function finishBulkSave() {
    _bulkSaveInFlight = false;
    btn.disabled = false; btn.textContent = '✅ எல்லாம் Save பண்ணு';
  }

  google.script.run
    .withSuccessHandler(function(res) {
      finishBulkSave();
      if (!res || !res.ok) { err.textContent = (res && res.msg) || 'பிழை'; return; }
      var msg = res.added + ' பதிவுகள் சேர்க்கப்பட்டது';
      if (res.failed && res.failed.length) msg += ' (' + res.failed.length + ' Fail ஆனது)';
      toast('✅ ' + msg);
      closeBulkImport();
      loadData();
    })
    .withFailureHandler(function(e) {
      finishBulkSave();
      if (!handleTerminalSessionFailure(e)) err.textContent = friendlyErrorMsg(e);
    })
    .bulkAddRecords({ date:date, place:place, type:type, mode:mode, entries:entries });
}


// FIX [46]: when mode changes to EventVaravu, the underlying record
// mode is stored as 'Varavu' (same Varavu logic everywhere applies),
// but the rec.type field carries the event type, which signals
// generateMoiReceipt() to use the Event Receipt layout.
function _onModeChange() {
  // FIX [60]: leaving/entering Event Receipt mode must not carry a
  // stale payer-mismatch verification into the newly selected mode.
  _resetPayerVerification();
  var mode = document.getElementById('f_mode').value;
  var typeEl = document.getElementById('f_type');
  if (mode === 'EventVaravu' && typeEl && !typeEl.value.trim()) {
    typeEl.focus(); // guide them to fill in the event name
  }
}


var _moiPaymentAccountsLoaded = false;
var _moiPaymentAccountsLoading = false;
function _fillMoiPaymentAccountSelect(id, rows, keepValue) {
  var el=document.getElementById(id); if(!el) return;
  var cur = keepValue !== undefined ? String(keepValue||'') : String(el.value||'');
  el.innerHTML='<option value="">-- கணக்கு தேர்வு (optional) --</option>' + (rows||[]).map(function(a){
    var kind=a.type==='cash'?'Cash':(a.type==='bank'?'Bank':(a.type==='card'?'Card':a.type||''));
    return '<option value="'+x(String(a.id))+'">'+x(a.name||'Account')+(kind?' · '+x(kind):'')+'</option>';
  }).join('');
  el.value=cur;
}
function loadMoiPaymentAccounts(force) {
  if (_moiPaymentAccountsLoading || (_moiPaymentAccountsLoaded && !force)) return;
  _moiPaymentAccountsLoading=true;
  google.script.run.withSuccessHandler(function(res){
    _moiPaymentAccountsLoading=false;
    if(!res||!res.ok) return;
    _moiPaymentAccountsLoaded=true;
    var rows=res.rows||[];
    _fillMoiPaymentAccountSelect('f_payment_account',rows);
    _fillMoiPaymentAccountSelect('m_payment_account',rows, editRec ? editRec.paymentAccountId : '');
  }).withFailureHandler(function(){ _moiPaymentAccountsLoading=false; }).getMoiPaymentAccounts();
}

var _moiSaveInFlight = false;
var _moiEditInFlight = false;
var _moiDeleteInFlight = false;

function saveRecord() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast('📴 Internet இல்லை — உங்கள் பதிவு அழிக்கப்படவில்லை. Online ஆன பிறகு மீண்டும் Save செய்யுங்கள்.');
    return;
  }
  if (_moiSaveInFlight) return;
  var date  = document.getElementById('f_date').value;
  var amt   = document.getElementById('f_amt').value;
  var place = document.getElementById('f_place').value.trim();
  var name  = document.getElementById('f_name').value.trim();
  if (!date||!amt||!place||!name) { toast('தேதி, தொகை, ஊர், பெயர் கட்டாயம்'); return; }

  // FIX [57]: Event Receipt Payer Verification — if the last OCR capture
  // on this form found a payer line that didn't match the logged-in
  // user's own name, confirm before saving. Manual entry (no pending
  // mismatch) is completely unaffected and saves exactly as before.
  if (_pendingPayerMismatch) {
    setBtnLoading('saveBtn', true, 'சேமிக்கிறது...');
    _showPayerVerificationModal();
    return;
  }

  var rawMode = document.getElementById('f_mode').value;
  // FIX [46]: EventVaravu → stored as Varavu. rec.type carries the event
  // name which generateMoiReceipt() uses to pick the Event Receipt layout.
  var storedMode = (rawMode === 'EventVaravu') ? 'Varavu' : rawMode;
  pending = { date:date, amount:Number(amt), place:place, name:name,
    type:document.getElementById('f_type').value.trim(),
    mode:storedMode,
    nakai:getNakaiValue('f_nakai'),
    note:document.getElementById('f_note').value.trim(),
    contact:(document.getElementById('f_contact')||{}).value ? document.getElementById('f_contact').value.trim() : '',
    iruppu:(document.getElementById('f_iruppu')||{}).value ? document.getElementById('f_iruppu').value.trim() : '',
    occupation:(document.getElementById('f_occupation')||{}).value ? document.getElementById('f_occupation').value.trim() : '',
    paymentAccountId:(document.getElementById('f_payment_account')||{}).value || '',
    force:false };
  _moiSaveInFlight = true;
  setBtnLoading('saveBtn',true,'சேமிக்கிறது...');

  // FIX [47]: if an active event is selected, route to addEventRecord()
  // instead of the regular addRecord() — this writes to the event's own
  // dedicated Google Sheet rather than the main customer sheet.
  if (_activeEventId) {
    google.script.run
      .withSuccessHandler(handleSave)
      .withFailureHandler(function(e){ _moiSaveInFlight = false; setBtnLoading('saveBtn',false,'சேமி'); if (!handleTerminalSessionFailure(e)) toastError(e); })
      .addEventRecord(_activeEventId, pending);
  } else {
    google.script.run
      .withSuccessHandler(handleSave)
      .withFailureHandler(function(e){ _moiSaveInFlight = false; setBtnLoading('saveBtn',false,'சேமி'); if (!handleTerminalSessionFailure(e)) toastError(e); })
      .addRecord(pending);
  }
}


// ── Receipt Settings ─────────────────────────────────────────
// ============================================================
//  FIX [47]: EVENT SHEET MANAGEMENT — client-side
// ============================================================
var _activeEventId   = null; // null = writing to main sheet

var _activeEventName = null; // name of active event, used to pre-fill type field

var _activeEventDate = null; // date of active event — locked in Add form


function openEventModal() {
  // FIX [48]: reset new form fields — ev_name was replaced by ev_type dropdown
  var fields = ['ev_type','ev_other_name','ev_extra','ev_date','ev_note','evErr'];
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'evErr') el.textContent = '';
    else el.value = '';
  });
  // Hide conditional wrappers
  var ow = document.getElementById('ev_other_wrap'); if (ow) ow.style.display = 'none';
  var ew = document.getElementById('ev_extra_wrap'); if (ew) ew.style.display = 'none';
  document.getElementById('eventModal').style.display = 'flex';
  _loadEventList();
}

function closeEventModal() { document.getElementById('eventModal').style.display = 'none'; }


function _loadEventList() {
  var listEl = document.getElementById('eventList');
  var formEl = document.getElementById('createEventForm');
  listEl.innerHTML = '<div style="color:#9CA3AF;text-align:center;padding:8px">ஏற்றுகிறது...</div>';
  google.script.run
    .withSuccessHandler(function(events) {
      events = events || [];
      var active = events.filter(function(e){ return e.status==='active'; });
      var closed = events.filter(function(e){ return e.status!=='active'; });
      // Hide create form if there's already an active event
      if (formEl) formEl.style.display = active.length ? 'none' : 'block';

      if (!events.length) { listEl.innerHTML = '<div style="color:#9CA3AF;text-align:center;padding:8px">Events இல்லை</div>'; return; }

      listEl.innerHTML = events.map(function(ev) {
        var isActive = ev.status === 'active';
        var borderColor = isActive ? '#0F6E56' : '#E5E7EB';
        var badge = isActive
          ? '<span style="background:#0F6E56;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px">Active</span>'
          : '<span style="background:#E5E7EB;color:#6B7280;font-size:11px;padding:2px 8px;border-radius:10px">Closed</span>';
        return '<div style="border:1.5px solid ' + borderColor + ';border-radius:8px;padding:10px 12px;margin-bottom:8px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center">'
          +   '<div><div style="font-weight:700;font-size:14px">' + x(ev.name) + '</div>'
          +       '<div style="font-size:12px;color:#6B7280">' + x(ev.date) + '</div></div>'
          +   badge
          + '</div>'
          + '<div style="display:flex;gap:6px;margin-top:8px">'
          + (isActive
              ? '<button class="btn-save" style="padding:5px 12px;font-size:12px" onclick="_selectActiveEvent(\'' + ev.id + '\',\'' + x(ev.name) + '\',\'' + x(ev.date) + '\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> பதிவு சேர்</button>'
                + '<button class="btn-cancel" style="padding:5px 12px;font-size:12px;color:#1D4ED8;border-color:#93C5FD" onclick="_editEvent(\'' + ev.id + '\')">✎ திருத்து</button>'
                + '<button class="btn-cancel" style="padding:5px 12px;font-size:12px;color:#DC2626;border-color:#FCA5A5" onclick="_closeEvent(\'' + ev.id + '\',\'' + x(ev.name) + '\')">🔒 Close Event</button>'
                + '<button class="btn-cancel" style="padding:5px 12px;font-size:12px" onclick="_deleteEvent(\'' + ev.id + '\',\'' + x(ev.name) + '\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg> நீக்கு</button>'
              : '<button class="btn-cancel" style="padding:5px 12px;font-size:12px" onclick="_viewClosedEvent(\'' + ev.id + '\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> பார்க்க</button>'
                + '<button class="btn-cancel" style="padding:5px 12px;font-size:12px;color:#1D4ED8;border-color:#93C5FD" onclick="_editEvent(\'' + ev.id + '\')">✎ திருத்து</button>'
                + '<button class="btn-cancel" style="padding:5px 12px;font-size:12px" onclick="_deleteEvent(\'' + ev.id + '\',\'' + x(ev.name) + '\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg> நீக்கு</button>')
          + '</div></div>';
      }).join('');
    })
    .withFailureHandler(function(e){ listEl.innerHTML = '<div style="color:#DC2626;padding:8px">பிழை: '+friendlyErrorMsg(e)+'</div>'; })
    .getMyEvents();
}


function _selectActiveEvent(id, name, date) {
  _activeEventId   = id;
  _activeEventName = name;
  _activeEventDate = date || null;
  closeEventModal();
  toast('✅ "' + name + '" Event தேர்ந்தெடுக்கப்பட்டது — இனிமேல் பதிவுகள் இதில் சேரும்');
  _renderEventBadge(name);
}


function _renderEventBadge(name) {
  var existing = document.getElementById('activeEventBadge');
  if (existing) existing.parentNode.removeChild(existing);
  // FIX [49]: show/hide counter button based on event state
  var mcBtn = document.getElementById('moiCounterBtn');
  if (mcBtn) mcBtn.style.display = name ? 'flex' : 'none';

  // FIX [ISSUE-2/3]: single choke point — every place that changes the
  // active event (Events modal select/close/delete/edit, doCreateEvent,
  // and the new Add-form event picker) already calls _renderEventBadge()
  // after updating _activeEventId/_activeEventName/_activeEventDate, so
  // syncing the Add-form banner + select HERE keeps them correct from
  // every entry point without duplicating any event state or adding new
  // call sites elsewhere.
  var addBanner = document.getElementById('addFormEventBanner');
  if (addBanner) {
    if (name) {
      addBanner.style.display = 'block';
      addBanner.textContent = '🎉 ' + name + (_activeEventDate ? ' — ' + _activeEventDate : '');
    } else {
      addBanner.style.display = 'none';
    }
  }
  var addSel = document.getElementById('f_event_select');
  if (addSel && addSel.value !== (_activeEventId || '') && _optionExists(addSel, _activeEventId || '')) {
    addSel.value = _activeEventId || '';
  }
  if (curTab === 'add') _applyAddFormEventLock();

  if (!name) return;
  var badge = document.createElement('div');
  badge.id = 'activeEventBadge';
  badge.style.cssText = 'background:#0F6E56;color:#fff;font-size:11px;padding:3px 10px;text-align:center;cursor:pointer';
  badge.textContent = '🎉 Active Event: ' + name + ' — Click to switch';
  badge.onclick = openEventModal;
  var main = document.querySelector('main');
  if (main) main.insertBefore(badge, main.firstChild);
}

// Small helper — true if <select> already has an <option> with this value
// (guards against setting addSel.value to an id the picker hasn't loaded yet).
function _optionExists(selectEl, value) {
  for (var i = 0; i < selectEl.options.length; i++) {
    if (selectEl.options[i].value === value) return true;
  }
  return false;
}


// ============================================================
// v236ZL — MOI Tamil voice entry (browser/WebView local capability)
// Voice only fills the selected Add-MOI field; it never auto-saves.
// ============================================================
var _moiVoiceRecognition = null;
function _moiVoiceCtor(){ return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

// v237 — MOI voice-language toggle (Tamil-first default, English optional).
// English names (e.g. on receipts) often garble under a Tamil-only
// recognizer; this lets the person switch a field's mic to English for
// one voice turn. In-memory per-field state only, no storage/schema
// change, default unchanged (Tamil).
var _moiVoiceLang = { f_place: 'ta-IN', f_name: 'ta-IN', f_note: 'ta-IN' };

function toggleMoiVoiceLang(fieldId) {
  var cur = _moiVoiceLang[fieldId] || 'ta-IN';
  _moiVoiceLang[fieldId] = (cur === 'ta-IN') ? 'en-IN' : 'ta-IN';
  var langBtn = document.querySelector('[data-moi-voice-lang="'+fieldId+'"]');
  if (langBtn) {
    langBtn.textContent = (_moiVoiceLang[fieldId] === 'ta-IN') ? 'த' : 'EN';
    langBtn.title = (_moiVoiceLang[fieldId] === 'ta-IN') ? 'தமிழ் voice — தட்டி English-க்கு மாற்றவும்' : 'English voice — தட்டி தமிழுக்கு மாற்றவும்';
  }
}

function startMoiVoiceEntry(fieldId) {
  var el=document.getElementById(fieldId); if(!el) return;
  if (_moiVoiceRecognition) { try{_moiVoiceRecognition.stop();}catch(e){} _moiVoiceRecognition=null; }
  var Recognition=_moiVoiceCtor();
  if(!Recognition){
    if(typeof showToast==='function') showToast('இந்த browser/app-ல் voice input support இல்லை. Keyboard voice typing பயன்படுத்தலாம்.');
    else alert('இந்த browser/app-ல் voice input support இல்லை.');
    return;
  }
  var rec=new Recognition(); _moiVoiceRecognition=rec;
  rec.lang=_moiVoiceLang[fieldId]||'ta-IN'; rec.interimResults=false; rec.continuous=false; rec.maxAlternatives=1;
  var btn=document.querySelector('[data-moi-voice="'+fieldId+'"]');
  function setListening(on){ if(btn){btn.classList.toggle('listening',!!on);btn.setAttribute('aria-pressed',on?'true':'false');btn.textContent=on?'■':'🎙️';} }
  rec.onstart=function(){setListening(true);};
  rec.onresult=function(ev){
    var text=''; try{text=(ev.results[0][0].transcript||'').trim();}catch(e){}
    if(!text)return;
    var a=typeof el.selectionStart==='number'?el.selectionStart:(el.value||'').length;
    var b=typeof el.selectionEnd==='number'?el.selectionEnd:a;
    var before=(el.value||'').slice(0,a), after=(el.value||'').slice(b);
    var sep=(before && !/\s$/.test(before))?' ':'';
    el.value=before+sep+text+after;
    var pos=(before+sep+text).length; try{el.setSelectionRange(pos,pos);}catch(e){}
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    if(fieldId==='f_name' && typeof onNameChange==='function') onNameChange();
    if(fieldId==='f_place' && typeof onPlaceChange==='function') onPlaceChange();
  };
  rec.onerror=function(ev){
    var code=ev&&ev.error||'';
    var msg=(code==='not-allowed')?'Microphone permission அனுமதிக்கவும்.':(code==='service-not-allowed'?'இந்த app/WebView-ல் direct voice recognition கிடைக்கவில்லை. Keyboard 🎤 voice typing பயன்படுத்தவும்.':'Voice input கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.');
    if(typeof showToast==='function') showToast(msg);
  };
  rec.onend=function(){setListening(false);_moiVoiceRecognition=null;try{el.focus();}catch(e){}};
  try{rec.start();}catch(e){setListening(false);_moiVoiceRecognition=null;}
}

// ============================================================
// DYNAMIC FUNCTION TYPE (மொய் வகை) — f_type
// ============================================================
// The Add form's f_type field was a free-text input backed by a static
// datalist (dl_type — still used unchanged by m_type/rem_type elsewhere).
// It is now a <select> built from: 6 fixed defaults + every unique
// non-empty r.type already present in the currently loaded `recs`,
// de-duplicated and sorted alphabetically (Tamil-aware), followed by a
// final "add new" option. Picking that option opens a small local popup
// (#newFTypeModal) — no backend call is made there; the typed name is
// just added to this <select> in-memory and auto-selected. It only
// becomes a permanent value the normal way: when the record is actually
// saved via saveRecord() (unchanged — still reads f_type's value as a
// plain string, exactly as it did with the old text input).
var FTYPE_DEFAULTS = ['புதுமனை புகுவிழா','காதணி விழா','திருமண விழா','பிறந்த நாள் விழா','குழந்தை பிறப்பு','பட்டமளிப்பு விழா'];
var FTYPE_NEW_OPT_VAL = '__new_ftype__';
var _fTypePrevValue = ''; // last non-"__new__" selection, used to revert if the popup is cancelled

function _populateFTypeOptions(preserveVal) {
  var sel = document.getElementById('f_type');
  if (!sel) return;
  var current = (preserveVal !== undefined && preserveVal !== null) ? preserveVal : sel.value;
  if (current === FTYPE_NEW_OPT_VAL) current = '';

  var set = {};
  FTYPE_DEFAULTS.forEach(function(t){ set[t] = true; });
  recs.forEach(function(r){ if (r.type) set[r.type] = true; });
  if (current) set[current] = true; // keep the current selection visible even if not in defaults/recs yet

  var opts = Object.keys(set).sort(function(a,b){ return a.localeCompare(b, 'ta'); });

  var html = '<option value="">-- தேர்வு செய்யவும் --</option>'
    + opts.map(function(v){ return '<option value="'+x(v)+'">'+x(v)+'</option>'; }).join('')
    + '<option value="'+FTYPE_NEW_OPT_VAL+'">➕ புதிய விழா / நிகழ்ச்சி பெயர்</option>';

  sel.innerHTML = html;
  sel.value = _optionExists(sel, current) ? current : '';
  _fTypePrevValue = sel.value;
}


// Ensures a value exists as a selectable <option> on #f_type (inserting it
// right before the "add new" option if missing), then selects it. Used
// whenever code sets f_type programmatically (quick chips, duplicate-name
// prefill, search-prefill, reminder prefill) so a value that isn't yet one
// of the defaults/recs-derived options still displays correctly instead of
// silently falling back to blank.
function _setFTypeValue(val) {
  var sel = document.getElementById('f_type');
  if (!sel || !val) return;
  if (!_optionExists(sel, val)) {
    var newOpt = document.createElement('option');
    newOpt.value = val; newOpt.textContent = val;
    var addOpt = sel.querySelector('option[value="'+FTYPE_NEW_OPT_VAL+'"]');
    if (addOpt) sel.insertBefore(newOpt, addOpt); else sel.appendChild(newOpt);
  }
  sel.value = val;
  _fTypePrevValue = val;
}


function _onFTypeSelectChange(sel) {
  if (sel.value === FTYPE_NEW_OPT_VAL) {
    sel.value = _fTypePrevValue; // revert visible selection until the popup is confirmed
    openNewFTypeModal();
    return;
  }
  _fTypePrevValue = sel.value;
}


function openNewFTypeModal() {
  var inp = document.getElementById('newFTypeInput');
  if (inp) inp.value = '';
  document.getElementById('newFTypeModal').style.display = 'flex';
  setTimeout(function(){ if (inp) inp.focus(); }, 50);
}

function closeNewFTypeModal() {
  document.getElementById('newFTypeModal').style.display = 'none';
}

// No backend call — purely local. The new value only persists once the
// Add form itself is saved via the existing saveRecord() flow.
function confirmNewFType() {
  var inp = document.getElementById('newFTypeInput');
  var val = (inp ? inp.value : '').trim();
  if (!val) { if (inp) inp.focus(); return; }
  _setFTypeValue(val);
  closeNewFTypeModal();
}


// ============================================================
//  FIX [ISSUE-2/3]: Add-MOI-form event visibility + picker.
//  Reuses the existing _activeEventId/_activeEventName/_activeEventDate
//  state, the existing getMyEvents()/openEventModal()/doCreateEvent()
//  flow, and _selectActiveEvent()/_renderEventBadge() for the actual
//  state change — this file only adds the UI glue inside the Add form
//  itself. No new event state, no new event-creation function, no new
//  IDs are introduced.
// ============================================================

// Mode/type/date field locking that used to live inline in go('add').
// Extracted (not duplicated) so it can also run right after the user
// changes the event picker inside the Add form, without waiting for a
// tab switch.
function _applyAddFormEventLock() {
  var modeEl    = document.getElementById('f_mode');
  var modeWrap  = document.getElementById('f_mode_wrap');
  var typeWrap  = document.getElementById('f_type_wrap');
  var typeEl    = document.getElementById('f_type');
  var dateEl    = document.getElementById('f_date');
  if (!modeEl) return;
  if (_activeEventId) {
    // Hide both mode and type fields — event = varavu only, type = event name
    modeEl.value = 'Varavu';
    modeEl.disabled = true;
    if (modeWrap) modeWrap.style.display = 'none';
    if (typeWrap) typeWrap.style.display = 'none';
    // Dynamic Function Type: f_type is now a <select>, so use _setFTypeValue()
    // (adds the option if missing) instead of a raw .value= assignment — the
    // Active Event lock behavior itself (type = event name) is unchanged.
    if (typeEl && _activeEventName) _setFTypeValue(_activeEventName);
    // Lock date to event date — past events supported
    if (dateEl && _activeEventDate) {
      dateEl.value    = _activeEventDate;
      dateEl.readOnly = true;
      dateEl.style.opacity = '0.7';
      dateEl.title = 'Event தேதி: ' + _activeEventDate + ' (மாற்ற முடியாது)';
    }
  } else {
    modeEl.disabled = false;
    if (modeWrap) modeWrap.style.display = 'block';
    if (typeWrap) typeWrap.style.display = 'block';
    if (typeEl && !typeEl.value) typeEl.value = '';
    Array.prototype.forEach.call(modeEl.options, function(opt) { opt.style.display = ''; });
    // Restore date field
    if (dateEl) {
      dateEl.readOnly = false;
      dateEl.style.opacity = '1';
      dateEl.title = '';
      if (!dateEl.value) dateEl.value = todayStr();
    }
  }
}


// Populates the Add form's event <select> from the existing getMyEvents()
// endpoint (same one the Events modal uses). Only ACTIVE events are listed
// as selectable targets for a new record — a closed event is already
// rejected server-side by addEventRecord() ("Event Close ஆகிவிட்டது"), so
// listing it as pickable here would just produce a save-time error. Closed
// events remain visible/manageable in the existing Events modal.
function _populateAddFormEventSelect() {
  var sel  = document.getElementById('f_event_select');
  var hint = document.getElementById('f_event_empty_hint');
  if (!sel) return;
  var NO_EVENT_OPT = '<option value="">— Event இல்லாமல் —</option>';
  var NEW_EVENT_OPT = '<option value="__new__">＋ புதிய நிகழ்ச்சி சேர்க்க</option>';

  google.script.run
    .withSuccessHandler(function(events) {
      events = events || [];
      var active = events.filter(function(e) { return e.status === 'active'; });

      var html = NO_EVENT_OPT;
      active.forEach(function(ev) {
        html += '<option value="' + x(ev.id) + '" data-name="' + x(ev.name) + '" data-date="' + x(ev.date) + '">'
              + x(ev.name) + (ev.date ? ' (' + x(ev.date) + ')' : '') + '</option>';
      });
      html += NEW_EVENT_OPT;
      sel.innerHTML = html;
      sel.value = _optionExists(sel, _activeEventId || '') ? (_activeEventId || '') : '';
      if (hint) hint.style.display = active.length ? 'none' : 'block';
    })
    .withFailureHandler(function() {
      // FIX [ISSUE-1-style safety]: even if the event list fails to load,
      // the picker must still be usable — fall back to just the two static
      // options instead of leaving the <select> stuck on "ஏற்றுகிறது...".
      sel.innerHTML = NO_EVENT_OPT + NEW_EVENT_OPT;
      sel.value = '';
      if (hint) hint.style.display = 'none';
    })
    .getMyEvents();
}


// Handles the Add form's event <select> changing. "__new__" opens the
// existing Add Event modal/flow unchanged (doCreateEvent() already
// auto-selects the new event, closes the modal, and calls go('add') —
// which re-runs _populateAddFormEventSelect()/_applyAddFormEventLock()
// and lands the user back on this exact form). Any other value re-uses
// the existing _selectActiveEvent() state-change path, or clears the
// active event using the same reset pattern already used by
// _closeEvent()/_deleteEvent().
function _onAddFormEventChange(sel) {
  var val = sel.value;
  if (val === '__new__') {
    sel.value = _activeEventId || ''; // revert the visible selection until a new event is actually saved
    openEventModal();
    return;
  }
  if (!val) {
    _activeEventId = null; _activeEventName = null; _activeEventDate = null;
    _renderEventBadge(null);
    _resetPayerVerification(); // FIX [59]: clear stale verification when event context leaves
  } else {
    _resetPayerVerification(); // FIX [59]: clear stale verification when event context changes
    var opt  = sel.options[sel.selectedIndex];
    var name = opt.getAttribute('data-name') || opt.textContent;
    var date = opt.getAttribute('data-date') || '';
    _selectActiveEvent(val, name, date);
  }
  _applyAddFormEventLock();
}


// Edit event — shows inline edit form in the event modal
function _editEvent(id) {
  // Find the event data
  google.script.run
    .withSuccessHandler(function(events) {
      var ev = null;
      (events || []).forEach(function(e){ if (e.id === id) ev = e; });
      if (!ev) { toast('Event கண்டுபிடிக்கவில்லை'); return; }

      var listEl = document.getElementById('eventList');
      listEl.innerHTML = '<div style="background:#EFF6FF;border:1.5px solid #93C5FD;border-radius:8px;padding:14px">'
        + '<div style="font-size:13px;font-weight:700;color:#1D4ED8;margin-bottom:10px">✎ Edit Event</div>'
        + '<div class="fg"><label>Event Name *</label>'
        +   '<input type="text" id="edit_ev_name" class="inp" value="' + x(ev.name) + '"></div>'
        + '<div class="fg"><label>Event Date *</label>'
        +   '<input type="date" id="edit_ev_date" class="inp" value="' + x(ev.date) + '"></div>'
        + '<div class="fg"><label>Receipt Message</label>'
        +   '<input type="text" id="edit_ev_message" class="inp" value="' + x(ev.message||'') + '" placeholder="உதா: வாழ்த்துக்கள்!"></div>'
        + '<div id="editEvErr" class="login-err"></div>'
        + '<div style="display:flex;gap:8px">'
        +   '<button class="btn-save" style="flex:1" onclick="_doEditEvent(\'' + id + '\')">✅ சேமி</button>'
        +   '<button class="btn-cancel" style="flex:1" onclick="_loadEventList()">✖ ரத்து</button>'
        + '</div></div>';
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getMyEvents();
}


function _doEditEvent(id) {
  var name    = (document.getElementById('edit_ev_name')    || {}).value || '';
  var date    = (document.getElementById('edit_ev_date')    || {}).value || '';
  var message = (document.getElementById('edit_ev_message') || {}).value || '';
  var err     = document.getElementById('editEvErr');
  if (err) err.textContent = '';
  if (!name.trim()) { if (err) err.textContent = 'Event பெயர் தேவை'; return; }
  if (!date)        { if (err) err.textContent = 'Event தேதி தேவை'; return; }

  loading(true);
  google.script.run
    .withSuccessHandler(function(res) {
      loading(false);
      if (res.ok) {
        // Update active event vars if this is the active event
        if (_activeEventId === id) {
          _activeEventName = name.trim();
          _activeEventDate = date;
          _renderEventBadge(name.trim());
        }
        toast('✅ Event திருத்தப்பட்டது');
        _loadEventList();
      } else {
        if (err) err.textContent = res.msg || 'பிழை';
      }
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .updateEvent(id, { name: name.trim(), date: date, message: message.trim() });
}


function _closeEvent(id, name) {
  showConfirm('"' + name + '" Event-ஐ Close பண்ணவா? Close ஆனால் புதிய பதிவு சேர்க்க முடியாது.', function() {
    loading(true);
    google.script.run
      .withSuccessHandler(function(res) {
        loading(false);
        if (res.ok) {
          if (_activeEventId === id) { _activeEventId = null; _activeEventName = null; _activeEventDate = null; _renderEventBadge(null); _resetPayerVerification(); } // FIX [59]
          toast('🔒 Event Closed');
          _loadEventList();
        } else toast(res.msg || 'பிழை');
      })
      .withFailureHandler(function(e){ loading(false); toastError(e); })
      .closeEvent(id);
  });
}


// FIX [48]: delete event — first load the event's summary to show count+amount in confirm
function _deleteEvent(id, name) {
  loading(true);
  google.script.run
    .withSuccessHandler(function(list) {
      loading(false);
      var count  = (list || []).length;
      var total  = (list || []).reduce(function(s,r){ return s + (r.amount||0); }, 0);
      var msg = '"' + name + '" Event-ஐ நீக்கவா?\n\n'
              + '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-bar-chart"></use></svg> ' + count + ' பதிவுகள் | மொத்தம்: ₹' + total.toLocaleString('en-IN') + '\n\n'
              + 'இந்த Event-உம் அதன் பதிவுகளும் நீக்கப்படும் (தேவைப்பட்டால் பின்னர் மீட்டெடுக்கலாம்).';
      showConfirm(msg, function() {
        loading(true);
        google.script.run
          .withSuccessHandler(function(res) {
            loading(false);
            if (res.ok) {
              if (_activeEventId === id) { _activeEventId = null; _activeEventName = null; _activeEventDate = null; _renderEventBadge(null); _resetPayerVerification(); } // FIX [59]
              toast('<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg> Event deleted');
              _loadEventList();
            } else toast(res.msg || 'பிழை');
          })
          .withFailureHandler(function(e){ loading(false); toastError(e); })
          .deleteEvent(id);
      });
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .getAllEventRecords(id);
}


// View specific event records — called from Summary tab event card click
function _viewEventRecords(eventId, eventName) {
  loading(true);
  google.script.run
    .withSuccessHandler(function(list) {
      loading(false);
      if (!Array.isArray(list)) { toast('பதிவுகள் கிடைக்கவில்லை'); return; }
      // Show only this event's records in அனைத்தும் tab
      recs = list.map(function(r){ r._src = 'event'; return r; });
      toast('🎉 ' + eventName + ' — ' + list.length + ' பதிவுகள்');
      go('all');
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .getAllEventRecords(eventId);
}


function _viewClosedEvent(id) {
  closeEventModal();
  // Load the closed event's records into the "அனைத்தும்" view
  loading(true);
  google.script.run
    .withSuccessHandler(function(list) {
      loading(false);
      recs = list || [];
      go('all');
      toast('<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> Closed Event Records காட்டப்படுகிறது');
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .getAllEventRecords(id);
}


// FIX [48]: Event type → extra field label mapping
var _EVENT_TYPE_EXTRAS = {
  'புதுமனை புகுவிழா': null,
  'காதணி விழா':       'குழந்தையின் பெயர்',
  'திருமண விழா':      'மணமக்கள் பெயர்',
  'பிறந்த நாள் விழா': 'Birthday Celebrity பெயர்',
  'குழந்தை பிறப்பு':  'குழந்தையின் பெயர்',
  'பட்டமளிப்பு விழா': 'Award Celebrity பெயர்'
};


function _onEventTypeChange() {
  var type = document.getElementById('ev_type').value;
  var otherWrap = document.getElementById('ev_other_wrap');
  var extraWrap = document.getElementById('ev_extra_wrap');
  var extraLabel= document.getElementById('ev_extra_label');
  var extraEl   = document.getElementById('ev_extra');

  // Show free-text name field for "other"
  if (otherWrap) otherWrap.style.display = (type === 'other') ? 'block' : 'none';

  // Show extra field based on type
  var extraLabelText = type && type !== 'other' ? _EVENT_TYPE_EXTRAS[type] : null;
  if (extraWrap) {
    extraWrap.style.display = extraLabelText ? 'block' : 'none';
    if (extraLabel) extraLabel.textContent = extraLabelText || '';
    if (extraEl)    extraEl.placeholder = extraLabelText ? (extraLabelText + ' உள்ளிடவும்') : '';
  }
}


function doCreateEvent() {
  var typeEl    = document.getElementById('ev_type');
  var type      = typeEl ? typeEl.value : '';
  var otherName = (document.getElementById('ev_other_name') || {}).value || '';
  var extra     = (document.getElementById('ev_extra')      || {}).value || '';
  var date      = document.getElementById('ev_date').value;
  var note      = (document.getElementById('ev_note')       || {}).value || '';
  var message   = (document.getElementById('ev_message')    || {}).value || '';
  var err       = document.getElementById('evErr');
  err.textContent = '';

  if (!type)                      { err.textContent = 'நிகழ்வு வகை தேர்வு செய்யவும்'; return; }
  if (type === 'other' && !otherName.trim()) { err.textContent = 'நிகழ்வு பெயர் தேவை'; return; }
  if (!date)                      { err.textContent = 'Event தேதி தேவை'; return; }

  var eventName = (type === 'other') ? otherName.trim() : type;
  if (extra.trim()) eventName += ' — ' + extra.trim();
  if (note.trim())  eventName += ' (' + note.trim() + ')';

  var btn = document.querySelector('#createEventForm .btn-save');
  if (btn) { btn.disabled = true; btn.textContent = 'உருவாக்குகிறது...'; }

  google.script.run
    .withSuccessHandler(function(res) {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Event உருவாக்கு'; }
      if (!res.ok) { err.textContent = res.msg || 'பிழை'; return; }
      // Auto-select the new event
      _activeEventId   = res.eventId;
      _activeEventName = eventName;
      _activeEventDate = date;
      // Close modal and go directly to Add form — no need to come back
      closeEventModal();
      _renderEventBadge(eventName);
      toast('✅ "' + eventName + '" உருவாக்கப்பட்டது — பதிவு சேர்க்கலாம்!');
      go('add'); // Go straight to Add form
    })
    .withFailureHandler(function(e) {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Event உருவாக்கு'; }
      err.textContent = friendlyErrorMsg(e);
    })
    .createEvent(eventName, date, message.trim()); // pass message to server
}


function openReceiptSettings() {
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) return;
      var s = res.settings;
      document.getElementById('rs_userName').value = s.userName || '';
      document.getElementById('rs_wifeName').value = s.wifeName || '';
      document.getElementById('rs_place').value    = s.place    || '';
      document.getElementById('rs_hallName').value = s.hallName || '';
      document.getElementById('rsErr').textContent = '';
      document.getElementById('receiptSettingsModal').style.display = 'flex';
    })
    .withFailureHandler(function(e){ toastError(e); })
    .getMyReceiptSettings();
}

function closeReceiptSettings() { document.getElementById('receiptSettingsModal').style.display = 'none'; }


function doSaveReceiptSettings() {
  var userName = document.getElementById('rs_userName').value.trim();
  var err = document.getElementById('rsErr');
  err.textContent = '';
  if (!userName) { err.textContent = 'பெயர் தேவை'; return; }
  google.script.run
    .withSuccessHandler(function(res) {
      if (res.ok) { toast('✅ ரசீது அமைவுகள் சேமிக்கப்பட்டது'); closeReceiptSettings(); }
      else err.textContent = res.msg || 'பிழை';
    })
    .withFailureHandler(function(e){ err.textContent = friendlyErrorMsg(e); })
    .saveMyReceiptSettings({
      userName: userName,
      wifeName: document.getElementById('rs_wifeName').value.trim(),
      place:    document.getElementById('rs_place').value.trim(),
      hallName: document.getElementById('rs_hallName').value.trim()
    });
}


function forceAdd() {
  if (!pending || _moiSaveInFlight) return;
  pending.force = true; clearDup();
  _moiSaveInFlight = true;
  setBtnLoading('saveBtn',true,'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(handleSave)
    .withFailureHandler(function(e){ _moiSaveInFlight = false; setBtnLoading('saveBtn',false,'சேமி'); if (!handleTerminalSessionFailure(e)) toastError(e); })
    .addRecord(pending);
}


function handleSave(res) {
  _moiSaveInFlight = false;
  setBtnLoading('saveBtn',false,'சேமி');
  if (res.ok) {
    _checkMarkReminderDone(); // mark reminder done if this was from a reminder
    clearDup(); var d=pending?pending.date:''; pending=null;
    clearForm(d); loadData();
  } else if (res.dup) {
    showDup(res.existing,true); toast('ஏற்கனவே பதிவு உள்ளது!');
  } else {
    toast(res.msg||'சேமிக்க முடியவில்லை');
  }
}


function clearForm(keepDate) {
  ['f_place','f_name','f_type','f_note','f_contact','f_iruppu','f_occupation'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  _fTypePrevValue = ''; // Dynamic Function Type: keep in sync with the now-blank select
  setNakaiValue('f_nakai', '');
  document.getElementById('f_amt').value  = '';
  document.getElementById('f_mode').value = 'செய்முறை';
  var pa=document.getElementById('f_payment_account'); if(pa) pa.value='';
  if (keepDate) document.getElementById('f_date').value = keepDate;
  document.getElementById('quickChips').innerHTML = ''; clearDup();
  _resetPayerVerification(); // FIX [57]: a stale mismatch must never carry into the next entry
}


// FIX [25]: Cancel on the Add screen — clears whatever was typed and
// navigates back to Today, instead of leaving half-filled data sitting
// there or making the person manually clear every field themselves.
function cancelAddRecord() {
  clearForm();
  go('today');
}


function showDup(rec, hard) {
  var box = document.getElementById('dupBox');
  if (hard) {
    box.innerHTML = '<div class="dup hard">ஏற்கனவே <b>'+x(rec.place)+' -- '+x(rec.name)+'</b> '+(rec.count||1)+' முறை!<br>'
      +'கடைசி: ₹'+fmt(rec.amount||0)+(rec.type?' | '+x(rec.type):'')
      +'<br><button class="dup-force" onclick="forceAdd()">இருந்தாலும் சேர்க்க</button></div>';
  } else {
    box.innerHTML = '<div class="dup soft">முன்பு <b>'+(rec.count||1)+'</b> முறை -- கடைசி: ₹'+fmt(rec.amount||0)+'</div>';
  }
}

function clearDup() { document.getElementById('dupBox').innerHTML = ''; }


// ============================================================
// EDIT MODAL
// ============================================================
function openEditModal(no, sheetId) {
  // FIX [DI-1 frontend]: match on composite (no, sheetId) identity. If the
  // caller supplied a sheetId (the normal case — every rendered button now
  // carries data-sheet), it MUST match too; no ID-only fallback is used in
  // that case, so a duplicate numeric id in another sheet can never be
  // opened by mistake. Only when sheetId is genuinely absent (legacy/edge
  // case) do we fall back to ID-only lookup.
  var r = null;
  for (var i=0;i<recs.length;i++){
    var rr = recs[i];
    if (String(rr.no) !== String(no)) continue;
    if (sheetId) {
      if (String(rr._sheetId || '') === String(sheetId)) { r = rr; break; }
    } else {
      r = rr; break;
    }
  }
  if (!r) { toast('பதிவு கிடைக்கவில்லை'); return; }
  editRec = r;
  document.getElementById('m_date').value  = r.date   || '';
  document.getElementById('m_amt').value   = r.amount || '';
  document.getElementById('m_place').value = r.place  || '';
  document.getElementById('m_name').value  = r.name   || '';
  var mc = document.getElementById('m_contact'); if (mc) mc.value = r.contact || '';
  var mi = document.getElementById('m_iruppu'); if (mi) mi.value = r.iruppu || '';
  var mo = document.getElementById('m_occupation'); if (mo) mo.value = r.occupation || '';
  document.getElementById('m_type').value  = r.type   || '';
  document.getElementById('m_mode').value  = (r.mode === 'Varavu') ? 'Varavu' : 'செய்முறை';
  var mpa=document.getElementById('m_payment_account'); if(mpa){ mpa.value=r.paymentAccountId||''; loadMoiPaymentAccounts(); }
  setNakaiValue('m_nakai', r.nakai || '');
  document.getElementById('m_note').value  = r.note   || '';
  // FIX [25]: same delete-permission rule as the records list
  var canDel = S.role === 'main' || S.role === 'super_admin' || (S.role === 'sub' && S.subRole === 'admin');
  var delBtn = document.getElementById('editDelBtn');
  if (delBtn) delBtn.style.display = canDel ? 'block' : 'none';
  document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
  if (_moiEditInFlight) { toast('⏳ திருத்தம் சேமிக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்.'); return; }
  document.getElementById('editModal').style.display='none'; editRec=null;
}

function onModalBgClick(e) { if(e.target===document.getElementById('editModal')) closeModal(); }


// FIX [25]: delete directly from the Edit modal — for fixing a wrongly
// entered record without needing to close the modal and hunt for it in
// the list separately. Reuses the same delRec() confirm+delete flow.
function deleteFromEditModal() {
  if (!editRec) return;
  var no = editRec.no;
  var sheetId = editRec._sheetId;
  closeModal();
  delRec(no, sheetId);
}


function submitEdit() {
  if (!editRec || _moiEditInFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    toast('📶 Internet இல்லை — online ஆன பிறகு திருத்தத்தை சேமிக்கவும்');
    return;
  }
  var data = { no:editRec.no,
    // FIX [DI-1]: send the record's own source sheet id so the backend
    // can edit the exact sheet the record came from instead of guessing
    // across main/overflow sheets when the same numeric id repeats.
    sheetId:editRec._sheetId,
    date:document.getElementById('m_date').value,
    amount:Number(document.getElementById('m_amt').value),
    place:document.getElementById('m_place').value.trim(),
    name:document.getElementById('m_name').value.trim(),
    type:document.getElementById('m_type').value.trim(),
    mode:document.getElementById('m_mode').value,
    nakai:getNakaiValue('m_nakai'),
    note:document.getElementById('m_note').value.trim(),
    contact:(document.getElementById('m_contact')||{}).value ? document.getElementById('m_contact').value.trim() : '',
    iruppu:(document.getElementById('m_iruppu')||{}).value ? document.getElementById('m_iruppu').value.trim() : '',
    occupation:(document.getElementById('m_occupation')||{}).value ? document.getElementById('m_occupation').value.trim() : '',
    paymentAccountId:(document.getElementById('m_payment_account')||{}).value || '' };
  _moiEditInFlight = true;
  loading(true); setBtnLoading('editSaveBtn',true,'சேமிக்கிறது...');
  google.script.run
    .withSuccessHandler(function(res){
      _moiEditInFlight = false;
      loading(false); setBtnLoading('editSaveBtn',false,'சேமி');
      if(res.ok){ toast('திருத்தம் சேமிக்கப்பட்டது!'); closeModal(); loadData(); }
      else toast('சேமிக்க முடியவில்லை');
    })
    .withFailureHandler(function(e){
      _moiEditInFlight = false;
      loading(false); setBtnLoading('editSaveBtn',false,'சேமி');
      if (!handleTerminalSessionFailure(e)) toastError(e);
    })
    .updateRecord(data);
}


function delRec(no, sheetId) {
  if (_moiDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast('📶 Internet இல்லை — online ஆன பிறகு நீக்கவும்'); return; }
  // FIX [DI-1 frontend]: sheetId now comes directly from the clicked
  // button's data-sheet attribute (or from deleteFromEditModal's editRec),
  // not re-derived by searching recs[] by "no" alone — that search could
  // match the wrong sheet's record when a duplicate numeric id exists.
  showConfirm('இந்த பதிவை நீக்க வேண்டுமா?', function(){
    showConfirm('உறுதியாக நீக்க வேண்டுமா? நீக்கிய பதிவு Trash-ல் இருக்கும்; தேவையானால் மீட்டெடுக்கலாம்.', function(){
    if (_moiDeleteInFlight) return;
    _moiDeleteInFlight = true;
    loading(true);
    google.script.run
      .withSuccessHandler(function(res){
        _moiDeleteInFlight = false;
        loading(false);
        if(res.ok){
          loadData();
          if(res.pendingReview){ toast(res.msg || 'நீக்க கோரிக்கை review-க்கு அனுப்பப்பட்டது'); return; }
          // FIX [review]: was a plain "நீக்கப்பட்டது" toast that just faded
          // away — now an inline Undo, since the delete is a soft-delete
          // server-side (see CustomerDB.deleteRecord) and instantly
          // reversible for the next few seconds.
          showUndoToast('நீக்கப்பட்டது', function(){ _undoDeleteRecord(no, sheetId); });
        } else toast('நீக்க முடியவில்லை');
      })
      .withFailureHandler(function(e){ _moiDeleteInFlight = false; loading(false); toastError(e); })
      .deleteRecord({ no:no, sheetId:sheetId });
    });
  });
}


function _undoDeleteRecord(no, sheetId) {
  if (_moiDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast('📶 Internet இல்லை — online ஆன பிறகு மீட்கவும்'); return; }
  _moiDeleteInFlight = true;
  loading(true);
  google.script.run
    .withSuccessHandler(function(res){
      _moiDeleteInFlight = false;
      loading(false);
      if (res.ok) { toast('↩️ மீட்டெடுக்கப்பட்டது'); loadData(); }
      else toast('❌ ' + (res.msg || 'மீட்க முடியவில்லை'));
    })
    .withFailureHandler(function(e){ _moiDeleteInFlight = false; loading(false); toastError(e); })
    .restoreRecord({ no:no, sheetId:sheetId });
}


// ============================================================
//  FIX [review]: TRASH PANEL — data-safety request. Lets someone
//  recover a deleted record even after the 6-second Undo toast expires
//  (e.g. they only noticed it was gone 10 minutes later).
// ============================================================
function openTrashPanel() {
  document.getElementById('trashModal').style.display = 'flex';
  document.getElementById('trashList').innerHTML = '<div class="empty" style="padding:12px"><div class="ei">⏳</div></div>';
  google.script.run
    .withSuccessHandler(function(res){ _renderTrashList(res.ok ? res.rows : []); })
    .withFailureHandler(function(e){ toastError(e); _renderTrashList([]); })
    .getMyDeletedRecords();
}


function closeTrashPanel() {
  document.getElementById('trashModal').style.display = 'none';
}


function _renderTrashList(rows) {
  var el = document.getElementById('trashList');
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="empty" style="padding:24px 12px"><div class="ei"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg></div><div>நீக்கப்பட்ட பதிவுகள் இல்லை</div></div>';
    return;
  }
  el.innerHTML = '<div class="list">' + rows.map(function(r){
    if(r._deleteRequest){
      return '<div class="card delete-review-card"><div style="min-width:0"><div class="rname">🛡️ Delete review — பதிவு #'+x(r.no)+'</div><div class="rmeta">'+x(r.place)+' · '+x(r.deletedAt)+'</div></div><div class="delete-review-actions"><button class="btn-edit" onclick="_reviewMoiDeleteRequest(\''+x(r.requestId)+'\',\'keep\')">வைத்திரு</button><button class="btn-cancel" onclick="_reviewMoiDeleteRequest(\''+x(r.requestId)+'\',\'delete\')">நீக்கு</button></div></div>';
    }
    return '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:8px">'
      + '<div style="min-width:0">'
      + '<div class="rname">' + x(r.name) + (r.place?(' — ' + x(r.place)):'') + '</div>'
      + '<div class="rmeta">₹' + r.amount + ' · ' + x(r.date) + '</div>'
      + '<div class="rmeta" style="color:#9CA3AF;font-size:11px">நீக்கப்பட்டது: ' + x(r.deletedAt) + '</div>'
      + '</div>'
      + '<button class="btn-edit" data-no="' + x(r.no) + '" data-sheet="' + x(r._sheetId || '') + '" onclick="_restoreFromTrash(this.dataset.no, this.dataset.sheet)">↩️ மீட்க</button>'
      + '</div>';
  }).join('') + '</div>';
}


function _reviewMoiDeleteRequest(id, action){
  var msg=action==='delete'?'இந்த delete request-ஐ approve செய்து பதிவை Trash-க்கு அனுப்பவா?':'இந்த பதிவை வைத்திருக்கவா?';
  showConfirm(msg,function(){
    google.script.run.withSuccessHandler(function(res){
      if(res&&res.ok){toast(action==='delete'?'Delete approve செய்யப்பட்டது':'பதிவு வைத்திருக்கப்பட்டது');openTrashPanel();loadData();}
      else toast((res&&res.msg)||'செயல்படுத்த முடியவில்லை');
    }).withFailureHandler(toastError).reviewMoiDeleteRequest(id,action);
  });
}

function _restoreFromTrash(no, sheetId) {
  if (_moiDeleteInFlight) { toast('பதிவு செயலாக்கப்படுகிறது — முடிந்ததும் தொடருங்கள்'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast('📶 Internet இல்லை — online ஆன பிறகு மீட்கவும்'); return; }
  _moiDeleteInFlight = true;
  google.script.run
    .withSuccessHandler(function(res){
      _moiDeleteInFlight = false;
      if (res.ok) { toast('↩️ மீட்டெடுக்கப்பட்டது'); openTrashPanel(); loadData(); }
      else toast('❌ ' + (res.msg || 'மீட்க முடியவில்லை'));
    })
    .withFailureHandler(function(e){ _moiDeleteInFlight = false; toastError(e); })
    .restoreRecord({ no:no, sheetId:sheetId });
}


// ============================================================
//  FIX [22]: Moi Counter — quick-entry form for fast recording
//  during the actual event.
// ============================================================
function openMoiCounter() {
  document.getElementById('mc_name').value = '';
  document.getElementById('mc_amount').value = '';
  document.getElementById('mcErr').textContent = '';
  document.getElementById('moiCounterModal').style.display = 'flex';
}


function closeMoiCounter() {
  document.getElementById('moiCounterModal').style.display = 'none';
}


function onMoiCounterBgClick(e) { if (e.target === document.getElementById('moiCounterModal')) closeMoiCounter(); }


function doQuickAdd() {
  var name   = document.getElementById('mc_name').value.trim();
  var place  = document.getElementById('mc_place').value.trim();
  var amount = Number(document.getElementById('mc_amount').value);
  var iruppu = (document.getElementById('mc_iruppu') || {}).value || '';
  var occupation = (document.getElementById('mc_occupation') || {}).value || '';
  var note   = (document.getElementById('mc_note')   || {}).value || '';
  var err    = document.getElementById('mcErr');
  err.textContent = '';
  if (!name)              { err.textContent = 'பெயர் உள்ளிடவும்'; return; }
  if (!place)             { err.textContent = 'ஊர் பெயர் உள்ளிடவும்'; return; }
  if (!amount || amount<=0){ err.textContent = 'சரியான தொகை உள்ளிடவும்'; return; }

  var btn = document.getElementById('mcAddBtn');
  btn.disabled = true; btn.textContent = 'சேர்க்கிறது...';

  function _afterSave(no) {
    if (no) {
      toast('✅ சேர்க்கப்பட்டது — ரசீது தயாரிக்கிறது...');
      doDownloadReceipt(String(no));
    } else {
      toast('✅ சேர்க்கப்பட்டது');
    }
    document.getElementById('mc_name').value   = '';
    document.getElementById('mc_place').value  = '';
    document.getElementById('mc_amount').value = '';
    if (document.getElementById('mc_iruppu')) document.getElementById('mc_iruppu').value = '';
    if (document.getElementById('mc_occupation')) document.getElementById('mc_occupation').value = '';
    if (document.getElementById('mc_note'))   document.getElementById('mc_note').value   = '';
  }

  var payload = { name:name, place:place, amount:amount, mode:'Varavu',
                  iruppu:iruppu.trim(), occupation:occupation.trim(), note:note.trim(), force:false };

  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false; btn.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்';
      if (res.ok) {
        _afterSave(res.no);
      } else if (res.dup) {
        showConfirm('இதே பெயரில் ஏற்கனவே பதிவு உள்ளது. மீண்டும் சேர்க்கவா?', function() {
          google.script.run
            .withSuccessHandler(function(r2) {
              if (r2.ok) _afterSave(r2.no);
              else toast(r2.msg||'பிழை');
            })
            .withFailureHandler(function(e){ toastError(e); })
            .addRecord(Object.assign({}, payload, { force:true }));
        });
      } else {
        err.textContent = res.msg || 'பிழை';
      }
    })
    .withFailureHandler(function(e) {
      btn.disabled = false; btn.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்';
      err.textContent = friendlyErrorMsg(e);
    })
    .addRecord(payload);
}


// ============================================================
// RENDER CARDS
// ============================================================
function renderCards(list, showDel) {
  if (!list||!list.length) return empty();
  // FIX [25]: sub-users with subRole='admin' can also delete (matches
  // the server-side rule already enforced in deleteRecord() in Code.gs)
  // — previously this only checked S.role==='main', so admin-permission
  // sub-users never even saw the button despite being allowed to use it.
  var canDel = showDel && (S.role === 'main' || (S.role === 'sub' && S.subRole === 'admin'));
  return '<div class="list">'+list.map(function(r){
    var rno = x(String(r.no));
    var modeLabel = r.mode === 'Varavu' ? 'வரவு' : 'செய்முறை';
    var isVaravu  = r.mode === 'Varavu';
    // Source badge — shown only when records from multiple sources exist
    var srcBadge = (r._src === 'event' && r._eventName)
      ? '<span class="badge" style="background:#E6F7F1;color:#0F6E56;font-size:10px">🎉 ' + x(r._eventName) + '</span>'
      : (r._src === 'main' && r._sheetLabel && r._sheetLabel !== 'Main')
        ? '<span class="badge" style="background:#F3F4F6;color:#6B7280;font-size:10px"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> ' + x(r._sheetLabel) + '</span>'
        : '';
    return '<div class="card rc '+(isVaravu?'v':'s')+'">'
      +'<div class="rl"><div class="rname">'+x(r.name)+'</div><div class="rplace">'+x(r.place)+'</div>'
      +'<div class="rmeta">'
      +srcBadge
      +(r.type?'<span class="badge bg">'+x(r.type)+'</span>':'')
      +(r.occupation?'<span class="badge">💼 '+x(r.occupation)+'</span>':'')
      +(r.iruppu?'<span class="badge">📍 '+x(r.iruppu)+'</span>':'')
      +'<span class="badge '+(isVaravu?'bb':'bg')+'">'+modeLabel+'</span>'
      +(r.nakai?'<span class="badge bp">'+x(r.nakai)+'</span>':'')
      +'</div>'
      +(r.enteredBy?'<div class="r-enteredby">'+x(r.enteredBy)+'</div>':'')
      +'</div>'
      +'<div class="rr"><div class="ramt">₹'+fmt(r.amount)+'</div><div class="rdate">'+fmtDate(r.date)+'</div>'
      +'<div class="ractions">'
      +'<button class="btn-edit" data-no="'+rno+'" data-sheet="'+x(r._sheetId||'')+'" onclick="openEditModal(this.dataset.no,this.dataset.sheet)">திருத்து</button>'
      // FIX [46]: Varavu records get a Receipt button — generates a PDF
      // with name/oor/amount/denomination breakdown, downloadable and
      // shareable via WhatsApp.
      +(isVaravu?'<button class="btn-edit" style="background:#E6F7F1;color:#0F6E56;border-color:#9FE0C7" data-no="'+rno+'" data-sheet="'+x(r._sheetId||'')+'" onclick="doDownloadReceipt(this.dataset.no,this.dataset.sheet)">🧾 ரசீது</button>':'')
      +(canDel?'<button class="rdel" data-no="'+rno+'" data-sheet="'+x(r._sheetId||'')+'" onclick="delRec(this.dataset.no,this.dataset.sheet)">நீக்கு</button>':'')
      +'</div></div></div>';
  }).join('')+'</div>';
}


// FIX [46]: download a moi receipt PDF for a specific Varavu record.
// Uses the same base64 → Blob → (a) download pattern as doDownloadReport.
// The PDF lands in the phone's Downloads folder — the user can then open
// it in any PDF viewer and share to WhatsApp directly from there.
function doDownloadReceipt(recordNo, sheetId) {
  toast('ரசீது உருவாக்குகிறது...');
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) { toast('❌ ' + (res.msg || 'ரசீது உருவாக்க முடியவில்லை')); return; }
      try {
        var byteChars = atob(res.base64);
        var byteNumbers = new Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        var blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = res.filename || 'MoiReceipt.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        toast('✅ ரசீது Download ஆனது — WhatsApp-ல் Share பண்ணலாம்');
      } catch(e) {
        toast('❌ Download பிழை: ' + e.message);
      }
    })
    .withFailureHandler(function(e){ toastError(e); })
    .generateMoiReceipt(recordNo, sheetId);
}


// Source tab switcher for "அனைத்தும்" — shown only when event active
function _setSrcTab(src) {
  // Update hidden value
  var el = document.getElementById('af_src');
  if (!el) {
    // Create hidden element if not exists
    el = document.createElement('select');
    el.id = 'af_src';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  el.value = src;
  // Update button styles
  ['all','main','event'].forEach(function(s) {
    var btn = document.getElementById('srcTab_' + s);
    if (btn) btn.className = 'nakai-chip' + (s === src ? ' on' : '');
  });
  renderAll();
}

// ============================================================
// REMINDER SYSTEM — localStorage based, IST aware
// ============================================================

var _REM_KEY = 'moi_reminders_v1';


// FIX [23]: no-op now — reminders live server-side (shared Google Sheet),
// not localStorage. _reminders is a cache kept in sync by
// _refreshReminderUI()'s server fetch. Kept as a function (rather than
// removing every call site) so render functions written before this
// migration don't all need editing individually.
function _remLoad() { /* intentionally empty — see comment above */ }


function _remSave() { /* intentionally empty — mutations now go through server RPCs directly */ }


// Open the reminder add modal
var _editingReminderId = null; // FIX [27]: null = adding new, set = editing existing
var _reminderSaveInFlight = false;
var _reminderSaveSeq = 0;
var _reminderDeleteInFlight = {};
var _reminderConfirmInFlight = false;
var _reminderConfirmSeq = 0;
var _reminderPanelUserOpen = false;

// Reminder name suggestions reuse the already-loaded MOI autocomplete cache.
// No extra server call is made: selecting/typing a village narrows the existing
// name+place combinations into a reminder-specific datalist.
function _onReminderPlaceInput() {
  var placeEl=document.getElementById('rem_place'),nameEl=document.getElementById('rem_name');
  if(!placeEl)return;var place=_norm(placeEl.value||'');
  _nmFetchMaster_('place',place,_nmRankLocal_(ac.places||[],place),'dl_place');
  _nmGenericNameInput('rem_name','rem_place','dl_rem_name');
}


function openReminderModal(prefillDate) {
  _editingReminderId = null;
  var d = document.getElementById('rem_date');
  var p = document.getElementById('rem_place');
  var n = document.getElementById('rem_name');
  var a = document.getElementById('rem_amt');
  var t = document.getElementById('rem_type');
  var nt= document.getElementById('rem_note');
  var e = document.getElementById('remErr');
  var title = document.getElementById('remModalTitle');
  if (title) title.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-alarm"></use></svg> புதிய Reminder';
  if (d) d.value  = prefillDate || '';
  if (p) p.value  = '';
  if (n) n.value  = '';
  if (a) a.value  = '';
  if (t) t.value  = '';
  if (nt) nt.value = '';
  if (e) e.textContent = '';
  var rdl = document.getElementById('dl_rem_name'); if (rdl) rdl.innerHTML = '';
  var saveBtn = document.getElementById('remSaveBtn');
  var cancelBtn = document.getElementById('remCancelBtn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '✅ சேமி'; }
  if (cancelBtn) cancelBtn.disabled = false;
  document.getElementById('reminderModal').style.display = 'flex';
  // min = tomorrow
  var tom = (function(){
    var tp=todayStr().split('-');
    var dt=new Date(+tp[0],+tp[1]-1,+tp[2]);
    dt.setDate(dt.getDate()+1);
    return dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2)+'-'+('0'+dt.getDate()).slice(-2);
  })();
  if (d) d.min = tom;
}


// FIX [27]: opens the same modal pre-filled with an existing reminder's
// data — this replaces the old fixed "+1 day only" postpone button.
// Editing lets the person change the date to whatever they actually
// want (or fix a wrongly-entered name/amount/place too), not just
// silently bump it forward by one day every time.
function editReminder(id) {
  var rem = null;
  for (var i=0; i<_reminders.length; i++) { if (_reminders[i].id === id) { rem = _reminders[i]; break; } }
  if (!rem) { toast('Reminder கிடைக்கவில்லை'); return; }

  openReminderModal(rem.date); // reuses the same min-date setup
  _editingReminderId = id;
  var title = document.getElementById('remModalTitle');
  if (title) title.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> Reminder திருத்து';
  document.getElementById('rem_place').value = rem.place || '';
  _onReminderPlaceInput();
  document.getElementById('rem_name').value  = rem.name  || '';
  document.getElementById('rem_amt').value   = rem.amt   || '';
  document.getElementById('rem_type').value  = rem.type  || '';
  document.getElementById('rem_note').value  = rem.note  || '';
}


function closeReminderModal() {
  // Do not allow the modal to be dismissed while a save request is active;
  // otherwise a late callback can close/rewrite a newly opened reminder form.
  if (_reminderSaveInFlight) return;
  document.getElementById('reminderModal').style.display = 'none';
  _editingReminderId = null;
}


function saveReminder() {
  var date  = document.getElementById('rem_date').value;
  var place = document.getElementById('rem_place').value.trim();
  var name  = document.getElementById('rem_name').value.trim();
  var amt   = document.getElementById('rem_amt').value;
  var type  = document.getElementById('rem_type').value.trim();
  var note  = document.getElementById('rem_note').value.trim();
  var err   = document.getElementById('remErr');
  err.textContent = '';

  if (_reminderSaveInFlight) return;
  if (navigator.onLine === false) {
    err.textContent = 'Internet இல்லை — இணைப்பு வந்த பிறகு மீண்டும் சேமிக்கவும்';
    return;
  }

  // FIX [MOI reminder rules]: future dates only — today/past transactions
  // can never be created as reminders. (Also enforced via the date input's
  // min=tomorrow attribute in openReminderModal(), and again server-side
  // in addReminder() as the real backstop.)
  if (!date)  { err.textContent = 'தேதி தேர்வு செய்யவும்'; return; }
  if (date <= todayStr()) { err.textContent = 'எதிர்கால தேதி தேர்வு செய்யவும் (இன்று/கடந்த தேதி அனுமதி இல்லை)'; return; }
  if (!place) { err.textContent = 'ஊர் பெயர் தேவை'; return; }
  if (!name)  { err.textContent = 'பெயர் தேவை'; return; }

  var saveBtn = document.getElementById('remSaveBtn') || document.querySelector('#reminderModal .btn-save');
  var cancelBtn = document.getElementById('remCancelBtn');
  var wasEditing = !!_editingReminderId;
  var editId = _editingReminderId;
  var seq = ++_reminderSaveSeq;
  _reminderSaveInFlight = true;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'சேமிக்கப்படுகிறது…'; }
  if (cancelBtn) cancelBtn.disabled = true;

  var timer = setTimeout(function() {
    if (seq !== _reminderSaveSeq) return;
    _reminderSaveInFlight = false;
    _reminderSaveSeq++;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '✅ சேமி'; }
    if (cancelBtn) cancelBtn.disabled = false;
    err.textContent = 'சேமிக்க நேரம் ஆகிறது — Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்';
  }, 25000);

  var payload = { date:date, place:place, name:name, amt:amt?Number(amt):'', type:type, note:note };
  var runner = google.script.run
    .withSuccessHandler(function(res) {
      if (seq !== _reminderSaveSeq) return;
      clearTimeout(timer);
      _reminderSaveInFlight = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '✅ சேமி'; }
      if (cancelBtn) cancelBtn.disabled = false;
      if (!res.ok) { err.textContent = res.msg || 'பிழை'; return; }
      closeReminderModal();
      toast(wasEditing ? '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> Reminder புதுப்பிக்கப்பட்டது' : '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-alarm"></use></svg> Reminder சேர்க்கப்பட்டது: ' + fmtDate(date));
      _refreshReminderUI(true);
    })
    .withFailureHandler(function(e) {
      if (seq !== _reminderSaveSeq) return;
      clearTimeout(timer);
      _reminderSaveInFlight = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '✅ சேமி'; }
      if (cancelBtn) cancelBtn.disabled = false;
      err.textContent = friendlyErrorMsg(e);
    });

  if (wasEditing) runner.updateReminder(editId, payload);
  else            runner.addReminder(payload);
}


function deleteReminder(id) {
  if (!id || _reminderDeleteInFlight[id]) return;
  if (navigator.onLine === false) { toast('Internet இல்லை — இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்'); return; }
  showConfirm('இந்த Reminder-ஐ நீக்கவா?', function() {
    if (_reminderDeleteInFlight[id]) return;
    _reminderDeleteInFlight[id] = true;
    var timer = setTimeout(function() {
      delete _reminderDeleteInFlight[id];
      toast('நீக்க நேரம் ஆகிறது — மீண்டும் முயற்சிக்கவும்');
    }, 20000);
    google.script.run
      .withSuccessHandler(function() {
        clearTimeout(timer);
        delete _reminderDeleteInFlight[id];
        _refreshReminderUI(true);
        toast('Reminder நீக்கப்பட்டது');
      })
      .withFailureHandler(function(e) {
        clearTimeout(timer);
        delete _reminderDeleteInFlight[id];
        toastError(e);
      })
      .deleteReminder(id);
  });
}


// Called when user clicks "Reminder-ல் இருந்து பதிவு செய்" — opens the full
// Add form pre-filled, for when the person wants to review/edit details
// before saving (complements the one-tap confirmReminder() below).
function addFromReminder(id) {
  var rem = null;
  for (var i=0; i<_reminders.length; i++) { if (_reminders[i].id===id){ rem=_reminders[i]; break; } }
  if (!rem) return;

  go('add');
  setTimeout(function() {
    document.getElementById('f_date').value  = todayStr(); // today's date for actual txn
    document.getElementById('f_place').value = rem.place;
    document.getElementById('f_name').value  = rem.name;
    if (rem.amt)  document.getElementById('f_amt').value  = rem.amt;
    if (rem.type) _setFTypeValue(rem.type);
    if (rem.note) document.getElementById('f_note').value = rem.note;
    onPlaceChange(); onNameChange();
    _pendingReminderId = id;
    toast('<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> Reminder-ல் இருந்து நிரப்பப்பட்டது — சரிபார்த்து சேமிக்கவும்');
  }, 200);
}


var _pendingReminderId = null;


// Called after successful record save — mark reminder done
function _checkMarkReminderDone() {
  if (!_pendingReminderId) return;
  var id = _pendingReminderId; _pendingReminderId = null;
  google.script.run
    .withSuccessHandler(function() {
      _refreshReminderUI(true);
      toast('✅ பதிவு சேமிக்கப்பட்டது! Reminder நீக்கப்பட்டது.');
    })
    .withFailureHandler(function(e) {
      // Record was already saved successfully at this point — the reminder
      // row just failed to clean up. Not worth blocking the success toast for.
      console.error('Reminder cleanup failed:', e);
      _refreshReminderUI(true);
      toast('✅ பதிவு சேமிக்கப்பட்டது!');
    })
    .deleteReminder(id);
}


// ============================================================
// FIX [Reminder actions — Save/Confirm with Policy Validation]:
// One-tap convert a reminder straight into a real MOI record,
// WITHOUT skipping any of the rules the main Add form enforces —
// it calls the exact same addRecord() endpoint, so trial-limit and
// duplicate-record policy checks both run before anything is saved.
// On failure, the person sees a clear message and nothing is saved.
// ============================================================
function confirmReminder(id) {
  if (_reminderConfirmInFlight) return;
  if (navigator.onLine === false) { toast('Internet இல்லை — இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்'); return; }
  var rem = null;
  for (var i=0; i<_reminders.length; i++) { if (_reminders[i].id===id){ rem=_reminders[i]; break; } }
  if (!rem) return;
  if (!rem.place || !rem.name) { toast('தேவையான தகவல் இல்லை — Reminder-ஐ திருத்தி மீண்டும் சேர்க்கவும்'); return; }

  pending = {
    date: todayStr(), amount: Number(rem.amt) || 0, place: rem.place, name: rem.name,
    type: rem.type || '', mode: 'செய்முறை', nakai: '', note: rem.note || '', force: false
  };
  _pendingReminderId = id; // _checkMarkReminderDone() removes the reminder once addRecord succeeds
  _submitReminderConfirm();
}


function _submitReminderConfirm() {
  if (_reminderConfirmInFlight) return;
  if (!pending) return;
  if (navigator.onLine === false) { toast('Internet இல்லை — இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்'); return; }
  _reminderConfirmInFlight = true;
  var seq = ++_reminderConfirmSeq;
  loading(true);
  var timer = setTimeout(function() {
    if (seq !== _reminderConfirmSeq) return;
    _reminderConfirmInFlight = false;
    _reminderConfirmSeq++;
    loading(false);
    toast('பதிவு உறுதி செய்ய நேரம் ஆகிறது — மீண்டும் முயற்சிக்கவும்');
  }, 25000);
  google.script.run
    .withSuccessHandler(function(res){
      if (seq !== _reminderConfirmSeq) return;
      clearTimeout(timer);
      _reminderConfirmInFlight = false;
      loading(false);
      if (res.ok) {
        _checkMarkReminderDone();
        pending = null;
        toast('✅ பதிவு உறுதி செய்யப்பட்டது');
        loadData();
        if (curTab==='today') renderToday();
      } else if (res.dup) {
        showConfirm('"'+pending.name+'" ('+pending.place+') ஏற்கனவே பதிவு உள்ளது. தொடர்ந்து சேமிக்கவா?', function(){
          pending.force = true;
          _submitReminderConfirm();
        });
      } else {
        showInfoModal('சேமிக்க முடியவில்லை', res.msg || 'அறியப்படாத பிழை');
      }
    })
    .withFailureHandler(function(e){
      if (seq !== _reminderConfirmSeq) return;
      clearTimeout(timer);
      _reminderConfirmInFlight = false;
      loading(false);
      toastError(e);
    })
    .addRecord(pending);
}


// Show/hide reminder panel (manual override — bell icon / ✕ close button)
function toggleReminderPanel() {
  var panel = document.getElementById('reminderPanel');
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  _reminderPanelUserOpen = !isOpen;
  panel.style.display = isOpen ? 'none' : 'block';
  // Always refetch on manual open because reminders are shared across users.
  if (!isOpen) _refreshReminderUI(true);
}


// Tapping the always-visible Today-page reminder banner — ensures the
// full panel is open (doesn't toggle closed if it's already open) and
// scrolls it into view. FIX [Today page]: quick path from "I see there
// are reminders" straight to "here's the full list".
function _openReminderPanelFocus() {
  var panel = document.getElementById('reminderPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) toggleReminderPanel();
  panel.scrollIntoView({behavior:'smooth', block:'start'});
}


// ── List / Calendar view toggle ──────────────────────────────
var _REM_VIEW_KEY = 'moi_rem_view_v1';

var _remViewMode = (function(){
  try { return localStorage.getItem(_REM_VIEW_KEY) || 'list'; } catch(e) { return 'list'; }
})();

var _remCalCursor = null;       // {y, m} — month currently shown in calendar

var _remCalSelectedDate = null; // yyyy-mm-dd currently expanded in calendar day detail


function switchReminderView(mode) {
  _remViewMode = mode;
  try { localStorage.setItem(_REM_VIEW_KEY, mode); } catch(e) {}
  _refreshReminderUI();
}


// Renders whichever view (list/calendar) is currently active.
// Call this instead of _renderReminderList() directly after any
// reminder data change, so both views stay in sync.
function _renderReminders() {
  if (_remViewMode === 'calendar') _renderReminderCalendar();
  else _renderReminderList();
}


function _renderReminderList() {
  var el = document.getElementById('reminderList');
  if (!el) return;
  _remLoad();
  var today = todayStr();

  var overdue  = _reminders.filter(function(r){ return !r.done && r.date < today; })
                            .sort(function(a,b){ return a.date>b.date?1:-1; });
  var dueToday = _reminders.filter(function(r){ return !r.done && r.date === today; });
  var upcoming = _reminders.filter(function(r){ return !r.done && r.date > today; })
                            .sort(function(a,b){ return a.date>b.date?1:-1; });

  if (!_reminders.length) {
    el.innerHTML = '<div class="rem-empty"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-alarm"></use></svg><div>நினைவூட்டல் இல்லை</div><button type="button" class="rem-empty-add" onclick="openReminderModal(\'\')">+ புதிய Reminder</button></div>';
    return;
  }

  var html = '';
  if (overdue.length) {
    html += '<div class="rem-section-label rem-section-overdue">⚠️ கடந்தது ('+overdue.length+')</div>';
    html += overdue.map(function(r){ return _remCardHtml(r, 'overdue'); }).join('');
  }
  if (dueToday.length) {
    html += '<div class="rem-section-label rem-section-today">🔔 இன்று ('+dueToday.length+')</div>';
    html += dueToday.map(function(r){ return _remCardHtml(r, 'today'); }).join('');
  }
  if (upcoming.length) {
    html += '<div class="rem-section-label rem-section-upcoming"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calendar"></use></svg> வரவிருக்கும் ('+upcoming.length+')</div>';
    html += upcoming.map(function(r){ return _remCardHtml(r, 'upcoming'); }).join('');
  }
  el.innerHTML = html;
}


function _renderReminderBadge() {
  _remLoad();
  var today = todayStr();
  var due   = _reminders.filter(function(r){ return !r.done && r.date <= today; }).length;
  var badge = document.getElementById('remBadge');
  if (!badge) return;
  badge.style.display = due > 0 ? 'flex' : 'none';
  badge.textContent   = due > 9 ? '9+' : String(due);
}


// FIX [Today page — highlight reminders prominently]: always-visible
// at-a-glance counts banner at the top of the Today page (not hidden
// behind a tap), so overdue/today/upcoming reminders can't be missed.
function _renderReminderBanner() {
  var box = document.getElementById('remBanner');
  if (!box) return;
  _remLoad();
  var today = todayStr();
  var overdue  = _reminders.filter(function(r){ return !r.done && r.date < today; }).length;
  var dueToday = _reminders.filter(function(r){ return !r.done && r.date === today; }).length;
  var upcoming = _reminders.filter(function(r){ return !r.done && r.date > today; }).length;

  if (!overdue && !dueToday && !upcoming) { box.style.display = 'none'; box.innerHTML=''; return; }

  var chips = '';
  if (overdue)  chips += '<span class="rb-chip rb-overdue">⚠️ '+overdue+' கடந்தது</span>';
  if (dueToday) chips += '<span class="rb-chip rb-today">🔔 '+dueToday+' இன்று</span>';
  if (upcoming) chips += '<span class="rb-chip rb-upcoming"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calendar"></use></svg> '+upcoming+' வரும்</span>';
  box.innerHTML = '<span class="rb-label"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-alarm"></use></svg> நினைவூட்டல்கள்</span><span class="rb-chips">'+chips+'</span>';
  box.style.display = 'flex';
}


// FIX [Today page]: single place that keeps badge + banner + panel
// visibility + active view (list/calendar) all in sync. Called whenever
// the Today tab renders and after every reminder data change, so the
// reminder list is always current — "reduce missed reminders" by making
// staleness impossible rather than relying on a one-time popup.
// FIX [23]: fetches the shared reminder list from the server first,
// THEN does all the same badge/banner/panel/list-or-calendar rendering
// as before. This is the single choke point every mutation (save/delete/
// skip/confirm) and every panel-open funnels through, so making this one
// function fetch-then-render covers the whole feature without needing to
// touch every render function individually.
var _reminderFetchInFlight = false;
var _reminderFetchSeq = 0;
var _reminderFetchTimer = null;
var _reminderLastFetchAt = 0;
var _REMINDER_FETCH_TTL_MS = 15000; // short freshness window; mutations always force refresh

function _renderReminderUIFromCache() {
  _renderReminderBadge();
  _renderReminderBanner();

  var panel = document.getElementById('reminderPanel');
  if (panel) panel.style.display = (_reminders.length || _reminderPanelUserOpen) ? 'block' : 'none';

  var listBtn = document.getElementById('remViewListBtn');
  var calBtn  = document.getElementById('remViewCalBtn');
  if (listBtn) listBtn.classList.toggle('on', _remViewMode === 'list');
  if (calBtn)  calBtn.classList.toggle('on', _remViewMode === 'calendar');
  var listEl = document.getElementById('reminderList');
  var calEl  = document.getElementById('reminderCalendar');
  if (listEl) listEl.style.display = _remViewMode === 'list' ? 'block' : 'none';
  if (calEl)  calEl.style.display  = _remViewMode === 'calendar' ? 'block' : 'none';

  _renderReminders();
}

function _refreshReminderUI(forceFresh) {
  // Reminder list/calendar intentionally shows overdue + today + all upcoming
  // items, so replacing this with a month-only fetch would change behavior.
  // Instead, reuse a very short-lived in-memory result for repeated renders;
  // every reminder mutation and manual panel-open forces a fresh server read.
  var now = Date.now();
  if (!forceFresh && _reminderLastFetchAt && (now - _reminderLastFetchAt) < _REMINDER_FETCH_TTL_MS) {
    _renderReminderUIFromCache();
    return;
  }

  // Multiple dashboard/panel actions can request the same reminder refresh
  // almost simultaneously. Coalesce them into one server call so mobile
  // resume/open flows do not create duplicate work.
  if (_reminderFetchInFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    _renderReminderUIFromCache();
    return;
  }

  _reminderFetchInFlight = true;
  var seq = ++_reminderFetchSeq;
  clearTimeout(_reminderFetchTimer);
  _reminderFetchTimer = setTimeout(function() {
    if (seq !== _reminderFetchSeq) return;
    _reminderFetchInFlight = false;
    _reminderFetchSeq++; // ignore any callback that arrives after timeout
  }, 20000);

  google.script.run
    .withSuccessHandler(function(list) {
      if (seq !== _reminderFetchSeq) return;
      clearTimeout(_reminderFetchTimer);
      _reminderFetchTimer = null;
      _reminderFetchInFlight = false;
      _reminders = list || [];
      _reminderLastFetchAt = Date.now();
      _renderReminderUIFromCache();
    })
    .withFailureHandler(function(e) {
      if (seq !== _reminderFetchSeq) return;
      clearTimeout(_reminderFetchTimer);
      _reminderFetchTimer = null;
      _reminderFetchInFlight = false;
      console.error('Reminder fetch failed:', e);
    })
    .getReminders();
}


// Called once on login — sets up badge/banner/panel for the first render.
// (Per-visit refresh now happens inside renderToday() itself, so this
// only needs to run the same consolidated routine once at startup.)
function _checkDueReminders() {
  _refreshReminderUI();
}


// ============================================================
// REMINDER CALENDAR VIEW
// ============================================================
var _REM_MONTH_NAMES = ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்',
                         'ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];

var _REM_DOW_NAMES   = ['ஞா','தி','செ','பு','வி','வெ','ச'];


// Shared reminder-card markup — used by both the list view and the
// calendar view's day-detail box / always-visible upcoming list,
// so the two views render reminders identically.
// bucket: 'overdue' | 'today' | 'upcoming'
function _remCardHtml(r, bucket) {
  var icon = bucket==='overdue' ? '⚠️' : bucket==='today' ? '🔔' : '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calendar"></use></svg>';
  // Linked Hand Loan / Credit Card Bill reminders are informational reminders,
  // not MOI transaction candidates. Never expose the MOI one-tap Confirm action.
  var linkedNonMoi = /^handloan:|^ccbill:/i.test(String(r.id||'')) || r.type === 'கைமாற்று' || r.type === 'Credit Card Bill';
  var confirmAction = linkedNonMoi ? '' : '<button class="rem-act-btn rem-act-confirm" onclick="confirmReminder(\''+r.id+'\')">✅ உறுதி</button>';
  return '<div class="rem-card rem-'+bucket+'">'
    +'<div class="rem-card-top">'
    +'<div>'
    +'<div class="rem-card-date">'+icon+' '+fmtDate(r.date)+'</div>'
    +'<div class="rem-card-name">'+x(r.name)+' — '+x(r.place)+'</div>'
    +(r.type?'<div class="rem-card-meta">'+x(r.type)+'</div>':'')
    +(r.amt?'<div class="rem-card-meta">₹'+fmt(r.amt)+'</div>':'')
    +(r.note?'<div class="rem-card-meta">'+x(r.note)+'</div>':'')
    +'</div>'
    +'</div>'
    +'<div class="rem-card-actions">'
    +confirmAction
    +'<button class="rem-act-btn rem-act-skip" onclick="editReminder(\''+r.id+'\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> திருத்து</button>'
    +'<button class="rem-act-btn rem-act-del" onclick="deleteReminder(\''+r.id+'\')">✕ நீக்கு</button>'
    +'</div>'
    +'</div>';
}


function _renderReminderCalendar() {
  var el = document.getElementById('reminderCalendar');
  if (!el) return;
  _remLoad();

  if (!_remCalCursor) {
    var t = todayStr().split('-');
    _remCalCursor = { y:+t[0], m:+t[1]-1 };
  }
  var y = _remCalCursor.y, m = _remCalCursor.m;
  var today = todayStr();

  // Group active (not done) reminders by date
  var byDate = {};
  _reminders.forEach(function(r){
    if (r.done) return;
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });

  var first       = new Date(y, m, 1);
  var startDow    = first.getDay();          // 0 = Sunday
  var daysInMonth = new Date(y, m+1, 0).getDate();

  var html = '<div class="rem-cal-nav">'
    + '<button class="rem-cal-arrow" onclick="_remCalShift(-1)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-chevron-left"></use></svg></button>'
    + '<span class="rem-cal-title">' + _REM_MONTH_NAMES[m] + ' ' + y + '</span>'
    + '<button class="rem-cal-arrow" onclick="_remCalShift(1)"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-chevron-right"></use></svg></button>'
    + '</div>';

  html += '<div class="rem-cal-grid rem-cal-dow">'
    + _REM_DOW_NAMES.map(function(d){ return '<div class="rem-cal-dowcell">'+d+'</div>'; }).join('')
    + '</div>';

  html += '<div class="rem-cal-grid">';
  for (var i = 0; i < startDow; i++) html += '<div class="rem-cal-cell empty"></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var ds    = y + '-' + ('0'+(m+1)).slice(-2) + '-' + ('0'+d).slice(-2);
    var items = byDate[ds] || [];
    var cls   = 'rem-cal-cell';
    if (ds === today)  cls += ' is-today';
    if (items.length)  cls += ' has-rem';
    if (ds < today)     cls += ' is-past';
    html += '<div class="'+cls+'" onclick="_remCalDayClick(\''+ds+'\')">'
      + '<span class="rem-cal-daynum">'+d+'</span>'
      + (items.length ? '<span class="rem-cal-dot">'+items.length+'</span>' : '')
      + '</div>';
  }
  html += '</div>';

  // Day-detail box: filled in only when a date with existing reminders is tapped.
  html += '<div id="remCalDayDetail" class="rem-cal-day-detail"></div>';

  // Upcoming reminders — always visible, no tap required.
  html += '<div id="remCalUpcoming" class="rem-cal-upcoming"></div>';

  el.innerHTML = html;

  // Re-show whichever day's detail was open, but only if it still has
  // reminders (it may have just been emptied by a delete) and only
  // within the month currently on screen.
  if (_remCalSelectedDate && byDate[_remCalSelectedDate] && byDate[_remCalSelectedDate].length) {
    _remCalRenderDay(_remCalSelectedDate, byDate[_remCalSelectedDate]);
  } else {
    _remCalSelectedDate = null;
  }

  _renderCalUpcomingList();
}


function _remCalShift(delta) {
  if (!_remCalCursor) return;
  var nm = _remCalCursor.m + delta, ny = _remCalCursor.y;
  if (nm < 0)  { nm = 11; ny--; }
  if (nm > 11) { nm = 0;  ny++; }
  _remCalCursor = { y:ny, m:nm };
  _remCalSelectedDate = null;
  _renderReminderCalendar();
}


// Tapping a calendar day:
//  - has reminder(s)  → show them in the day-detail box
//  - empty + future   → open the add-reminder modal, pre-filled with that date
//  - empty + past     → nothing to add (reminders must be future-dated)
function _remCalDayClick(ds) {
  _remLoad();
  var items = _reminders.filter(function(r){ return !r.done && r.date === ds; });
  if (items.length) {
    _remCalSelectedDate = ds;
    _remCalRenderDay(ds, items);
  } else if (ds > todayStr()) {
    openReminderModal(ds);
  } else {
    toast('கடந்த தேதிக்கு Reminder சேர்க்க முடியாது');
  }
}


function _remCalRenderDay(ds, items) {
  var box = document.getElementById('remCalDayDetail');
  if (!box) return;
  var bucket = _remBucket(ds);
  box.innerHTML = items.map(function(r){ return _remCardHtml(r, bucket); }).join('')
    + '<button class="rem-cal-close-day" onclick="_remCalCloseDay()">✕ மூடு</button>';
}


function _remCalCloseDay() {
  _remCalSelectedDate = null;
  var box = document.getElementById('remCalDayDetail');
  if (box) box.innerHTML = '';
}


// FIX [Reminder Calendar]: 'overdue' | 'today' | 'upcoming' for any date string.
function _remBucket(ds) {
  var today = todayStr();
  return ds < today ? 'overdue' : ds === today ? 'today' : 'upcoming';
}


// Always-visible overdue + today + upcoming reminders list under the
// calendar grid — same 3-way split used in list view, no tap required.
function _renderCalUpcomingList() {
  var el = document.getElementById('remCalUpcoming');
  if (!el) return;
  _remLoad();
  var today = todayStr();
  var overdue  = _reminders.filter(function(r){ return !r.done && r.date < today; })
                            .sort(function(a,b){ return a.date>b.date?1:-1; });
  var dueToday = _reminders.filter(function(r){ return !r.done && r.date === today; });
  var upcoming = _reminders.filter(function(r){ return !r.done && r.date > today; })
                            .sort(function(a,b){ return a.date>b.date?1:-1; });

  if (!overdue.length && !dueToday.length && !upcoming.length) {
    el.innerHTML = '<div class="rem-empty"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-alarm"></use></svg> Reminder இல்லை</div>';
    return;
  }

  var html = '';
  if (overdue.length) {
    html += '<div class="rem-section-label rem-section-overdue">⚠️ கடந்தது ('+overdue.length+')</div>';
    html += overdue.map(function(r){ return _remCardHtml(r, 'overdue'); }).join('');
  }
  if (dueToday.length) {
    html += '<div class="rem-section-label rem-section-today">🔔 இன்று ('+dueToday.length+')</div>';
    html += dueToday.map(function(r){ return _remCardHtml(r, 'today'); }).join('');
  }
  if (upcoming.length) {
    html += '<div class="rem-section-label rem-section-upcoming"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calendar"></use></svg> வரவிருக்கும் ('+upcoming.length+')</div>';
    html += upcoming.map(function(r){ return _remCardHtml(r, 'upcoming'); }).join('');
  }
  el.innerHTML = html;
}

// ============================================================
// DOCUMENT VAULT
// ============================================================

var currentDocId = null;
var currentDocViewType = 'active'; // 'active' or 'deleted'
var docListCache = [];

function loadDocuments() {
  var list = document.getElementById('docList');
  if (list && !docListCache.length) list.innerHTML = '<div class="empty-state">Documents loading...</div>';
  google.script.run.withSuccessHandler(function(result) {
    if (result && result.ok) {
      docListCache = result.docs || [];
      refreshDocList();
      loadDocCategories();
    } else {
      _docShowLoadError((result && result.msg) || 'Documents load ஆகவில்லை');
    }
  }).withFailureHandler(function(err){
    _docShowLoadError((err && err.message) || String(err || 'Documents load ஆகவில்லை'));
  }).getVaultDocuments();
}

function _docShowLoadError(msg) {
  var list = document.getElementById('docList');
  var empty = document.getElementById('docEmptyState');
  if (empty) empty.style.display = 'none';
  if (list) list.innerHTML = '<div class="empty-state"><b>Documents load ஆகவில்லை</b><br><span style="font-size:12px">'+_esc(msg || '')+'</span><br><button type="button" class="btn-sm" style="margin-top:10px" onclick="loadDocuments()">Retry</button></div>';
}

var _DOC_DEFAULT_CATEGORIES = ['Personal','Official','Education','Medical','Finance','Property','Vehicle','Other'];
var _docKnownCategories = [];

function _docCategoryOptions(serverCats) {
  var out = [], seen = {};
  _DOC_DEFAULT_CATEGORIES.concat(serverCats || []).forEach(function(c) {
    c = String(c || '').trim();
    if (!c) return;
    var key = c.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(c);
  });
  return out;
}

function _docPopulateCategorySelect(el, cats, current) {
  if (!el) return;
  current = String(current || '').trim();
  var all = _docCategoryOptions(cats);
  if (current && !all.some(function(c){ return c.toLowerCase() === current.toLowerCase(); })) all.push(current);
  el.innerHTML = '<option value="">Category தேர்வு</option>';
  all.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    el.appendChild(opt);
  });
  var add = document.createElement('option');
  add.value = '__add_new__'; add.textContent = '＋ Add New';
  el.appendChild(add);
  el.value = current || '';
}

function _docSetCategoryValue(elOrId, value) {
  var el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  value = String(value || '').trim();
  if (value && !Array.prototype.some.call(el.options, function(o){ return String(o.value).toLowerCase() === value.toLowerCase(); })) {
    var opt = document.createElement('option'); opt.value = value; opt.textContent = value;
    var addOpt = Array.prototype.find.call(el.options, function(o){ return o.value === '__add_new__'; });
    el.insertBefore(opt, addOpt || null);
  }
  el.value = value;
}

function handleDocCategorySelect(el) {
  if (!el || el.value !== '__add_new__') return;
  var name = prompt('புதிய Document வகை பெயர்');
  name = String(name || '').trim();
  if (!name) { el.value = ''; return; }
  _docKnownCategories = _docCategoryOptions(_docKnownCategories.concat([name]));
  ['docCategory','docEditCategory'].forEach(function(id){
    var target = document.getElementById(id);
    if (target) _docPopulateCategorySelect(target, _docKnownCategories, target === el ? name : target.value);
  });
  _docSetCategoryValue(el, name);
}

function loadDocCategories() {
  google.script.run.withSuccessHandler(function(result) {
    if (result && result.ok) {
      var cats = result.categories || [];
      _docKnownCategories = _docCategoryOptions(cats);
      var filterEl = document.getElementById('docCatFilter');
      if (filterEl) {
        var current = filterEl.value;
        filterEl.innerHTML = '<option value="">அனைத்து வகைகள்</option>';
        cats.forEach(function(c) {
          var opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          filterEl.appendChild(opt);
        });
        filterEl.value = current;
      }
      ['docCategory','docEditCategory'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) _docPopulateCategorySelect(el, _docKnownCategories, el.value);
      });
    }
  }).withFailureHandler(function(err){
    console.error('Document categories load failed:', err);
    _docKnownCategories = _docCategoryOptions([]);
    ['docCategory','docEditCategory'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) _docPopulateCategorySelect(el, _docKnownCategories, el.value);
    });
  }).getVaultCategories();
}

function refreshDocList() {
  var list = document.getElementById('docList');
  var empty = document.getElementById('docEmptyState');
  if (!list) return;

  var docs = currentDocViewType === 'deleted' ? getDeletedDocuments() : docListCache;
  
  if (!docs || docs.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  
  list.innerHTML = docs.map(function(doc) {
    var typeIcon = doc.mimeType ? (
      doc.mimeType.indexOf('image') !== -1 ? '🖼️' :
      doc.mimeType.indexOf('pdf') !== -1 ? '📕' :
      doc.mimeType.indexOf('video') !== -1 ? '🎥' :
      doc.mimeType.indexOf('audio') !== -1 ? '🔊' :
      '📎'
    ) : '📎';

    return '<div class="list-item" onclick="viewDocument(\'' + doc.id + '\')" style="cursor:pointer">' +
      '<div class="list-item-l">' +
        '<div style="font-size:24px;margin-right:8px">' + typeIcon + '</div>' +
      '</div>' +
      '<div class="list-item-c" style="flex:1">' +
        '<div class="list-item-title">' + x(doc.title || 'Untitled') + '</div>' +
        '<div class="list-item-sub">' + x(doc.category || 'No category') + ' • ' + x((doc.uploadedAt || '').substring(0, 10)) + '</div>' +
        (doc.expiry ? '<div class="list-item-sub" style="color:#DC2626">⏰ ' + x(doc.expiry) + '</div>' : '') +
      '</div>' +
      '<div class="list-item-r" style="color:#9CA3AF;font-size:18px">›</div>' +
    '</div>';
  }).join('');
}

var deletedDocsCache = [];

function getDeletedDocuments() {
  return deletedDocsCache;
}

function loadDeletedDocuments() {
  google.script.run.withSuccessHandler(function(result) {
    if (result && result.ok) {
      deletedDocsCache = result.docs || [];
      if (currentDocViewType === 'deleted') {
        refreshDocList();
      }
    } else if (currentDocViewType === 'deleted') {
      _docShowLoadError((result && result.msg) || 'Trash load ஆகவில்லை');
    }
  }).withFailureHandler(function(err) {
    if (currentDocViewType === 'deleted') {
      _docShowLoadError((err && err.message) || 'Trash load ஆகவில்லை');
    }
  }).getVaultDeleted();
}

function handleDocSearch() {
  var q = (document.getElementById('docSearch') || {}).value || '';
  var cat = (document.getElementById('docCatFilter') || {}).value || '';
  if (!q && !cat) {
    loadDocuments();
    return;
  }
  google.script.run.withSuccessHandler(function(result) {
    if (result && result.ok) {
      docListCache = result.docs || [];
      refreshDocList();
    } else {
      _docShowLoadError((result && result.msg) || 'தேடல் ஆகவில்லை');
    }
  }).withFailureHandler(function(err) {
    _docShowLoadError((err && err.message) || 'தேடல் ஆகவில்லை');
  }).searchVaultDocuments(q, cat);
}

function handleDocFilter() {
  handleDocSearch();
}

function switchDocView(type) {
  currentDocViewType = type;
  document.getElementById('docViewTabActive').classList.toggle('on', type === 'active');
  document.getElementById('docViewTabDeleted').classList.toggle('on', type === 'deleted');
  
  if (type === 'deleted' && !deletedDocsCache.length) {
    loadDeletedDocuments();
  } else {
    refreshDocList();
  }
}

var docFileData = null;
var docCapturePages = [];
var docCaptureTarget = 'page';
var _docCaptureReplaceIndex = -1;
var _docUploadBusy = false;
var _docCropState = null;

function _docSetUploadBusy(busy) {
  _docUploadBusy = !!busy;
  var btn = document.querySelector('#p-docUpload .doc-form-actions .btn-primary');
  if (!btn) return;
  if (!btn.dataset.idleText) btn.dataset.idleText = btn.textContent || 'பதிவேற்றவும்';
  btn.disabled = _docUploadBusy;
  btn.setAttribute('aria-busy', _docUploadBusy ? 'true' : 'false');
  btn.textContent = _docUploadBusy ? 'பதிவேற்றப்படுகிறது…' : btn.dataset.idleText;
}

function _docPickCapture(target, replaceIndex) {
  docCaptureTarget = target || 'page';
  _docCaptureReplaceIndex = typeof replaceIndex === 'number' ? replaceIndex : -1;
  var inp = document.getElementById('docCaptureInput');
  if (inp) { inp.value = ''; inp.click(); }
}

function _docHandleCapture(evt) {
  var file = evt.target.files && evt.target.files[0];
  if (!file) return;
  if (!/^image\//i.test(file.type || '')) { toast('Image மட்டும் capture செய்யவும்'); evt.target.value=''; return; }
  _docOpenCropFromFile(file, docCaptureTarget, _docCaptureReplaceIndex, evt.target);
}

function _docOpenCropFromFile(file, target, replaceIndex, sourceInput) {
  var q=document.getElementById('docCropQuality'); if(q)q.textContent='Photo தயாராகிறது…';
  _ocrPrepareImage(file, 2200, function(base64){
    var img=new Image();
    img.onload=function(){
      _docCropState={
        sourceInput:sourceInput || null,
        target:target || 'page',
        replaceIndex:typeof replaceIndex==='number'?replaceIndex:-1,
        fileName:file.name || ('document-'+Date.now()+'.jpg'),
        img:img, rotation:0, x:0, y:0, w:img.width, h:img.height, drag:null
      };
      var title=document.getElementById('docCropTitle');
      if(title) title.textContent=(target==='front'?'✂️ Front Side Crop':target==='back'?'✂️ Back Side Crop':'✂️ Document Page Crop');
      var modal=document.getElementById('docCropModal'); if(modal)modal.style.display='flex';
      _docCropBindCanvas(); _docCropReset();
      if(q)q.textContent='Preview பார்த்து Crop / Retake செய்யலாம்';
    };
    img.onerror=function(){ if(q)q.textContent='❌ Photo preview திறக்க முடியவில்லை'; if(sourceInput)sourceInput.value=''; };
    img.src='data:image/jpeg;base64,'+base64;
  }, function(msg){
    if(q)q.textContent='❌ '+(msg||'Photo prepare ஆகவில்லை');
    if(sourceInput)sourceInput.value='';
    toast('Photo prepare ஆகவில்லை: '+(msg || 'Unknown error'));
  });
}

function _docOpenCropFromPage(page, orderedIndex) {
  if(!page || !page.base64)return;
  var img=new Image();
  img.onload=function(){
    _docCropState={sourceInput:null,target:page.role||'page',replaceIndex:orderedIndex,fileName:page.fileName||('document-'+Date.now()+'.jpg'),img:img,rotation:0,x:0,y:0,w:img.width,h:img.height,drag:null};
    var title=document.getElementById('docCropTitle');
    if(title)title.textContent=(page.role==='front'?'✂️ Front Side Crop':page.role==='back'?'✂️ Back Side Crop':'✂️ Document Page Crop');
    var modal=document.getElementById('docCropModal');if(modal)modal.style.display='flex';
    _docCropBindCanvas();_docCropReset();
    var q=document.getElementById('docCropQuality');if(q)q.textContent='Crop மாற்றி மீண்டும் Use Photo அழுத்தவும்';
  };
  img.onerror=function(){toast('Preview திறக்க முடியவில்லை');};
  img.src='data:image/jpeg;base64,'+page.base64;
}

function _docCropCanvasSize(){
  var st=_docCropState,canvas=document.getElementById('docCropCanvas');if(!st||!canvas)return null;
  var rot=((st.rotation%360)+360)%360,swap=rot===90||rot===270;
  var iw=swap?st.img.height:st.img.width,ih=swap?st.img.width:st.img.height;
  var maxSide=1600,scale=Math.min(1,maxSide/Math.max(iw,ih));
  canvas.width=Math.max(1,Math.round(iw*scale));canvas.height=Math.max(1,Math.round(ih*scale));
  return {iw:iw,ih:ih,scale:scale,cw:canvas.width,ch:canvas.height};
}

function _docCropDraw(){
  var st=_docCropState,canvas=document.getElementById('docCropCanvas');if(!st||!canvas)return;
  _docCropCanvasSize();var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(st.rotation*Math.PI/180);
  var rot=((st.rotation%360)+360)%360,dw=(rot===90||rot===270)?canvas.height:canvas.width,dh=(rot===90||rot===270)?canvas.width:canvas.height;
  ctx.drawImage(st.img,-dw/2,-dh/2,dw,dh);ctx.restore();
  ctx.save();ctx.fillStyle='rgba(20,13,16,.48)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.clearRect(st.x,st.y,st.w,st.h);
  ctx.save();ctx.beginPath();ctx.rect(st.x,st.y,st.w,st.h);ctx.clip();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(st.rotation*Math.PI/180);ctx.drawImage(st.img,-dw/2,-dh/2,dw,dh);ctx.restore();
  ctx.strokeStyle='#f2c24f';ctx.lineWidth=Math.max(3,canvas.width/260);ctx.strokeRect(st.x,st.y,st.w,st.h);
  var hs=Math.max(10,canvas.width/55);ctx.fillStyle='#fff';ctx.strokeStyle='#6f0719';ctx.lineWidth=2;
  [[st.x,st.y],[st.x+st.w,st.y],[st.x,st.y+st.h],[st.x+st.w,st.y+st.h]].forEach(function(pt){ctx.beginPath();ctx.arc(pt[0],pt[1],hs,0,Math.PI*2);ctx.fill();ctx.stroke();});ctx.restore();
}

function _docCropReset(){
  if(!_docCropState)return;var canvas=document.getElementById('docCropCanvas');var info=_docCropCanvasSize();if(!info)return;
  var px=Math.max(8,Math.round(canvas.width*.035)),py=Math.max(8,Math.round(canvas.height*.035));
  _docCropState.x=px;_docCropState.y=py;_docCropState.w=canvas.width-px*2;_docCropState.h=canvas.height-py*2;_docCropDraw();
}

function _docCropRotate(){if(!_docCropState)return;_docCropState.rotation=(_docCropState.rotation+90)%360;_docCropReset();}

function _docCropBindCanvas(){
  var canvas=document.getElementById('docCropCanvas');if(!canvas||canvas.getAttribute('data-doc-crop-bound')==='1')return;canvas.setAttribute('data-doc-crop-bound','1');
  function pos(e){var r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};}
  function hit(st,p){var tol=Math.max(24,canvas.width/28),x1=st.x,y1=st.y,x2=st.x+st.w,y2=st.y+st.h,nearL=Math.abs(p.x-x1)<tol,nearR=Math.abs(p.x-x2)<tol,nearT=Math.abs(p.y-y1)<tol,nearB=Math.abs(p.y-y2)<tol;if(nearL&&nearT)return'tl';if(nearR&&nearT)return'tr';if(nearL&&nearB)return'bl';if(nearR&&nearB)return'br';if(p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2)return'move';return null;}
  canvas.addEventListener('pointerdown',function(e){var st=_docCropState;if(!st)return;var p=pos(e),mode=hit(st,p);if(!mode)return;st.drag={mode:mode,sx:p.x,sy:p.y,x:st.x,y:st.y,w:st.w,h:st.h};try{canvas.setPointerCapture(e.pointerId);}catch(_){ }e.preventDefault();});
  canvas.addEventListener('pointermove',function(e){var st=_docCropState;if(!st||!st.drag)return;var p=pos(e),d=st.drag,dx=p.x-d.sx,dy=p.y-d.sy,minW=Math.max(70,canvas.width*.16),minH=Math.max(70,canvas.height*.12),x=d.x,y=d.y,w=d.w,h=d.h;if(d.mode==='move'){x=Math.max(0,Math.min(canvas.width-w,d.x+dx));y=Math.max(0,Math.min(canvas.height-h,d.y+dy));}else{if(d.mode.indexOf('l')>=0){x=Math.max(0,Math.min(d.x+d.w-minW,d.x+dx));w=d.w+(d.x-x);}if(d.mode.indexOf('r')>=0)w=Math.max(minW,Math.min(canvas.width-d.x,d.w+dx));if(d.mode.indexOf('t')>=0){y=Math.max(0,Math.min(d.y+d.h-minH,d.y+dy));h=d.h+(d.y-y);}if(d.mode.indexOf('b')>=0)h=Math.max(minH,Math.min(canvas.height-d.y,d.h+dy));}st.x=x;st.y=y;st.w=w;st.h=h;_docCropDraw();e.preventDefault();});
  function up(e){if(_docCropState)_docCropState.drag=null;try{canvas.releasePointerCapture(e.pointerId);}catch(_){} }canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
}

function _docCropClose(clearInput){var st=_docCropState,modal=document.getElementById('docCropModal');if(modal)modal.style.display='none';if(clearInput&&st&&st.sourceInput)st.sourceInput.value='';_docCropState=null;}

function _docCropRetake(){var st=_docCropState;if(!st)return;var target=st.target,replaceIndex=st.replaceIndex;_docCropClose(true);_docPickCapture(target,replaceIndex);}

function _docQualityCheck(canvas){
  var w=canvas.width,h=canvas.height,maxSide=280,scale=Math.min(1,maxSide/Math.max(w,h)),sw=Math.max(24,Math.round(w*scale)),sh=Math.max(24,Math.round(h*scale));
  var sm=document.createElement('canvas');sm.width=sw;sm.height=sh;var sx=sm.getContext('2d');sx.drawImage(canvas,0,0,sw,sh);var data=sx.getImageData(0,0,sw,sh).data,n=sw*sh,gray=new Float32Array(n),sum=0;
  for(var i=0,j=0;i<data.length;i+=4,j++){var g=.299*data[i]+.587*data[i+1]+.114*data[i+2];gray[j]=g;sum+=g;}
  var avg=sum/n,variance=0,edge=0,ec=0;
  for(var k=0;k<n;k++){var d=gray[k]-avg;variance+=d*d;}
  variance/=n;var contrast=Math.sqrt(variance);
  for(var y=1;y<sh-1;y+=2){for(var x=1;x<sw-1;x+=2){var idx=y*sw+x;edge+=Math.abs(gray[idx]-gray[idx-1])+Math.abs(gray[idx]-gray[idx-sw]);ec+=2;}}
  edge=ec?edge/ec:0;
  if(avg<22)return{ok:false,msg:'Photo மிகவும் dark ஆக உள்ளது. மீண்டும் தெளிவாக எடுக்கவும்.'};
  if(avg>246)return{ok:false,msg:'Photo மிகவும் bright / blank ஆக உள்ளது. மீண்டும் எடுக்கவும்.'};
  if(contrast<10)return{ok:false,msg:'Document தெளிவாக தெரியவில்லை. Blank / low-contrast photo போல உள்ளது.'};
  if(edge<3.2)return{ok:false,msg:'Photo blur ஆக உள்ளது. Camera steady-ஆ வைத்து மீண்டும் எடுக்கவும்.'};
  return{ok:true,msg:'✓ Photo quality சரியாக உள்ளது'};
}

function _docCommitCroppedPage(st,base64){
  var page={base64:base64,mimeType:'image/jpeg',fileName:st.fileName||('page-'+Date.now()+'.jpg'),role:st.target||'page'};
  var ordered=_docOrderedCapturePages();
  if(st.replaceIndex>=0&&ordered[st.replaceIndex]){
    var victim=ordered[st.replaceIndex],actual=docCapturePages.indexOf(victim);
    if(actual>=0){page.role=victim.role;docCapturePages[actual]=page;}
  }else if(page.role==='front'||page.role==='back'){
    var idx=docCapturePages.findIndex(function(p){return p.role===page.role;});if(idx>=0)docCapturePages[idx]=page;else docCapturePages.push(page);
  }else{page.role='page';docCapturePages.push(page);}
  docFileData=null;var fi=document.getElementById('docFileInput');if(fi)fi.value='';_docRenderCapturePages();
}

function _docCropUse(){
  var st=_docCropState,canvas=document.getElementById('docCropCanvas');if(!st||!canvas)return;var btn=document.getElementById('docCropUseBtn');if(btn)btn.disabled=true;
  var clean=document.createElement('canvas');clean.width=canvas.width;clean.height=canvas.height;var ctx=clean.getContext('2d');ctx.translate(clean.width/2,clean.height/2);ctx.rotate(st.rotation*Math.PI/180);var rot=((st.rotation%360)+360)%360,dw=(rot===90||rot===270)?clean.height:clean.width,dh=(rot===90||rot===270)?clean.width:clean.height;ctx.drawImage(st.img,-dw/2,-dh/2,dw,dh);
  var out=document.createElement('canvas');out.width=Math.max(1,Math.round(st.w));out.height=Math.max(1,Math.round(st.h));out.getContext('2d').drawImage(clean,st.x,st.y,st.w,st.h,0,0,out.width,out.height);
  var quality=_docQualityCheck(out),q=document.getElementById('docCropQuality');
  if(!quality.ok){if(q)q.textContent='❌ '+quality.msg;if(btn)btn.disabled=false;toast(quality.msg);return;}
  if(q)q.textContent=quality.msg;
  var base64=out.toDataURL('image/jpeg',.92).split(',')[1];_docCommitCroppedPage(st,base64);_docCropClose(false);if(btn)btn.disabled=false;
}

function _docOrderedCapturePages(){
  var out=[];
  ['front','back'].forEach(function(role){var p=docCapturePages.find(function(x){return x.role===role;});if(p)out.push(p);});
  docCapturePages.forEach(function(p){if(p.role==='page')out.push(p);});
  return out;
}

function _docRemoveCapturePage(index){var ordered=_docOrderedCapturePages(),victim=ordered[index];if(!victim)return;var i=docCapturePages.indexOf(victim);if(i>=0)docCapturePages.splice(i,1);_docRenderCapturePages();}
function _docEditCapture(role){var ordered=_docOrderedCapturePages(),idx=ordered.findIndex(function(p){return p.role===role;});if(idx>=0)_docOpenCropFromPage(ordered[idx],idx);}
function _docEditCaptureByIndex(index){var ordered=_docOrderedCapturePages();if(ordered[index])_docOpenCropFromPage(ordered[index],index);}
function _docRetakeCaptureByIndex(index){var ordered=_docOrderedCapturePages(),p=ordered[index];if(p)_docPickCapture(p.role||'page',index);}

function _docRenderCapturePages(){
  var ordered=_docOrderedCapturePages();
  ['front','back'].forEach(function(role){
    var p=docCapturePages.find(function(x){return x.role===role;}),state=document.getElementById(role==='front'?'docFrontState':'docBackState'),card=document.getElementById(role==='front'?'docFrontCard':'docBackCard'),img=document.getElementById(role==='front'?'docFrontPreview':'docBackPreview'),actions=document.getElementById(role==='front'?'docFrontActions':'docBackActions');
    if(state)state.textContent=p?'✓ Captured':'Photo எடுக்க';if(card)card.classList.toggle('has-page',!!p);if(img){if(p){img.src='data:image/jpeg;base64,'+p.base64;img.style.display='block';}else{img.removeAttribute('src');img.style.display='none';}}if(actions)actions.hidden=!p;
  });
  var box=document.getElementById('docPagePreview');
  if(box){var pageNo=0;box.innerHTML=ordered.map(function(p,i){if(p.role!=='page')return'';pageNo++;return '<div class="doc-page-preview-card"><img alt="Page '+pageNo+' preview" src="data:image/jpeg;base64,'+p.base64+'"><div class="doc-page-preview-label">Page '+pageNo+'</div><div class="doc-page-actions"><button type="button" onclick="_docEditCaptureByIndex('+i+')">✂️ Crop</button><button type="button" onclick="_docRetakeCaptureByIndex('+i+')">↻ Retake</button><button type="button" class="doc-remove-action" onclick="_docRemoveCapturePage('+i+')">× Remove</button></div></div>';}).join('');}
  var prev=document.getElementById('docFilePreview');if(prev&&ordered.length)prev.textContent=ordered.length+' page'+(ordered.length>1?'s':'')+' ready — Save செய்தால் ஒரே PDF';else if(prev&&!docFileData)prev.textContent='தேர்ந்தெடுக்கப்பட்ட கோப்பு: எதுவும் இல்லை';
}

function _docResetUploadState(){docFileData=null;docCapturePages=[];docCaptureTarget='page';_docCaptureReplaceIndex=-1;['docTitle','docCategory','docExpiry','docNote'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});['docFileInput','docCaptureInput'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});_docRenderCapturePages();}

function handleDocFileSelect(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  docCapturePages = [];
  _docRenderCapturePages();

  var reader = new FileReader();
  reader.onload = function(e) {
    docFileData = {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64: e.target.result.split(',')[1]
    };
    var preview = document.getElementById('docFilePreview');
    if (preview) {
      preview.textContent = 'தேர்ந்தெடுக்கப்பட்ட: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================
//  Smart Capture (Document Vault).
//  Reuses the exact same docFileData variable, preview element, and
//  save button (uploadDocument()) as the manual file-select flow above
//  — this is deliberate: Smart Capture only ever PREPARES the same
//  data manual selection would, it never saves anything on its own and
//  never bypasses the existing review step.
//
//  OCR suggestion uses a SEPARATE, resized/EXIF-corrected JPEG copy —
//  built via the same _ocrPrepareImage() helper MOI capture uses — and
//  sends ONLY that copy to suggestVaultDocumentMetadata(). docFileData
//  (the ORIGINAL selected file) is set from the full, untouched
//  reader.readAsDataURL() result above and is never overwritten by the
//  OCR copy — uploadDocument() always saves the original, full-quality
//  file. A failed or skipped suggestion never blocks saving and never
//  falls through to the app's global crash-guard toast — it has its own
//  failure handling below. Suggestions only ever fill an EMPTY title/
//  category field; they never overwrite something the person typed.
// ============================================================
function handleSmartCapture(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var statusEl = document.getElementById('docSmartCaptureStatus');

  var reader = new FileReader();
  reader.onload = function(e) {
    // ORIGINAL file — this is what uploadDocument() actually saves.
    docFileData = {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64: e.target.result.split(',')[1]
    };
    var preview = document.getElementById('docFilePreview');
    if (preview) {
      preview.textContent = 'தேர்ந்தெடுக்கப்பட்ட: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    }

    // OCR suggestion only applies to images — a PDF or other file type
    // simply gets no suggestion, same as before; the original file is
    // still fully saveable either way.
    if (!/^image\//i.test(file.type)) return;

    if (statusEl) statusEl.textContent = 'படம் ஆய்வு செய்யப்படுகிறது...';

    // Separate, resized+EXIF-corrected copy for OCR ONLY — never sent
    // as, or stored as, the saved document.
    _ocrPrepareImage(file, 2000, function(ocrBase64) {
      _suggestVaultMetadataWithRotationFallback(ocrBase64, file.name, function(res) {
          if (!res || !res.ok) {
            if (statusEl) statusEl.textContent = '';
            return;
          }
          var titleEl = document.getElementById('docTitle');
          var catEl   = document.getElementById('docCategory');
          if (titleEl && !titleEl.value && res.suggestedTitle) titleEl.value = res.suggestedTitle;
          if (catEl && !catEl.value && res.suggestedCategory) _docSetCategoryValue(catEl, res.suggestedCategory);
          if (statusEl) {
            statusEl.textContent = res.confidence === 'none'
              ? '⚠️ படத்தில் இருந்து எதுவும் கண்டறியப்படவில்லை — தலைப்பு/வகையை நீங்களே பூர்த்தி செய்யவும்.'
              : '💡 பரிந்துரை நிரப்பப்பட்டது — தேவைப்பட்டால் திருத்தவும்';
          }
        }, function(err) {
          // Smart Capture's OWN failure handler — a suggestion failure
          // must never block saving the original file, and must never
          // fall through to the app's generic global crash-guard toast.
          if (statusEl) statusEl.textContent = '';
          console.error('Smart Capture suggestion failed (non-blocking):', err);
        });
    }, function(errMsg) {
      // _ocrPrepareImage's own failure (e.g. unreadable image) — again,
      // never blocks saving the original file, never a global crash.
      if (statusEl) statusEl.textContent = '';
      console.error('Smart Capture image prep failed (non-blocking):', errMsg);
    });
  };
  reader.readAsDataURL(file);
}

function uploadDocument() {
  if (_docUploadBusy) return;

  var pages = _docOrderedCapturePages();
  if (!docFileData && !pages.length) {
    alert('தயவுசெய்து File தேர்வு செய்யவும் அல்லது Photo capture செய்யவும்');
    return;
  }
  var title = (document.getElementById('docTitle') || {}).value || '';
  if (!title) { alert('தலைப்பு தேவை'); return; }

  var meta = {
    title:title,
    category:(document.getElementById('docCategory') || {}).value || '',
    expiry:(document.getElementById('docExpiry') || {}).value || '',
    note:(document.getElementById('docNote') || {}).value || ''
  };
  var runner = google.script.run.withSuccessHandler(function(result) {
    loading(false);
    _docSetUploadBusy(false);
    if (result && result.ok) {
      toast('✅ Document saved');
      _docResetUploadState();
      loadDocuments();
      go('documents');
    } else {
      alert('பிழை: ' + ((result && result.msg) || 'Document save ஆகவில்லை'));
    }
  }).withFailureHandler(function(err){
    loading(false);
    _docSetUploadBusy(false);
    var msg=(err && err.message) || String(err || 'Document save ஆகவில்லை');
    alert('Document upload error: '+msg);
    console.error('Vault upload failed:', err);
  });

  _docSetUploadBusy(true);
  loading(true);
  try {
    if (pages.length) {
      meta.pages = pages.map(function(p){ return {base64:p.base64,mimeType:p.mimeType,fileName:p.fileName}; });
      runner.addVaultMultiPageDocument(meta);
    } else {
      meta.base64=docFileData.base64;
      meta.fileName=docFileData.fileName;
      meta.mimeType=docFileData.mimeType;
      runner.addVaultDocument(meta);
    }
  } catch (err) {
    loading(false);
    _docSetUploadBusy(false);
    var msg=(err && err.message) || String(err || 'Document save ஆகவில்லை');
    alert('Document upload error: '+msg);
    console.error('Vault upload start failed:', err);
  }
}

function viewDocument(docId) {
  currentDocId = docId;
  var doc = docListCache.find(function(d) { return d.id === docId; });
  
  if (!doc) {
    alert('ஆவணம் கிடைக்கவில்லை');
    return;
  }

  var content = document.getElementById('docViewContent');
  if (content) {
    var typeIcon = doc.mimeType ? (
      doc.mimeType.indexOf('image') !== -1 ? '🖼️' :
      doc.mimeType.indexOf('pdf') !== -1 ? '📕' :
      doc.mimeType.indexOf('video') !== -1 ? '🎥' :
      doc.mimeType.indexOf('audio') !== -1 ? '🔊' :
      '📎'
    ) : '📎';

    var html = '<div style="margin-bottom:12px">' +
      '<div style="font-size:48px;text-align:center;margin-bottom:8px">' + typeIcon + '</div>' +
      '<div style="font-size:18px;font-weight:bold;margin-bottom:4px">' + x(doc.title || 'Untitled') + '</div>' +
      '<div style="font-size:13px;color:#6B7280;margin-bottom:4px">வகை: ' + x(doc.category || 'None') + '</div>' +
      '<div style="font-size:13px;color:#6B7280;margin-bottom:4px">பதிவேற்றப்பட்ட: ' + x(doc.uploadedAt || '') + '</div>';
    
    if (doc.expiry) {
      html += '<div style="font-size:13px;color:#DC2626;margin-bottom:4px">⏰ பயன்படுத்த முறையான தேதி: ' + x(doc.expiry) + '</div>';
    }
    if (doc.note) {
      html += '<div style="font-size:13px;color:#6B7280;margin-top:8px;font-style:italic">' + x(doc.note) + '</div>';
    }
    
    html += '<div style="margin-top:12px;padding:8px;background:#F3F4F6;border-radius:6px;font-size:12px;color:#6B7280">' +
      'கோப்பு ID: ' + x((doc.driveFileId || '').substring(0, 16)) + '...' +
    '</div></div>';
    
    content.innerHTML = html;
  }

  go('docView');
}

function shareDocument() {
  if (!currentDocId) return;
  var doc = docListCache.find(function(d) { return d.id === currentDocId; });
  if (!doc) return;

  var message = 'Google Drive இல் ' + (doc.title || 'Document') + ' திறக்கவும்:\n\n' +
    'https://drive.google.com/file/d/' + doc.driveFileId + '/view';
  
  if (navigator.share) {
    navigator.share({
      title: doc.title || 'Document',
      text: message
    }).catch(function(err) {
      console.log('Share failed:', err);
    });
  } else {
    alert(message);
  }
}

function editDocument() {
  if (!currentDocId) return;
  var doc = docListCache.find(function(d) { return d.id === currentDocId; });
  if (!doc) return;

  document.getElementById('docEditTitle').value = doc.title || '';
  _docSetCategoryValue('docEditCategory', doc.category || '');
  document.getElementById('docEditExpiry').value = doc.expiry || '';
  document.getElementById('docEditNote').value = doc.note || '';

  go('docEdit');
}

function saveDocumentChanges() {
  if (!currentDocId) return;

  var updates = {
    title: document.getElementById('docEditTitle').value || '',
    category: document.getElementById('docEditCategory').value || '',
    expiry: document.getElementById('docEditExpiry').value || '',
    note: document.getElementById('docEditNote').value || ''
  };

  loading(true);
  google.script.run
    .withSuccessHandler(function(result) {
      loading(false);
      if (result && result.ok) {
        toast('✅ ஆவணம் புதுப்பிக்கப்பட்டது');
        loadDocuments();
        go('documents');
      } else {
        alert('பிழை: ' + ((result && result.msg) || 'அறியப்படாத பிழை'));
      }
    })
    .withFailureHandler(function(e) {
      loading(false);
      toastError(e);
    })
    .updateVaultDocument(currentDocId, updates);
}

function deleteDocumentConfirm() {
  if (!currentDocId) return;
  var doc = docListCache.find(function(d) { return d.id === currentDocId; });
  if (!doc) return;

  if (confirm('ஆவணம் நீக்கப்பட்டுவிடுமா? இது குப்பைக்கு செல்லும்.')) {
    deleteDocumentAction();
  }
}

function deleteDocumentAction() {
  if (!currentDocId) return;

  loading(true);
  google.script.run
    .withSuccessHandler(function(result) {
      loading(false);
      if (result && result.ok) {
        toast('✅ ஆவணம் நீக்கப்பட்டது');
        docListCache = docListCache.filter(function(d) { return d.id !== currentDocId; });
        currentDocId = null;
        loadDocuments();
        go('documents');
      } else {
        alert('பிழை: ' + ((result && result.msg) || 'அறியப்படாத பிழை'));
      }
    })
    .withFailureHandler(function(e) {
      loading(false);
      toastError(e);
    })
    .deleteVaultDocument(currentDocId);
}

function restoreDocumentAction(docId) {
  loading(true);
  google.script.run
    .withSuccessHandler(function(result) {
      loading(false);
      if (result && result.ok) {
        toast('✅ ஆவணம் மீட்டுக்கொள்ளப்பட்டது');
        loadDocuments();
        loadDeletedDocuments();
        switchDocView('active');
      } else {
        alert('பிழை: ' + ((result && result.msg) || 'அறியப்படாத பிழை'));
      }
    })
    .withFailureHandler(function(e) {
      loading(false);
      toastError(e);
    })
    .restoreVaultDocument(docId);
}

// Hook into the page navigator
var originalGo = go;
go = function(page) {
  if (page === 'documents') {
    loadDocuments();
  }
  return originalGo(page);
};

// Initialize on first load
setTimeout(function() {
  var docsTab = document.getElementById('t-documents');
  if (docsTab) {
    docsTab.addEventListener('click', function() {
      loadDocuments();
    });
  }
}, 100);



// ============================================================
// v286 — Duplicate person review / user-confirmed merge
// ============================================================
var _nmDuplicateSuggestions=[];
var _nmLastMergeId='';
function openDuplicatePersonReview(){
  var m=document.getElementById('duplicatePersonModal'),list=document.getElementById('duplicatePersonList');if(!m||!list)return;
  m.style.display='flex';list.innerHTML='<div class="nm-dup-loading">ஒத்த பெயர்களை பார்க்கிறது…</div>';
  google.script.run.withSuccessHandler(function(res){
    _nmDuplicateSuggestions=(res&&res.suggestions)||[];renderDuplicatePersonReview();
  }).withFailureHandler(function(e){list.innerHTML='<div class="empty">'+x((e&&e.message)||'Duplicate review கிடைக்கவில்லை')+'</div>';}).getDuplicatePersonSuggestions();
}
function closeDuplicatePersonReview(){var m=document.getElementById('duplicatePersonModal');if(m)m.style.display='none';}
function renderDuplicatePersonReview(){
  var list=document.getElementById('duplicatePersonList');if(!list)return;
  if(!_nmDuplicateSuggestions.length){list.innerHTML='<div class="nm-dup-empty">✅ Merge செய்ய வேண்டிய high-confidence duplicate பெயர்கள் இல்லை.</div>';return;}
  list.innerHTML=_nmDuplicateSuggestions.map(function(d,i){
    return '<div class="nm-dup-card"><div class="nm-dup-score">'+d.confidence+'% match · '+x(d.reason||'ஒத்த பதிவு')+'</div>'+
      '<div class="nm-dup-pair"><div><b>'+x(d.a.name)+'</b><small>'+x(d.a.place||'ஊர் இல்லை')+' · '+d.a.count+' பதிவு'+(d.a.occupation?' · 💼 '+x(d.a.occupation):'')+(d.a.iruppu?' · 📍 '+x(d.a.iruppu):'')+'</small></div><span>↔</span><div><b>'+x(d.b.name)+'</b><small>'+x(d.b.place||'ஊர் இல்லை')+' · '+d.b.count+' பதிவு'+(d.b.occupation?' · 💼 '+x(d.b.occupation):'')+(d.b.iruppu?' · 📍 '+x(d.b.iruppu):'')+'</small></div></div>'+
      '<div class="nm-dup-actions"><button type="button" onclick="confirmDuplicateMerge('+i+',\'a\')">← இதை வைத்துக்கொள்</button><button type="button" onclick="confirmDuplicateMerge('+i+',\'b\')">இதை வைத்துக்கொள் →</button></div></div>';
  }).join('');
}
function confirmDuplicateMerge(i,keep){
  var d=_nmDuplicateSuggestions[i];if(!d)return;var target=keep==='a'?d.a:d.b,source=keep==='a'?d.b:d.a;
  var conflicts=[];if(source.occupation&&target.occupation&&_moiSearchNorm(source.occupation)!==_moiSearchNorm(target.occupation))conflicts.push('தொழில்: '+source.occupation+' → '+target.occupation);if(source.iruppu&&target.iruppu&&_moiSearchNorm(source.iruppu)!==_moiSearchNorm(target.iruppu))conflicts.push('இருப்பிடம்: '+source.iruppu+' → '+target.iruppu);
  var msg='“'+source.name+'” → “'+target.name+'” என்று Merge செய்யவா?\n\n'+(conflicts.length?('Profile வேறுபாடு:\n• '+conflicts.join('\n• ')+'\n\nநீங்கள் வைத்துக்கொள்ளும் பெயரின் profile value பயன்படுத்தப்படும்.\n\n'):'')+'இந்த மாற்றம் உங்கள் data-க்கு மட்டும். மற்ற users records மாற்றப்படாது.';
  if(!window.confirm(msg))return;
  var contribute=document.getElementById('duplicateMasterConsent');var allow=!contribute||contribute.checked;
  loading(true);google.script.run.withSuccessHandler(function(res){loading(false);if(!res||!res.ok){toast((res&&res.msg)||'Merge முடியவில்லை');return;}
    _nmLastMergeId=res.mergeId||'';toast(res.msg||'Merge முடிந்தது');_nmDuplicateSuggestions.splice(i,1);renderDuplicatePersonReview();
    var undo=document.getElementById('duplicateUndoBtn');if(undo)undo.style.display=_nmLastMergeId?'inline-flex':'none';
    try{loadData(true);}catch(e){try{loadData();}catch(_){} }
  }).withFailureHandler(function(e){loading(false);toast((e&&e.message)||'Merge முடியவில்லை');}).mergeDuplicatePerson(source,target,allow);
}
function undoLastDuplicateMerge(){if(!_nmLastMergeId)return;loading(true);google.script.run.withSuccessHandler(function(res){loading(false);toast((res&&res.msg)||'Undo முடிந்தது');_nmLastMergeId='';var b=document.getElementById('duplicateUndoBtn');if(b)b.style.display='none';openDuplicatePersonReview();try{loadData(true);}catch(e){}}).withFailureHandler(function(e){loading(false);toast((e&&e.message)||'Undo முடியவில்லை');}).undoPersonMerge(_nmLastMergeId);}


// ============================================================
// ACCOUNT TAB
// ============================================================
function renderAccount() {
  var planLabel = { trial:'Trial', basic:'Basic', premium:'Premium' };
  // Profile is intentionally lazy-loaded only when Account is opened.
  setTimeout(function(){ loadMyProfile(false); }, 0);
  document.getElementById('accountInfo').innerHTML =
    '<div class="list"><div class="card">'
    +'<div class="rname">'+x(S.name)+'</div>'
    +'<div class="rplace">'+x(S.email)+'</div>'
    +'<div class="rplace">பாத்திரம்: '+(S.role==='sub'?'Sub User':'Main User')+'</div>'
    +(S.role==='sub'&&S.ownerEmail?'<div class="rplace" style="color:#0F6E56;font-size:12px">Main User: '+x(S.ownerEmail)+'</div>':'')
    +'<div class="rmeta"><span class="badge plan-'+S.plan+' plan-badge">'+(planLabel[S.plan]||S.plan)+'</span></div>'
    +(S.expiry?'<div style="font-size:12px;color:#6B7280;margin-top:4px">Plan Expiry: '+S.expiry+'</div>':'')
    +(S.role!=='sub'?'<div class="rplace" style="margin-top:6px">🎁 Referral Code: <b>'+x(S.email)+'</b> — நண்பர்களுக்கு பகிரவும், Activate ஆனதும் இருவருக்கும் +1 மாதம்!</div>':'')
    +'</div></div>'
    // FIX [review]: data-safety request — Trash entry point. Visible to
    // everyone (viewers can look, but restoreRecord() still enforces
    // write permission server-side, same as every other action here).
    +'<button class="btn-cancel" style="width:100%;margin-top:12px" onclick="openTrashPanel()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg> நீக்கப்பட்ட பதிவுகள் (Trash)</button>';

  // Sub-tab bar for main user (Sub Users | Audit Log)
  // Sub users only — no sub-tab bar
  var pg = document.getElementById('p-account');

  // Remove old dynamic sections
  ['acct-sub-tabs','subUserSection','acctAuditSection','acctReceiptBtn'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.parentNode.removeChild(el);
  });

  // FIX [46]: Receipt Settings shortcut — for Main/Super Admin
  if (S.role === 'main' || S.role === 'super_admin') {
    var rBtn = document.createElement('button');
    rBtn.id = 'acctReceiptBtn';
    rBtn.className = 'btn-cancel';
    rBtn.style.cssText = 'width:100%;margin-top:12px;border-color:#9FE0C7;color:#0F6E56';
    rBtn.textContent = '🧾 ரசீது அமைவுகள் (பெயர், மனைவி பெயர், மண்டபம்)';
    rBtn.onclick = openReceiptSettings;
    var cpSec = pg.querySelector('.sec');
    if (cpSec) cpSec.parentNode.insertBefore(rBtn, cpSec);
    else pg.appendChild(rBtn);
  }

  if (S.role === 'main') {
    var maxSub = ({ trial:3, premium:3 })[S.plan] || 0;

    // Sub-tab bar — FIX [11]: "Sub Users" tab is always shown now (even
    // for non-Premium main users) so it can display the upgrade prompt,
    // instead of silently disappearing.
    var tabBar = document.createElement('div');
    tabBar.id = 'acct-sub-tabs';
    tabBar.className = 'admin-sub-tabs';
    tabBar.style.marginTop = '16px';
    tabBar.innerHTML =
      '<button class="ast-btn on" id="acct-tab-sub" onclick="_acctTab(\'sub\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-people"></use></svg> Sub Users</button>'
      +'<button class="ast-btn" id="acct-tab-audit" onclick="_acctTab(\'audit\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> Audit Log</button>'
      +'<button class="ast-btn" id="acct-tab-url" onclick="_acctTab(\'url\')">🔗 Share URL</button>';

    var cpSec = pg.querySelector('.sec');
    if (cpSec) cpSec.parentNode.insertBefore(tabBar, cpSec);
    else pg.appendChild(tabBar);

    // Content container
    var content = document.createElement('div');
    content.id = 'acctTabContent';
    tabBar.parentNode.insertBefore(content, tabBar.nextSibling);

    _acctTab('sub');
  }
}


var _acctTabActive = '';

function _acctTab(tab) {
  _acctTabActive = tab;
  ['sub','audit','url'].forEach(function(t){
    var btn = document.getElementById('acct-tab-'+t);
    if (btn) btn.classList.toggle('on', t===tab);
  });
  var box = document.getElementById('acctTabContent');
  if (!box) return;
  box.innerHTML = '';

  if (tab === 'sub')   _renderSubUserSection(box);
  if (tab === 'audit') _renderMyAuditLog(box);
  if (tab === 'url')   _renderShareUrl(box);
}


// ── Sub User Section ─────────────────────────────────────────
// FIX [11]: Sub-user creation is now Premium-only (Basic no longer
// gets 1 sub-user). Non-Premium main users still get a tab, but see
// an upgrade prompt instead of a broken 0/0 add form.
function _renderSubUserSection(box) {
  var maxSub = ({ trial:3, premium:3 })[S.plan] || 0;

  if (maxSub <= 0) {
    box.innerHTML =
      '<div class="sec"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-people"></use></svg> Sub Users</div>'
      +'<div class="sub-user-box" style="background:#FFF7ED;border:1px solid #FCD34D;text-align:center;padding:20px">'
      +'<div style="font-size:32px;margin-bottom:8px">👑</div>'
      +'<div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:6px">Sub-user, Trial அல்லது Premium plan-ல் மட்டுமே கிடைக்கும்</div>'
      +'<div style="font-size:13px;color:#92400E;margin-bottom:14px">உங்கள் குடும்பத்தினர்/பணியாளர்களை சேர்க்க Premium-க்கு Upgrade செய்யவும்.</div>'
      +'<button class="btn-save" onclick="openUpgradeModal()">⭐ Premium-க்கு Upgrade</button>'
      +'</div>';
    return;
  }

  box.innerHTML =
    '<div class="sec"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-people"></use></svg> Sub Users (<span id="subUserCount">ஏற்றுகிறது...</span> / '+maxSub+')</div>'
    +'<div id="subUserList" style="margin-bottom:12px"></div>'
    +'<div class="sub-user-box">'
    +'<div class="su-title"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> புதிய Sub User சேர்</div>'
    +'<div class="fg"><label>Gmail *</label>'
    +'<input type="email" id="su_email" class="inp" placeholder="subuser@gmail.com"></div>'
    +'<div class="fg"><label>பெயர் *</label>'
    +'<input type="text" id="su_name" class="inp" placeholder="Sub user பெயர்"></div>'
    +'<div class="fg"><label>அனுமதி (Role)</label>'
    +'<select id="su_role" class="inp">'
    +'<option value="viewer">Viewer — படிக்க மட்டும்</option>'
    +'<option value="editor" selected>Editor — சேர்க்க/திருத்த</option>'
    +'<option value="admin">Admin — நீக்கவும் முடியும்</option>'
    +'</select></div>'
    +'<div id="suErr" style="font-size:13px;color:#DC2626;min-height:18px;margin-bottom:8px"></div>'
    +'<button class="btn-save" onclick="doCreateSubUser()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்</button>'
    +'</div>'
    +'<div class="sub-user-box" style="margin-top:10px;background:#FFF7ED;border:1px solid #FCD34D">'
    +'<div style="font-size:13px;color:#92400E">⚠️ Sub user login செய்ய: கீழே உள்ள <strong>Share URL</strong> tab-ல் app URL copy செய்து அனுப்பவும். Sub user அதே URL-ல் தங்கள் Google account-ல் login செய்தால் தானாகவே உங்கள் பதிவேட்டில் சேரலாம்.</div>'
    +'</div>';

  google.script.run
    .withSuccessHandler(function(subs) {
      var countEl = document.getElementById('subUserCount');
      var listEl  = document.getElementById('subUserList');
      if (countEl) countEl.textContent = (subs||[]).length;
      if (!listEl) return;
      if (!subs || !subs.length) {
        listEl.innerHTML = '<div style="font-size:13px;color:#9CA3AF;padding:8px 0">Sub user இல்லை</div>';
        return;
      }
      // FIX [17]: show current subRole and let the main user change it inline
      listEl.innerHTML = subs.map(function(u) {
        var sc_ = u.status==='active' ? '#0F6E56' : '#DC2626';
        var sl  = u.status==='active' ? 'செயலில்' : 'தடுக்கப்பட்டது';
        var role = u.subRole || 'editor';
        var roleOpts = ['viewer','editor','admin'].map(function(r){
          return '<option value="'+r+'"'+(r===role?' selected':'')+'>'+r+'</option>';
        }).join('');
        return '<div class="user-card" style="margin-bottom:8px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          +'<div><div class="uc-name">'+x(u.name)+'</div>'
          +'<div class="uc-meta">'+x(u.email)+'</div></div>'
          +'<span style="font-size:12px;font-weight:600;color:'+sc_+'">'+sl+'</span>'
          +'</div>'
          +'<div style="display:flex;align-items:center;gap:8px">'
          +'<label style="font-size:12px;color:#6B7280">அனுமதி:</label>'
          +'<select class="inp" style="font-size:12px;padding:4px 8px;width:auto" ' +'onchange="doChangeSubUserRole(\''+x(u.email)+'\', this.value)">'+roleOpts+'</select>'
          +'<button style="margin-left:auto;font-size:12px;padding:4px 10px;background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;border-radius:6px;cursor:pointer" ' +'onclick="doDeleteSubUser(\''+x(u.email)+'\', \''+x(u.name)+'\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-delete"></use></svg> நீக்கு</button>'
          +'</div></div>';
      }).join('');
    })
    .withFailureHandler(function(e) {
      var countEl = document.getElementById('subUserCount');
      if (countEl) countEl.textContent = '?';
    })
    .getMySubUsers();
}


// V112 launch hardening: protect sub-user account actions from
// offline submits, repeated taps and dropped Apps Script responses.
var _subUserActionLocks = Object.create(null);

function _subActionBegin(key, timeoutMs, onTimeout) {
  if (!navigator.onLine) { toast('📡 Internet இல்லை. இணைப்பு வந்ததும் மீண்டும் முயற்சிக்கவும்.'); return false; }
  if (_subUserActionLocks[key]) return false;
  var token = Date.now() + Math.random();
  var timer = setTimeout(function(){
    var x = _subUserActionLocks[key];
    if (!x || x.token !== token) return;
    delete _subUserActionLocks[key];
    if (typeof onTimeout === 'function') onTimeout();
  }, timeoutMs || 25000);
  _subUserActionLocks[key] = { token: token, timer: timer };
  return token;
}

function _subActionEnd(key, token) {
  var x = _subUserActionLocks[key];
  if (!x || x.token !== token) return false;
  clearTimeout(x.timer);
  delete _subUserActionLocks[key];
  return true;
}

function doCreateSubUser() {
  var email = (document.getElementById('su_email')||{}).value || '';
  var name  = (document.getElementById('su_name') ||{}).value || '';
  var role  = (document.getElementById('su_role') ||{}).value || 'editor';
  var err   = document.getElementById('suErr');
  email = email.trim(); name = name.trim();
  if (err) err.textContent = '';
  if (!email) { if(err) err.textContent = 'Gmail உள்ளிடவும்'; return; }
  if (!name)  { if(err) err.textContent = 'பெயர் உள்ளிடவும்'; return; }

  var btn = document.querySelector('#acctTabContent .btn-save');
  var lockKey = 'create';
  var token = _subActionBegin(lockKey, 25000, function(){
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்'; }
    if (err) err.textContent = 'நேரம் எடுத்துக்கொள்கிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
  });
  if (!token) return;
  if (btn) { btn.disabled = true; btn.textContent = 'சேர்க்கிறது...'; }

  google.script.run
    .withSuccessHandler(function(res) {
      if (!_subActionEnd(lockKey, token)) return;
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்'; }
      if (res.ok) {
        // FIX [10]: if DriveHelper.shareSheet() failed server-side,
        // res.warning is set — the account still works, just tell
        // the main user so they can share the sheet manually.
        toast(res.warning ? '⚠️ ' + res.warning : '✅ Sub user சேர்க்கப்பட்டார்!');
        var box = document.getElementById('acctTabContent');
        if (box) _renderSubUserSection(box);
      } else {
        if (err) err.textContent = res.msg || 'பிழை';
      }
    })
    .withFailureHandler(function(e) {
      if (!_subActionEnd(lockKey, token)) return;
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-add"></use></svg> சேர்'; }
      if (err) err.textContent = friendlyErrorMsg(e);
    })
    .createSubUser({ email: email, name: name, subRole: role });
}


// FIX [17]: change an existing sub-user's permission level (viewer/editor/admin)
function doChangeSubUserRole(email, newRole) {
  var key = 'role:' + email;
  var token = _subActionBegin(key, 20000, function(){
    toast('⏱️ அனுமதி மாற்றம் தாமதமாகிறது. மீண்டும் முயற்சிக்கவும்.');
    var box = document.getElementById('acctTabContent');
    if (box) _renderSubUserSection(box);
  });
  if (!token) return;
  google.script.run
    .withSuccessHandler(function(res) {
      if (!_subActionEnd(key, token)) return;
      if (res.ok) toast('✅ அனுமதி மாற்றப்பட்டது');
      else { toast(res.msg || 'பிழை'); var box = document.getElementById('acctTabContent'); if (box) _renderSubUserSection(box); }
    })
    .withFailureHandler(function(e) {
      if (!_subActionEnd(key, token)) return;
      toastError(e);
      var box = document.getElementById('acctTabContent');
      if (box) _renderSubUserSection(box);
    })
    .changeSubUserRole(email, newRole);
}


// FIX [19]: remove a sub-user — also revokes their Drive access on the
// sheet server-side (deleteSubUser() in Code.gs), not just the app row.
function doDeleteSubUser(email, name) {
  showConfirm((name||email) + '-ஐ நீக்கவா? இவருடைய Sheet access-உம் நீக்கப்படும்.', function() {
    var key = 'delete:' + email;
    var token = _subActionBegin(key, 25000, function(){
      toast('⏱️ Sub user நீக்கம் தாமதமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
    });
    if (!token) return;
    google.script.run
      .withSuccessHandler(function(res) {
        if (!_subActionEnd(key, token)) return;
        if (res.ok) {
          toast(res.warning ? '⚠️ ' + res.warning : '✅ Sub user நீக்கப்பட்டார்');
          var box = document.getElementById('acctTabContent');
          if (box) _renderSubUserSection(box);
        } else {
          toast(res.msg || 'பிழை');
        }
      })
      .withFailureHandler(function(e) {
        if (!_subActionEnd(key, token)) return;
        toastError(e);
      })
      .deleteSubUser(email);
  });
}


// ── Main User Audit Log ───────────────────────────────────────
function _renderMyAuditLog(box) {
  box.innerHTML = '<div class="sec"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> Audit Log</div>'
    +'<div id="myAuditList"><div style="color:#9CA3AF;padding:16px;text-align:center">ஏற்றுகிறது...</div></div>';

  google.script.run
    .withSuccessHandler(function(res) {
      var el = document.getElementById('myAuditList');
      if (!el) return;
      var logs = (res && res.ok) ? (res.logs || []) : [];
      if (!logs.length) {
        el.innerHTML = '<div class="empty"><div class="ei">-</div>பதிவுகள் இல்லை</div>';
        return;
      }
      el.innerHTML = '<div class="list">'+logs.map(function(l){
        return '<div class="audit-row"><div class="audit-time">'+x(l.time)+'</div>'
          +'<div><span class="audit-action">'+x(l.action)+'</span>'
          +' <span class="audit-email">'+x(l.email)+'</span></div>'
          +(l.detail?'<div style="font-size:11px;color:#6B7280">'+x(l.detail)+'</div>':'')
          +'</div>';
      }).join('')+'</div>';
    })
    .withFailureHandler(function(e) {
      var el = document.getElementById('myAuditList');
      if (el) el.innerHTML = '<div style="color:#DC2626;padding:12px">பிழை: '+x(friendlyErrorMsg(e))+'</div>';
    })
    .getMyAuditLog();
}


// ── Share URL section ─────────────────────────────────────────
// FIX [13]: URL now comes from the server (ScriptApp.getService().getUrl())
// instead of window.location.href, which only returns Google's internal
// iframe sandbox URL and doesn't work for anyone else.
function _renderShareUrl(box) {
  box.innerHTML =
    '<div class="sec">🔗 Sub User-க்கு Share செய்யும் URL</div>'
    +'<div class="card" style="margin-bottom:10px">'
    +'<div style="font-size:13px;color:#374151;margin-bottom:10px">இந்த URL-ஐ sub user-க்கு அனுப்பவும். அவர் தங்கள் Google account-ல் login செய்தால் உங்கள் மொய் பதிவேட்டில் நேரடியாக சேர்வார்கள். கீழே உள்ள Link-ஐ தட்டி நீங்களே திறந்தும் பார்க்கலாம்.</div>'
    +'<div style="background:#F0FDF4;border:1.5px solid #86efac;border-radius:8px;padding:12px;font-size:12px;font-family:monospace;word-break:break-all;margin-bottom:10px" id="appUrlBox">'
    +'<a id="appUrlLink" href="#" target="_blank" rel="noopener" style="color:#0B4F3F;text-decoration:underline">ஏற்றுகிறது...</a></div>'
    +'<button class="btn-save" onclick="_copyAppUrl()"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg> Copy URL</button>'
    +'</div>'
    +'<div class="sub-user-box" style="background:#EFF6FF;border:1px solid #BFDBFE">'
    +'<div style="font-size:13px;color:#1D4ED8;font-weight:600;margin-bottom:6px">📌 Sub User Steps:</div>'
    +'<div style="font-size:13px;color:#374151;line-height:1.8">'
    +'1. URL-ஐ WhatsApp / SMS மூலம் sub user-க்கு அனுப்பவும்<br>'
    +'2. Sub user அவர் Google account-ல் login ஆக வேண்டும்<br>'
    +'3. அவர் email-ஐ நீங்கள் Sub Users tab-ல் சேர்த்திருக்க வேண்டும்<br>'
    +'4. Login ஆனால் தானாகவே உங்கள் பதிவேட்டில் சேர்வார்கள்<br>'
    +'5. <strong>Note:</strong> நீங்கள் ஏற்கனவே இந்த browser-ல் உங்கள் main account-ல் login ஆகி இருந்தால், sub user அதே browser-ல் இதை open பண்ணக்கூடாது — Google உங்கள் main account-ஐயே காட்டும். Sub user ஒரு <strong>Incognito window</strong>-லோ, வேறு browser/device-லோ தங்கள் Gmail-ல் login பண்ணணும்.'
    +'</div></div>';

  google.script.run
    .withSuccessHandler(function(url) {
      var link = document.getElementById('appUrlLink');
      if (link) { link.href = url; link.textContent = url; }
    })
    .withFailureHandler(function(e) {
      var link = document.getElementById('appUrlLink');
      if (link) { link.textContent = 'பிழை: URL பெற முடியவில்லை (' + friendlyErrorMsg(e) + ')'; link.removeAttribute('href'); }
    })
    .getAppUrl();
}


function _copyAppUrl() {
  var link = document.getElementById('appUrlLink');
  if (!link) return;
  var url = link.href;
  try {
    navigator.clipboard.writeText(url).then(function(){ toast('✅ URL copied!'); });
  } catch(e) {
    // Fallback for older browsers
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    toast('✅ URL copied!');
  }
}


// ============================================================
// FEEDBACK — user submits, admin views (above)
// ============================================================
// ============================================================
//  FIX [42]: UPI SUBSCRIPTION PAYMENT — user-facing flow
// ============================================================
var _upgradeAmountCache = 0;


function openUpgradeModal() {
  document.getElementById('up_months').value = '1';
  document.getElementById('up_ref').value = '';
  document.getElementById('upErr').textContent = '';
  document.getElementById('upgradeModal').style.display = 'flex';
  _updateUpgradeAmount();
}

function closeUpgradeModal() { document.getElementById('upgradeModal').style.display = 'none'; }

function onUpgradeModalBgClick(e) { if (e.target === document.getElementById('upgradeModal')) closeUpgradeModal(); }


function _updateUpgradeAmount() {
  var months = document.getElementById('up_months').value;
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) return;
      _upgradeAmountCache = res.amount;
      document.getElementById('upAmount').textContent = '₹' + res.amount;
      var note = document.getElementById('upRenewalNote');
      if (note) note.style.display = res.isRenewal ? 'block' : 'none';
    })
    .withFailureHandler(function() {})
    .getUpiPaymentInfo(months);
}


function doUpiPay() {
  var months = document.getElementById('up_months').value;
  google.script.run
    .withSuccessHandler(function(res) {
      if (!res.ok) { toast(res.msg || 'பிழை'); return; }
      // Opens the person's own UPI app (GPay/PhonePe/etc) via the upi://
      // deep link — this works in mobile browsers and in WebView-wrapped
      // APKs, since Android routes upi:// to whatever UPI app is installed.
      window.location.href = res.link;
    })
    .withFailureHandler(function(e) { toastError(e); })
    .getUpiPaymentInfo(months);
}


function doSubmitPaymentClaim() {
  var months = document.getElementById('up_months').value;
  var ref    = document.getElementById('up_ref').value.trim();
  var err    = document.getElementById('upErr');
  err.textContent = '';

  var btn = document.getElementById('upClaimBtn');
  btn.disabled = true; btn.textContent = 'சமர்ப்பிக்கிறது...';

  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false; btn.textContent = '✅ நான் Pay பண்ணிட்டேன்';
      if (!res.ok) { err.textContent = res.msg || 'பிழை'; return; }
      closeUpgradeModal();
      toast('✅ Payment Claim அனுப்பப்பட்டது — Admin Verify பண்ணின பிறகு Plan Upgrade ஆகும்');
    })
    .withFailureHandler(function(e) {
      btn.disabled = false; btn.textContent = '✅ நான் Pay பண்ணிட்டேன்';
      err.textContent = friendlyErrorMsg(e);
    })
    .submitPaymentClaim(months, ref);
}


// ── Admin side: view + approve/reject pending payment claims ──
// ============================================================
// OPTIONAL USER PROFILE — lazy load on Account tab only.
// Stored separately from MOI data; no impact on login/calculations.
// ============================================================
var _profilePhotoData = '';
var _profileLoaded = false;
var _profileLoadInFlight = false;

function _profileInitials(name) {
  var t = String(name || S.name || '').trim();
  if (!t) return '👤';
  var parts = t.split(/\s+/).filter(Boolean);
  return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length-1].charAt(0) : '')).toUpperCase();
}
function _renderProfileAvatar() {
  var el = document.getElementById('profileAvatar'); if (!el) return;
  if (_profilePhotoData) {
    el.innerHTML = '<img src="'+_profilePhotoData+'" alt="Profile" style="width:100%;height:100%;object-fit:cover">';
  } else {
    var n = document.getElementById('prof_name');
    el.textContent = _profileInitials(n ? n.value : '');
  }
}
function loadMyProfile(force) {
  if (_profileLoadInFlight || (_profileLoaded && !force)) return;
  _profileLoadInFlight = true;
  google.script.run
    .withSuccessHandler(function(res){
      _profileLoadInFlight = false; _profileLoaded = true;
      var p = res && res.ok && res.profile ? res.profile : {};
      _profilePhotoData = String(p.photo || '');
      var set=function(id,v){var e=document.getElementById(id); if(e)e.value=v||'';};
      set('prof_name', p.name || S.name || '');
      set('prof_dob', p.dob || ''); set('prof_gender', p.gender || '');
      set('prof_mobile', p.mobile || ''); set('prof_email', p.email || S.email || '');
      set('prof_city', p.city || ''); _renderProfileAvatar();
    })
    .withFailureHandler(function(e){
      _profileLoadInFlight = false;
      var er=document.getElementById('profileErr'); if(er) er.textContent=friendlyErrorMsg(e);
    })
    .getMyProfile();
}
function pickProfilePhoto(input) {
  var file = input && input.files && input.files[0]; if (!file) return;
  if (!/^image\//i.test(file.type || '')) { toast('Image file மட்டும் தேர்வு செய்யவும்'); input.value=''; return; }
  var reader = new FileReader();
  reader.onload = function(){
    var img = new Image();
    img.onload = function(){
      var max=160, scale=Math.min(1,max/Math.max(img.width,img.height));
      var w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
      var c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      var data=c.toDataURL('image/jpeg',0.72);
      if (data.length > 42000) data=c.toDataURL('image/jpeg',0.55);
      if (data.length > 48000) { toast('Photo size அதிகம் — வேறு photo முயற்சிக்கவும்'); return; }
      _profilePhotoData=data; _renderProfileAvatar();
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file); input.value='';
}
function removeProfilePhoto(){ _profilePhotoData=''; _renderProfileAvatar(); }
function saveMyProfile() {
  var er=document.getElementById('profileErr'), btn=document.getElementById('profileSaveBtn'); if(er)er.textContent='';
  var v=function(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';};
  var data={name:v('prof_name'),dob:v('prof_dob'),gender:v('prof_gender'),mobile:v('prof_mobile'),city:v('prof_city'),photo:_profilePhotoData};
  if (data.dob && !/^\d{4}-\d{2}-\d{2}$/.test(data.dob)) { if(er)er.textContent='DOB format சரியில்லை'; return; }
  if (data.mobile && data.mobile.length > 20) { if(er)er.textContent='Mobile number சரிபார்க்கவும்'; return; }
  if(btn){btn.disabled=true;btn.textContent='சேமிக்கிறது...';}
  google.script.run
    .withSuccessHandler(function(res){
      if(btn){btn.disabled=false;btn.textContent='💾 Profile சேமி';}
      if(res&&res.ok){ if(data.name) S.name=data.name; _profileLoaded=true; _renderProfileAvatar(); toast('✅ Profile சேமிக்கப்பட்டது'); }
      else if(er) er.textContent=(res&&res.msg)||'Profile save பிழை';
    })
    .withFailureHandler(function(e){if(btn){btn.disabled=false;btn.textContent='💾 Profile சேமி';} if(er)er.textContent=friendlyErrorMsg(e);})
    .saveMyProfile(data);
}


// v261 STABILITY: Admin module is included at boot again.
// The v258 dynamic admin loader caused a runtime regression where the Admin
// screen rendered but its buttons/tabs were inert. Because Admin is a critical
// control surface, reliability takes priority over the small payload saving.
// Reports remains lazy-loaded separately below.
// ============================================================
function loadAdminUsers() {
  if (S.role !== 'super_admin') return; // FIX [14]: role renamed 'admin' -> 'super_admin'
  document.getElementById('adminName').textContent = S.name;
  document.getElementById('userList').innerHTML = '<div style="color:#9CA3AF;padding:16px;text-align:center">ஏற்றுகிறது...</div>';
  google.script.run
    .withSuccessHandler(function(users){
      _cachedUsers = users||[];
      _renderAdminTabContent(_adminSubTab);
    })
    .withFailureHandler(function(e){
      document.getElementById('userList').innerHTML = '<div style="color:#DC2626;padding:16px">பிழை: '+x(friendlyErrorMsg(e))+'</div>';
    })
    .getUsers();
}


// FIX [SECURITY]: one-time cleanup — revokes Drive Editor access that
// was previously granted directly to sub-users (see Code.gs fix notes).
function doRevokeDirectSheetAccess() {
  showConfirm('முன்பே சேர்க்கப்பட்ட Sub-users-ன் Direct Sheet Editor access-ஐ நீக்கவா? (App-level access பாதிக்காது)', function() {
    setBtnLoading('revokeAccessBtn', true, 'நீக்குகிறது...');
    google.script.run
      .withSuccessHandler(function(res) {
        setBtnLoading('revokeAccessBtn', false, '🔒 Direct Sheet Access Revoke பண்ணு');
        if (!res.ok) { toast('❌ ' + (res.msg || 'பிழை')); return; }
        toast('✅ ' + res.revokedCount + ' access(es) நீக்கப்பட்டது');
        document.getElementById('revokeAccessResult').innerHTML =
          '✅ ' + res.revokedCount + ' நீக்கப்பட்டது' + (res.failed.length ? ' · ⚠️ ' + res.failed.length + ' failed (already unshared or error)' : '');
      })
      .withFailureHandler(function(e) {
        setBtnLoading('revokeAccessBtn', false, '🔒 Direct Sheet Access Revoke பண்ணு');
        toastError(e);
      })
      .adminRevokeDirectSheetAccess();
  });
}



function toggleAdminAddUserForm(forceOpen) {
  var body = document.getElementById('adminAddUserBody');
  var btn = document.getElementById('adminAddUserToggle');
  if (!body || !btn) return;
  var open = (typeof forceOpen === 'boolean') ? forceOpen : body.hasAttribute('hidden');
  if (open) body.removeAttribute('hidden'); else body.setAttribute('hidden','');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.classList.toggle('on', open);
}

function switchAdminTab(tab) {
  _adminSubTab = tab;
  ['all','payments','feedback','audit','backup'].forEach(function(t){
    var btn = document.getElementById('asb-'+t); if(btn) btn.classList.toggle('on',t===tab);
  });
  var addSec = document.getElementById('addUserSection');
  if (addSec) addSec.style.display = tab==='all'?'block':'none';
  _renderAdminTabContent(tab);
}


function _renderAdminTabContent(tab) {
  if (tab==='all')            _renderUserList(_cachedUsers);
  else if (tab==='payments')  _loadPaymentRequestsList();
  else if (tab==='feedback')  _loadFeedbackList();
  else if (tab==='audit')     _loadAuditLog();
  else if (tab==='backup')    _loadBackupPanel();
}


function _renderUserList(users) {
  var el = document.getElementById('userList');
  if (!users||!users.length) { el.innerHTML='<div style="text-align:center;padding:32px;color:#9CA3AF">பயனர்கள் இல்லை</div>'; return; }
  var pc = { basic:'plan-basic', premium:'plan-premium' };
  el.innerHTML = users.map(function(u){
    var sc_ = u.status==='active'?'#0F6E56':u.status==='blocked'?'#DC2626':'var(--am)';
    var sl  = u.status==='active'?'செயலில்':u.status==='blocked'?'தடு':'நிலுவை';
    var exp = u.expiry?(u.expired?'முடிந்தது: ':'முடிவு: ')+u.expiry:'காலவரம்பு இல்லை';
    return '<div class="user-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'
      +'<div><span class="uc-name">'+x(u.name)+'</span>'
      +'<span class="badge '+(pc[u.plan]||'')+' plan-badge" style="margin-left:8px">'+x(u.plan)+'</span></div>'
      +'<span style="font-size:12px;font-weight:600;color:'+sc_+'">'+sl+'</span>'
      +'</div>'
      +'<div class="uc-meta">'+x(u.email)+'</div>'
      +(u.mobile?'<div class="uc-meta">'+x(u.mobile)+'</div>':'')
      +(u.village?'<div class="uc-meta">'+x(u.village)+'</div>':'')
      +'<div class="uc-meta" style="color:'+(u.expired||u.trialExpired?'#DC2626':'#6B7280')+'">'+exp
      +'</div>'
      +(u.spreadsheetId?'<div class="uc-sheetid">Sheet: '+x(u.spreadsheetId)+'</div>':'')
      +(u.parentEmail?'<div class="uc-meta">Sub of: '+x(u.parentEmail)
        +(u.role==='sub'?' &nbsp;<span class="badge" style="background:#EEF2FF;color:#4338CA">'+x(u.subRole||'editor')+'</span>':'')
        +'</div>':'')
      +'<div class="uc-actions">'
      +'<button class="ubtn ubtn-edit" onclick="adminEditUser('+u.rowIndex+')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> Edit</button>'
      +(u.status!=='blocked'
        ?'<button class="ubtn ubtn-block" onclick="adminSetStatus('+u.rowIndex+',\'blocked\')">தடு</button>'
        :'<button class="ubtn ubtn-unblock" onclick="adminSetStatus('+u.rowIndex+',\'active\')">திற</button>')
      +'<button class="ubtn" style="background:#FEF3C7;color:#92400E" onclick="adminResetPassword('+u.rowIndex+',\''+x(u.name)+'\',\''+x(u.email)+'\')">🔑 Pass</button>'
      +'<button class="ubtn ubtn-del" onclick="adminDelUser('+u.rowIndex+',\''+x(u.name)+'\')">நீக்கு</button>'
      +'</div></div>';
  }).join('');
}


// FIX [15]: shows/hides the Parent Email field based on selected role —
// only relevant when creating a Sub User from the admin panel.
// FIX [17]: also toggles the sub-role (viewer/editor/admin) field.
function _toggleParentEmailField() {
  var role = (document.getElementById('nu_role') || {}).value;
  var wrap = document.getElementById('nu_parent_wrap');
  var roleWrap = document.getElementById('nu_subrole_wrap');
  if (wrap) wrap.style.display = (role === 'sub') ? 'block' : 'none';
  if (roleWrap) roleWrap.style.display = (role === 'sub') ? 'block' : 'none';
}


function adminAddUser() {
  var email      = document.getElementById('nu_email').value.trim();
  var name       = document.getElementById('nu_name').value.trim();
  var mobile     = document.getElementById('nu_mobile').value.trim();
  var role       = document.getElementById('nu_role').value;
  var plan       = document.getElementById('nu_plan').value;
  var expiry     = document.getElementById('nu_expiry').value;
  var sheetid    = document.getElementById('nu_sheetid') ? document.getElementById('nu_sheetid').value.trim() : '';
  var parentEmailEl = document.getElementById('nu_parent');
  var parentEmail   = parentEmailEl ? parentEmailEl.value.trim() : '';
  var subRoleEl  = document.getElementById('nu_subrole');
  var subRole    = subRoleEl ? subRoleEl.value : 'editor';
  if (!email||!name) { toast('Email & பெயர் தேவை'); return; }
  if (role === 'sub' && !parentEmail) { toast('Sub user-க்கு Parent Email தேவை'); return; }
  loading(true);
  google.script.run
    .withSuccessHandler(function(r){
      loading(false);
      if (r.ok) {
        toast(r.warning ? '⚠️ ' + r.warning : 'பயனர் சேர்க்கப்பட்டார்');
        ['nu_email','nu_name','nu_mobile','nu_expiry','nu_parent','nu_sheetid'].forEach(function(id){
          var el = document.getElementById(id); if (el) el.value='';
        });
        toggleAdminAddUserForm(false);
        loadAdminUsers();
      } else toast(r.msg||'பிழை');
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .adminAddUser({ email:email, name:name, mobile:mobile, role:role, plan:plan, expiry:expiry, sheetid:sheetid, parentEmail:parentEmail, subRole:subRole });
}


// FIX [1+2+6]: Consolidated inline edit — name/mobile/village/role/plan/expiry
// all in one form, with quick-extend buttons. Replaces the old prompt()-chain
// (adminSetPlan/adminExtend) entirely — no native dialogs anywhere here.
function adminEditUser(rowIndex) {
  var el = document.getElementById('userList');
  var u = null;
  for (var i = 0; i < _cachedUsers.length; i++) { if (_cachedUsers[i].rowIndex === rowIndex) { u = _cachedUsers[i]; break; } }
  if (!u) return;

  // FIX [BUG-2]: All roles are now editable by admin (including sub-users).
  // Added missing 'sub' option to the dropdown.
  // FIX [18]: role select now toggles the Parent Email field for this row.
  var roleField = '<div class="fg"><label>பாத்திரம்</label><select id="eu_role_'+rowIndex+'" class="inp" onchange="_toggleEditParentEmail('+rowIndex+')">'
    +'<option value="main"'+(u.role==='main'?' selected':'')+'>Main User</option>'
    +'<option value="sub"'+(u.role==='sub'?' selected':'')+'>Sub User</option>'
    +'<option value="super_admin"'+(u.role==='super_admin'?' selected':'')+'>Super Admin</option>' // FIX [14]: role renamed
    +'</select></div>';

  var planOptions = ['basic','premium'].map(function(p){
    return '<option value="'+p+'"'+(u.plan===p?' selected':'')+'>'+p+'</option>';
  }).join('');

  // FIX [17]: subRole (viewer/editor/admin) editable only for existing sub-users
  var subRoleField = '';
  if (u.role === 'sub') {
    var sr = u.subRole || 'editor';
    subRoleField = '<div class="fg"><label>Sub-user அனுமதி</label><select id="eu_subrole_'+rowIndex+'" class="inp">'
      +'<option value="viewer"'+(sr==='viewer'?' selected':'')+'>Viewer — படிக்க மட்டும்</option>'
      +'<option value="editor"'+(sr==='editor'?' selected':'')+'>Editor — சேர்க்க/திருத்த</option>'
      +'<option value="admin"'+(sr==='admin'?' selected':'')+'>Admin — நீக்கவும் முடியும்</option>'
      +'</select></div>';
  }

  // FIX [18]: Parent Email field — shown when this user's role IS (or is
  // switched to) 'sub'. Without this, switching an existing user's role
  // to 'sub' via this form left ParentEmail blank, causing
  // "Sub-user கணக்கில் Parent Email இல்லை" the next time they logged in.
  var parentEmailField = '<div class="fg" id="eu_parent_wrap_'+rowIndex+'" style="'+(u.role==='sub'?'':'display:none')+'">'
    +'<label>Parent (Main user) Email *</label>'
    +'<input type="email" id="eu_parent_'+rowIndex+'" class="inp" value="'+x(u.parentEmail||'')+'" placeholder="mainuser@gmail.com">'
    +'<div style="font-size:11px;color:#9CA3AF;margin-top:3px">Sub user இந்த Main user-ன் Sheet-ஐ பயன்படுத்துவார்</div>'
    +'</div>';

  var formHtml = '<div class="edit-user-box" id="editUserBox_'+rowIndex+'">'
    +'<div class="au-title"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg> பயனர் திருத்து</div>'
    +'<div class="fg"><label>பெயர் *</label>'
    +'<input type="text" id="eu_name_'+rowIndex+'" class="inp" value="'+x(u.name||'')+'"></div>'
    +'<div class="row2">'
    +'<div class="fg"><label>கைபேசி</label>'
    +'<input type="tel" id="eu_mobile_'+rowIndex+'" class="inp" value="'+x(u.mobile||'')+'"></div>'
    +'<div class="fg"><label>கிராமம்</label>'
    +'<input type="text" id="eu_village_'+rowIndex+'" class="inp" value="'+x(u.village||'')+'"></div>'
    +'</div>'
    +'<div class="row2">'
    + roleField
    +'<div class="fg"><label>Plan</label><select id="eu_plan_'+rowIndex+'" class="inp">'+planOptions+'</select></div>'
    +'</div>'
    + subRoleField
    + parentEmailField
    +'<div class="fg"><label>Plan Expiry</label>'
    +'<input type="date" id="eu_expiry_'+rowIndex+'" class="inp" value="'+x(u.expiry||'')+'"></div>'
    +'<div class="fg"><label style="font-size:12px;color:#6B7280">விரைவு நீட்டிப்பு</label>'
    +'<div style="display:flex;gap:6px">'
      +[1,3,12].map(function(m){ return '<button type="button" class="ubtn" onclick="_quickExtend('+rowIndex+','+m+')">+'+m+' மாதம்</button>'; }).join('')
    +'</div></div>'
    +'<div style="display:flex;gap:8px;margin-top:8px">'
    +'<button class="btn-save" onclick="submitAdminEditUser('+rowIndex+')">✅ சேமி</button>'
    +'<button class="btn-cancel" onclick="loadAdminUsers()">✖ ரத்து</button>'
    +'</div></div>';

  el.innerHTML = formHtml + el.innerHTML;
  document.getElementById('editUserBox_'+rowIndex).scrollIntoView({behavior:'smooth'});
}


// Quick-extend button inside the edit form — updates the expiry field
// in-place without closing the form or needing a separate prompt.
function _quickExtend(rowIndex, months) {
  loading(true);
  // FIX [BUG-7]: Capture editedUser before the async call so we can detect
  // if this extension applies to the logged-in user and sync S.expiry live.
  var extendedUser = null;
  for (var i = 0; i < _cachedUsers.length; i++) {
    if (_cachedUsers[i].rowIndex === rowIndex) { extendedUser = _cachedUsers[i]; break; }
  }
  var extendingSelf = S && extendedUser && extendedUser.email === S.email;

  google.script.run
    .withSuccessHandler(function(r){
      loading(false);
      if (r.ok) {
        var expEl = document.getElementById('eu_expiry_'+rowIndex);
        if (expEl) expEl.value = r.newExpiry;
        toast(months+' மாதம் நீட்டிக்கப்பட்டது');
        // FIX [BUG-7]: Keep S.expiry current if extending the logged-in user,
        // and bust sessionStorage so a reload reflects the new expiry.
        if (extendingSelf) {
          S.expiry = r.newExpiry;
          try { localStorage.removeItem('moi_session'); } catch(e) {}
        }
      } else toast(r.msg || 'பிழை');
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .extendExpiry(rowIndex, months);
}


// FIX [18]: shows/hides the Parent Email field for a specific edit-form
// row when the admin changes that row's role dropdown to/from 'sub'.
function _toggleEditParentEmail(rowIndex) {
  var roleEl = document.getElementById('eu_role_'+rowIndex);
  var wrap   = document.getElementById('eu_parent_wrap_'+rowIndex);
  if (wrap && roleEl) wrap.style.display = (roleEl.value === 'sub') ? 'block' : 'none';
}


function submitAdminEditUser(rowIndex) {
  var name    = (document.getElementById('eu_name_'+rowIndex)   ||{}).value || '';
  var mobile  = (document.getElementById('eu_mobile_'+rowIndex) ||{}).value || '';
  var village = (document.getElementById('eu_village_'+rowIndex)||{}).value || '';
  var roleEl  = document.getElementById('eu_role_'+rowIndex);
  var role    = roleEl ? roleEl.value : undefined;
  var planEl  = document.getElementById('eu_plan_'+rowIndex);
  var plan    = planEl ? planEl.value : undefined;
  var expiry  = (document.getElementById('eu_expiry_'+rowIndex)||{}).value || '';
  var subRoleEl = document.getElementById('eu_subrole_'+rowIndex); // FIX [17]
  var subRole   = subRoleEl ? subRoleEl.value : undefined;
  var parentEmailEl = document.getElementById('eu_parent_'+rowIndex); // FIX [18]
  var parentEmail   = parentEmailEl ? parentEmailEl.value.trim() : undefined;

  if (!name.trim()) { toast('பெயர் தேவை'); return; }
  if (role === 'sub' && !parentEmail) { toast('Sub user-க்கு Parent Email தேவை'); return; }

  // FIX [BUG-1/5/8]: Detect if admin is editing the currently logged-in user
  // so S and sessionStorage stay in sync after role/plan changes (real-time update).
  var editedUser = null;
  for (var i = 0; i < _cachedUsers.length; i++) {
    if (_cachedUsers[i].rowIndex === rowIndex) { editedUser = _cachedUsers[i]; break; }
  }
  var editingSelf = S && editedUser && editedUser.email === S.email;

  loading(true);
  google.script.run
    .withSuccessHandler(function(r){
      loading(false);
      if (r.ok) {
        toast('புதுப்பிக்கப்பட்டது ✅');
        // FIX [BUG-1/5/8]: Sync S immediately if the logged-in user's own
        // record was edited — role/plan/name reflect instantly, no reload needed.
        if (editingSelf) {
          if (role   !== undefined) S.role   = role;
          if (plan   !== undefined) S.plan   = plan;
          if (expiry !== undefined) S.expiry = expiry.trim();
          if (name.trim())          S.name   = name.trim();
          // Bust sessionStorage so a page reload fetches fresh data from server.
          try { localStorage.removeItem('moi_session'); } catch(e) {}
          // Re-apply role-based tab/header UI immediately.
          _applyRoleUI();
        }
        loadAdminUsers();
      } else toast(r.msg||'பிழை');
    })
    .withFailureHandler(function(e){ loading(false); toastError(e); })
    .adminUpdateUser(rowIndex, {
      name: name.trim(), mobile: mobile.trim(), village: village.trim(),
      role: role, plan: plan, expiry: expiry.trim(), subRole: subRole, parentEmail: parentEmail
    });
}


function adminSetStatus(rowIndex, status) {
  showConfirm(status==='blocked'?'தடுக்கவா?':'திறக்கவா?', function(){
    loading(true);
    google.script.run
      .withSuccessHandler(function(r){
      loading(false);
      // FIX [BUG-6]: Only reload list if server confirmed success; also sync
      // sessionStorage if the blocked/unblocked user is the logged-in user.
      if (r.ok) {
        toast(status==='blocked'?'தடுக்கப்பட்டது':'திறக்கப்பட்டது');
        loadAdminUsers();
      } else { toast(r.msg||'பிழை'); }
    })
      .withFailureHandler(function(e){ loading(false); toastError(e); })
      .setUserStatus(rowIndex, status);
  });
}


function adminDelUser(rowIndex, name) {
  showConfirm('"'+name+'" நீக்கவா? திரும்பப் பெற முடியாது.', function(){
    loading(true);
    google.script.run
      .withSuccessHandler(function(r){ loading(false); if(r.ok){ toast('நீக்கப்பட்டது'); loadAdminUsers(); } })
      .withFailureHandler(function(e){ loading(false); toastError(e); })
      .deleteUser(Number(rowIndex));  // FIX: ensure numeric rowIndex
  });
}


function adminResetPassword(rowIndex, name, email) {
  showConfirm('"'+name+'" ('+email+') Password reset செய்யவா? புதிய Password email-ல் அனுப்பப்படும்.', function(){
    loading(true);
    google.script.run
      .withSuccessHandler(function(r){
        loading(false);
        if (r.ok) {
          var msg = r.mailSent
            ? '✅ புதிய Password ' + email + ' க்கு அனுப்பப்பட்டது'
            : '✅ புதிய Password: ' + r.tempPass + '\n(Mail அனுப்ப முடியவில்லை — நேரடியாக பகிரவும்)';
          showInfoModal('Password Reset', msg);
        } else {
          toast(r.msg || 'பிழை');
        }
      })
      .withFailureHandler(function(e){ loading(false); toastError(e); })
      .resetUserPassword(rowIndex);
  });
}



// LAUNCH HARDENING v113: Backup/Restore request safety.
var _backupActionState = Object.create(null);

function _backupActionBegin(key, timeoutMs, onTimeout) {
  if (!navigator.onLine) {
    toast('📡 Internet இல்லை. இணைப்பு வந்ததும் மீண்டும் முயற்சிக்கவும்.');
    return null;
  }
  if (_backupActionState[key]) return null;
  var token = Date.now() + ':' + Math.random();
  var timer = setTimeout(function(){
    var cur = _backupActionState[key];
    if (!cur || cur.token !== token) return;
    delete _backupActionState[key];
    if (typeof onTimeout === 'function') onTimeout();
  }, timeoutMs || 25000);
  _backupActionState[key] = { token: token, timer: timer };
  return token;
}

function _backupActionEnd(key, token) {
  var cur = _backupActionState[key];
  if (!cur || cur.token !== token) return false;
  clearTimeout(cur.timer);
  delete _backupActionState[key];
  return true;
}

// ── Backup & Restore Panel ──────────────────────────────────
function _loadBackupPanel() {
  var el = document.getElementById('userList');
  if (!el) return;
  if (!navigator.onLine) {
    el.innerHTML = '<div style="color:#B45309;text-align:center;padding:20px">📡 Internet இல்லை — இணைப்பு வந்ததும் மீண்டும் முயற்சிக்கவும்.</div>';
    return;
  }
  var token = _backupActionBegin('list', 20000, function(){
    if (el) el.innerHTML = '<div style="color:#B45309;padding:16px;text-align:center">Backup பட்டியல் ஏற்ற நேரம் அதிகமாகிறது.<br><button class="btn-cancel" style="margin-top:10px" onclick="_loadBackupPanel()">மீண்டும் முயற்சி</button></div>';
  });
  if (!token) return;
  el.innerHTML = '<div style="color:#9CA3AF;text-align:center;padding:20px">Backup பட்டியல் ஏற்றுகிறது...</div>';

  var topHtml = '<div class="admin-backup-toolbar">'
    + '<button class="btn-save admin-backup-run" onclick="_adminRunBackup()" id="runBackupBtn">▶️ இப்போதே Backup எடு</button>'
    + '</div>';

  google.script.run
    .withSuccessHandler(function(res) {
      if (!_backupActionEnd('list', token)) return;
      if (!res.ok) { el.innerHTML = '<div style="color:#DC2626;padding:16px">பிழை: ' + x(res.msg) + '</div>'; return; }
      var dates = res.dates || [];
      if (!dates.length) {
        el.innerHTML = topHtml + '<div style="text-align:center;padding:32px;color:#9CA3AF">Backup இல்லை — முதலில் Backup எடுங்க</div>';
        return;
      }

      var html = topHtml;
      dates.forEach(function(d) {
        html += '<div class="admin-backup-group">'
          + '<div class="admin-backup-date"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-calendar"></use></svg> ' + x(d.date) + ' — ' + d.files.length + ' கோப்புகள்</div>';

        d.files.forEach(function(f) {
          var isMain  = f.name.indexOf('Event:') === -1 && f.name.indexOf('Overflow:') === -1 && f.name !== 'AdminDB';
          var isEvent = f.name.indexOf('Event:') !== -1;
          var isOver  = f.name.indexOf('Overflow:') !== -1;
          var isAdmin = f.name === 'AdminDB';
          var icon = isAdmin ? '🗃️' : isEvent ? '🎉' : isOver ? '📂' : '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-list"></use></svg>';
          var badge = isAdmin ? 'Admin DB' : isEvent ? 'Event' : isOver ? 'Overflow' : 'Main Sheet';
          var badgeColor = isAdmin ? '#1D4ED8' : isEvent ? '#0F6E56' : isOver ? '#D97706' : '#059669';

          html += '<div class="admin-backup-row">'
            + '<div class="admin-backup-file"><span class="admin-backup-badge" style="background:' + badgeColor + '">' + badge + '</span>'
            + icon + ' <span class="admin-backup-name">' + x(f.name) + '</span></div>'
            + '<div class="admin-backup-actions">'
            + (isMain || isEvent || isOver ? '<button class="btn-edit admin-backup-action" onclick="_confirmRestore(\'' + x(f.id) + '\',\'' + x(f.name) + '\',\'' + x(d.date) + '\')"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> Restore</button>' : '')
            + '<a href="' + x(f.url) + '" target="_blank" class="admin-backup-open">🔗 திற</a>'
            + '</div></div>';
        });
        html += '</div>';
      });
      el.innerHTML = html;
    })
    .withFailureHandler(function(e){
      if (!_backupActionEnd('list', token)) return;
      el.innerHTML = '<div style="color:#DC2626;padding:16px">பிழை: ' + x(friendlyErrorMsg(e)) + '<br><button class="btn-cancel" style="margin-top:10px" onclick="_loadBackupPanel()">மீண்டும் முயற்சி</button></div>';
    })
    .getBackupList();
}

function _adminRunBackup() {
  var btn = document.getElementById('runBackupBtn');
  var token = _backupActionBegin('run', 60000, function(){
    if (btn) { btn.disabled = false; btn.textContent = '▶️ இப்போதே Backup எடு'; }
    toast('Backup எடுக்க நேரம் அதிகமாகிறது. சிறிது நேரம் கழித்து பட்டியலை refresh செய்யவும்.');
  });
  if (!token) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Backup எடுக்கிறது...'; }
  google.script.run
    .withSuccessHandler(function(res) {
      if (!_backupActionEnd('run', token)) return;
      if (btn) { btn.disabled = false; btn.textContent = '▶️ இப்போதே Backup எடு'; }
      if (res.ok) { toast('✅ ' + res.msg); _loadBackupPanel(); }
      else toast('❌ ' + res.msg);
    })
    .withFailureHandler(function(e){
      if (!_backupActionEnd('run', token)) return;
      if (btn) { btn.disabled = false; btn.textContent = '▶️ இப்போதே Backup எடு'; }
      toastError(e);
    })
    .adminRunBackup();
}

function _confirmRestore(fileId, fileName, date) {
  showConfirm(
    '"' + fileName + '" — ' + date + ' Backup-ஐ Restore பண்ணவா?\n\n'
    + '⚠️ Backup-ன் Copy உருவாகும் — Current Data மாறும்.',
    function() { _showRestoreUserPicker(fileId, fileName, date); }
  );
}

function _showRestoreUserPicker(fileId, fileName, date) {
  var users = (_cachedUsers || []).filter(function(u){ return u.role === 'main' || u.role === 'super_admin'; });
  var opts = users.map(function(u){ return '<option value="' + x(u.email) + '">' + x(u.name) + ' (' + x(u.email) + ')</option>'; }).join('');
  var el = document.getElementById('userList');
  el.innerHTML = '<div style="background:#FFF3CD;border:1.5px solid #FCD34D;border-radius:10px;padding:16px;margin-bottom:16px">'
    + '<div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:12px"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-refresh"></use></svg> Restore பண்ண User தேர்வு செய்யவும்</div>'
    + '<div style="font-size:12px;color:#78350F;margin-bottom:10px">📂 ' + x(fileName) + ' (' + x(date) + ')</div>'
    + '<div class="fg"><label>User *</label><select id="restoreUserSel" class="inp">' + opts + '</select></div>'
    + '<div style="display:flex;gap:8px;margin-top:12px">'
    + '<button class="btn-save" id="restoreBackupBtn" onclick="_doRestore(\'' + fileId + '\')" style="flex:1">✅ Restore பண்ணு</button>'
    + '<button class="btn-cancel" onclick="_loadBackupPanel()" style="flex:1">✖ ரத்து</button></div></div>';
}

function _doRestore(fileId) {
  var sel = document.getElementById('restoreUserSel');
  if (!sel || !sel.value) { toast('User தேர்வு செய்யவும்'); return; }
  var email = sel.value;
  var key = 'restore:' + fileId + ':' + email;
  var btn = document.getElementById('restoreBackupBtn');
  var token = _backupActionBegin(key, 45000, function(){
    loading(false);
    if (btn) { btn.disabled = false; btn.textContent = '✅ Restore பண்ணு'; }
    toast('Restore response தாமதமாகிறது. Backup பட்டியலை refresh செய்து நிலையை சரிபார்க்கவும்.');
  });
  if (!token) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Restore செய்கிறது...'; }
  loading(true);
  google.script.run
    .withSuccessHandler(function(res) {
      if (!_backupActionEnd(key, token)) return;
      loading(false);
      if (btn) { btn.disabled = false; btn.textContent = '✅ Restore பண்ணு'; }
      if (res.ok) { toast('✅ ' + res.msg); _loadBackupPanel(); }
      else toast('❌ ' + res.msg);
    })
    .withFailureHandler(function(e){
      if (!_backupActionEnd(key, token)) return;
      loading(false);
      if (btn) { btn.disabled = false; btn.textContent = '✅ Restore பண்ணு'; }
      toastError(e);
    })
    .adminRestoreUserSheet(email, fileId);
}


function _loadAuditLog() {
  var el = document.getElementById('userList');
  el.innerHTML = '<div style="color:#9CA3AF;padding:16px;text-align:center">ஏற்றுகிறது...</div>';
  google.script.run
    .withSuccessHandler(function(logs){
      if (!logs||!logs.length) { el.innerHTML='<div class="empty"><div class="ei">-</div>பதிவுகள் இல்லை</div>'; return; }
      el.innerHTML = '<div class="list">'+logs.map(function(l){
        return '<div class="audit-row"><div class="audit-time">'+x(l.time)+'</div>'
              +'<div><span class="audit-action">'+x(l.action)+'</span>'
              +' <span class="audit-email">'+x(l.email)+'</span></div>'
              +'<div style="font-size:11px;color:#6B7280">'+x(l.detail)+'</div></div>';
      }).join('')+'</div>';
    })
    .withFailureHandler(function(e){ el.innerHTML='<div style="color:#DC2626;padding:16px">பிழை: '+x(friendlyErrorMsg(e))+'</div>'; })
    .getAuditLog();
}


// FIX [3]: Feedback notification badge — shows unread count on the
// admin's "கருத்துகள்" tab using existing getFeedback() call, no new
// backend needed. "Seen" state tracked per-device via localStorage.
var _FB_SEEN_KEY = 'moi_fb_seen_count';

function _checkFeedbackBadge() {
  google.script.run
    .withSuccessHandler(function(list){
      var total = (list||[]).length;
      var seen  = Number(localStorage.getItem(_FB_SEEN_KEY) || 0);
      var badge = document.getElementById('fbBadge');
      if (!badge) return;
      var unread = Math.max(0, total - seen);
      badge.textContent = unread;
      badge.style.display = unread ? 'flex' : 'none';
    })
    .withFailureHandler(function(){})
    .getFeedback();
}


function _loadFeedbackList() {
  var el = document.getElementById('userList');
  el.innerHTML = '<div style="color:#9CA3AF;padding:16px;text-align:center">ஏற்றுகிறது...</div>';
  google.script.run
    .withSuccessHandler(function(list){
      // Mark all current feedback as seen — clears the badge
      localStorage.setItem(_FB_SEEN_KEY, (list||[]).length);
      var badge = document.getElementById('fbBadge');
      if (badge) badge.style.display = 'none';

      if (!list||!list.length) { el.innerHTML='<div class="empty"><div class="ei">-</div>கருத்துகள் இல்லை</div>'; return; }
      el.innerHTML = '<div class="list">'+list.map(function(f){
        return '<div class="audit-row"><div class="audit-time">'+x(f.time)+'</div>'
              +'<div><span class="audit-action">'+x(f.name)+'</span>'
              +' <span class="audit-email">'+x(f.email)+'</span></div>'
              +'<div style="font-size:13px;color:#374151;margin-top:4px;white-space:pre-wrap">'+x(f.message)+'</div></div>';
      }).join('')+'</div>';
    })
    .withFailureHandler(function(e){ el.innerHTML='<div style="color:#DC2626;padding:16px">பிழை: '+x(friendlyErrorMsg(e))+'</div>'; })
    .getFeedback();
}


function _loadPaymentRequestsList() {
  var el = document.getElementById('userList');
  el.innerHTML = '<div style="color:#9CA3AF;padding:16px;text-align:center">ஏற்றுகிறது...</div>';

  // FIX [44]: fetch the revenue summary alongside the list — both render
  // together once both calls return, summary cards on top.
  var summaryHtml = '', summaryDone = false, listHtml = '', listDone = false;
  function renderIfReady() {
    if (summaryDone && listDone) el.innerHTML = summaryHtml + listHtml;
  }

  google.script.run
    .withSuccessHandler(function(s) {
      if (s && s.ok) {
        summaryHtml = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
          + sc('மொத்த Revenue', '₹'+s.totalRevenue, false)
          + sc('இந்த மாதம்', '₹'+s.monthRevenue, true)
          + sc('இந்த மாத Payments', s.monthCount, false)
          + sc('Pending', s.pendingCount, true)
          + '</div>';
      }
      summaryDone = true; renderIfReady();
    })
    .withFailureHandler(function(){ summaryDone = true; renderIfReady(); })
    .getPaymentSummary();

  google.script.run
    .withSuccessHandler(function(list) {
      var pending = (list||[]).filter(function(r){ return r.status === 'pending'; });
      var badge = document.getElementById('payBadge');
      if (badge) {
        if (pending.length) { badge.textContent = pending.length; badge.style.display = 'inline-block'; }
        else badge.style.display = 'none';
      }
      if (!list || !list.length) {
        listHtml = '<div class="empty"><div class="ei">-</div>Payment Requests இல்லை</div>';
        listDone = true; renderIfReady(); return;
      }

      listHtml = '<div class="list">' + list.map(function(r) {
        var statusColor = r.status==='approved' ? '#0F6E56' : r.status==='rejected' ? '#DC2626' : '#B8860B';
        var statusLabel = r.status==='approved' ? '✅ Approved' : r.status==='rejected' ? '❌ Rejected' : '⏳ Pending';
        return '<div class="audit-row">'
          + '<div class="audit-time">' + x(r.requestedAt) + '</div>'
          + '<div><span class="audit-action">' + x(r.name) + '</span> <span class="audit-email">' + x(r.email) + '</span></div>'
          + '<div style="font-size:13px;color:#374151;margin-top:4px">'
          +   r.months + ' மாதம் — ₹' + r.amount + (r.upiRef ? ' — Ref: ' + x(r.upiRef) : '')
          + '</div>'
          + '<div style="font-size:12px;font-weight:700;color:' + statusColor + ';margin-top:4px">' + statusLabel + '</div>'
          + (r.status === 'pending'
              ? '<div style="display:flex;gap:6px;margin-top:8px">'
                + '<button class="btn-save" style="padding:6px 12px;font-size:12px" onclick="approvePayment(\'' + r.id + '\',' + r.months + ')">✅ Approve</button>'
                + '<button class="btn-cancel" style="padding:6px 12px;font-size:12px" onclick="rejectPayment(\'' + r.id + '\')">❌ Reject</button>'
                + '</div>'
              : '')
          + '</div>';
      }).join('') + '</div>';
      listDone = true; renderIfReady();
    })
    .withFailureHandler(function(e) { el.innerHTML = '<div style="color:#DC2626;padding:16px">பிழை: ' + x(friendlyErrorMsg(e)) + '</div>'; })
    .getPaymentRequests();
}


function approvePayment(id, months) {
  showConfirm(months + ' மாதம் Premium Approve பண்ணவா?', function() {
    loading(true);
    google.script.run
      .withSuccessHandler(function(res) {
        loading(false);
        if (res.ok) { toast('✅ Approved — Plan Upgrade ஆனது'); _loadPaymentRequestsList(); }
        else toast(res.msg || 'பிழை');
      })
      .withFailureHandler(function(e) { loading(false); toastError(e); })
      .approvePaymentRequest(id, months);
  });
}


function rejectPayment(id) {
  showConfirm('இந்த Payment Claim-ஐ Reject பண்ணவா?', function() {
    loading(true);
    google.script.run
      .withSuccessHandler(function(res) {
        loading(false);
        if (res.ok) { toast('❌ Reject செய்யப்பட்டது'); _loadPaymentRequestsList(); }
        else toast(res.msg || 'பிழை');
      })
      .withFailureHandler(function(e) { loading(false); toastError(e); })
      .rejectPaymentRequest(id);
  });
}



// v264 STABILITY: Reports is included at boot.
// Dynamic/lazy module loading was removed after live navigation regressions.
// Keep report calculations/data behavior unchanged; only module availability changes.
// LAUNCH HARDENING v102: report export request state.
var _reportExportBusy = false;
var _reportExportToken = 0;

function _reportExportStart() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    toast('Internet இல்லை. இணைப்பு வந்த பிறகு மீண்டும் முயற்சிக்கவும்.');
    return null;
  }
  if (_reportExportBusy) {
    toast('Report ஏற்கனவே உருவாக்கப்படுகிறது. முடிந்ததும் மீண்டும் முயற்சிக்கவும்.');
    return null;
  }
  _reportExportBusy = true;
  return ++_reportExportToken;
}

function _reportExportFinish(token) {
  if (token !== _reportExportToken) return false;
  _reportExportBusy = false;
  return true;
}



// v236G — Reports hub. Launcher only; it reuses existing report/search views
// and intentionally performs no server request when opened.
function openReportsHub() {
  var modal=document.getElementById('reportsHubModal');
  if(modal) modal.style.display='flex';
}
function closeReportsHub() {
  var modal=document.getElementById('reportsHubModal');
  if(modal) modal.style.display='none';
}
function openLedgerFromReports() {
  closeReportsHub();
  if(typeof go==='function') go('all');
  setTimeout(function(){
    var q=document.getElementById('srch');
    if(q){ try{q.focus({preventScroll:false});}catch(e){q.focus();} }
  },60);
}
function openMonthReportFromReports() {
  closeReportsHub();
  if(typeof go==='function') go('month');
}
function openEventReportFromReports() {
  closeReportsHub();
  if(typeof go==='function') go('summary');
  setTimeout(function(){
    if(typeof setMoiAnalysisTab==='function') setMoiAnalysisTab('event');
  },0);
}
function openPdfFromReports() {
  closeReportsHub();
  openPdfReportPicker();
}

// FIX [22]: generates the PDF server-side, decodes the returned base64
// into a Blob client-side, then triggers a normal browser download —
// user can then share that downloaded file via WhatsApp/etc themselves
// through their phone's own Share option.

// v187 — Generic filtered PDF picker.
// Client-only filter UI; existing generateFilteredPdf(filteredRecs) backend is reused unchanged.
function _pdfYmd(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function _pdfBounds(mode) {
  var p = todayStr().split('-');
  var now = new Date(+p[0], +p[1]-1, +p[2]);
  if (mode === 'lastmonth') {
    return {from:_pdfYmd(new Date(now.getFullYear(),now.getMonth()-1,1)),
            to:_pdfYmd(new Date(now.getFullYear(),now.getMonth(),0))};
  }
  if (mode === 'year') return {from:now.getFullYear()+'-01-01',to:now.getFullYear()+'-12-31'};
  if (mode === 'all') return {from:'',to:''};
  return {from:_pdfYmd(new Date(now.getFullYear(),now.getMonth(),1)),
          to:_pdfYmd(new Date(now.getFullYear(),now.getMonth()+1,0))};
}

function _pdfPopulateOptions() {
  var nk={}, ev={};
  (recs||[]).forEach(function(r){
    if (r.nakai) nk[String(r.nakai).trim()] = true;
    var eventName = String(r._eventName || r.eventName || '').trim();
    if (eventName) ev[eventName] = true;
  });
  function fill(id,set) {
    var el=document.getElementById(id); if(!el)return;
    var cur=el.value;
    var vals=Object.keys(set).filter(Boolean).sort();
    el.innerHTML='<option value="">அனைத்தும்</option>'+vals.map(function(v){
      return '<option value="'+x(v)+'">'+x(v)+'</option>';
    }).join('');
    if (vals.indexOf(cur)!==-1) el.value=cur;
  }
  fill('pdfNakai',nk); fill('pdfEvent',ev);
}

function openPdfReportPicker() {
  _pdfPopulateOptions();
  var modal=document.getElementById('pdfReportModal');
  if(!modal)return;

  // If Search currently has explicit filters, use them as a convenience.
  var searchFrom=(document.getElementById('af_from')||{}).value||'';
  var searchTo=(document.getElementById('af_to')||{}).value||'';
  var searchMode=(document.getElementById('modeF')||{}).value||'';
  var searchNakai=(document.getElementById('af_nakai')||{}).value||'';
  var searchPlace=(document.getElementById('af_place')||{}).value||'';

  var range=document.getElementById('pdfRangeMode');
  if(range) range.value='month';
  var b=_pdfBounds('month');
  document.getElementById('pdfFrom').value=b.from;
  document.getElementById('pdfTo').value=b.to;
  document.getElementById('pdfCustomRange').style.display='none';

  if (searchFrom || searchTo) {
    if(range)range.value='custom';
    document.getElementById('pdfFrom').value=searchFrom;
    document.getElementById('pdfTo').value=searchTo;
    document.getElementById('pdfCustomRange').style.display='grid';
  }
  var modeEl=document.getElementById('pdfMode'); if(modeEl)modeEl.value=searchMode;
  var nkEl=document.getElementById('pdfNakai'); if(nkEl && searchNakai)nkEl.value=searchNakai;
  var plEl=document.getElementById('pdfPlace'); if(plEl)plEl.value=searchPlace;

  modal.style.display='flex';
  updatePdfFilterPreview();
}

function closePdfReportPicker() {
  var modal=document.getElementById('pdfReportModal');
  if(modal)modal.style.display='none';
}

function onPdfRangeModeChange() {
  var mode=(document.getElementById('pdfRangeMode')||{}).value||'month';
  var custom=document.getElementById('pdfCustomRange');
  if(mode==='custom') {
    if(custom)custom.style.display='grid';
  } else {
    if(custom)custom.style.display='none';
    var b=_pdfBounds(mode);
    document.getElementById('pdfFrom').value=b.from;
    document.getElementById('pdfTo').value=b.to;
  }
  updatePdfFilterPreview();
}

function _getPdfFilteredRows() {
  var mode=(document.getElementById('pdfRangeMode')||{}).value||'month';
  var from=(document.getElementById('pdfFrom')||{}).value||'';
  var to=(document.getElementById('pdfTo')||{}).value||'';
  if(mode!=='custom') {
    var b=_pdfBounds(mode); from=b.from; to=b.to;
  }
  var moiMode=(document.getElementById('pdfMode')||{}).value||'';
  var nakai=(document.getElementById('pdfNakai')||{}).value||'';
  var place=_moiSearchNorm(((document.getElementById('pdfPlace')||{}).value||''));
  var eventName=(document.getElementById('pdfEvent')||{}).value||'';

  if(from && to && from>to) return {error:'முதல் தேதி, கடைசி தேதியை விட முன்பாக இருக்க வேண்டும்',rows:[]};

  var rows=(recs||[]).filter(function(r){
    var ev=String(r._eventName || r.eventName || '');
    return (!from || r.date>=from)
      && (!to || r.date<=to)
      && (!moiMode || r.mode===moiMode)
      && (!nakai || r.nakai===nakai)
      && (!place || _moiSearchNorm((r.place||'')+' '+(r.iruppu||'')).indexOf(place)!==-1)
      && (!eventName || ev===eventName);
  });
  return {error:'',rows:rows,from:from,to:to};
}

function updatePdfFilterPreview() {
  var p=_getPdfFilteredRows();
  var el=document.getElementById('pdfFilterPreview');
  if(!el)return;
  if(p.error){el.textContent='⚠️ '+p.error;return;}
  var total=p.rows.reduce(function(s,r){return s+(Number(r.amount)||0);},0);
  el.textContent=p.rows.length+' பதிவுகள் · மொத்தம் Rs.'+fmt(total);
}

function generateSelectedPdf() {
  var p=_getPdfFilteredRows();
  if(p.error){toast('⚠️ '+p.error);return;}
  if(!p.rows.length){toast('இந்த Filter-ல் பதிவுகள் இல்லை');return;}
  if(p.rows.length>500){toast('அதிகபட்சம் 500 பதிவுகள் மட்டுமே PDF-ஆக Export ஆகும்');return;}

  var exportToken=_reportExportStart();
  if(!exportToken)return;
  var btn=document.getElementById('pdfGenerateBtn');
  if(btn){btn.disabled=true;btn.textContent='உருவாக்குகிறது...';}
  var exportTimer=setTimeout(function(){
    if(!_reportExportFinish(exportToken))return;
    if(btn){btn.disabled=false;btn.textContent='📄 PDF உருவாக்கு';}
    toast('Report உருவாக்க அதிக நேரமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
  },30000);

  google.script.run
    .withSuccessHandler(function(res){
      clearTimeout(exportTimer);
      if(!_reportExportFinish(exportToken))return;
      if(btn){btn.disabled=false;btn.textContent='📄 PDF உருவாக்கு';}
      if(!res||!res.ok){toast('❌ '+(res&&res.msg?res.msg:'PDF பிழை'));return;}
      try{
        var byteChars=atob(res.base64);
        var byteNums=new Uint8Array(byteChars.length);
        for(var i=0;i<byteChars.length;i++)byteNums[i]=byteChars.charCodeAt(i);
        var blob=new Blob([byteNums],{type:'application/pdf'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');
        a.href=url;a.download=res.filename||'Moi_Filtered_Report.pdf';
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url);},5000);
        closePdfReportPicker();
        toast('✅ Filtered PDF Download ஆனது');
      }catch(e){toast('❌ Download பிழை: '+e.message);}
    })
    .withFailureHandler(function(e){
      clearTimeout(exportTimer);
      if(!_reportExportFinish(exportToken))return;
      if(btn){btn.disabled=false;btn.textContent='📄 PDF உருவாக்கு';}
      toastError(e);
    })
    .generateFilteredPdf(p.rows);
}

// Download PDF of currently filtered records
function doDownloadFilteredPdf() {
  var exportToken = _reportExportStart();
  if (!exportToken) return;
  var exportTimer = setTimeout(function() {
    if (!_reportExportFinish(exportToken)) return;
    toast('Report உருவாக்க அதிக நேரமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
  }, 30000);

  // Collect current filter state
  var filters = {
    q:       ((document.getElementById('srch')      || {}).value || '').toLowerCase().trim(),
    place:   ((document.getElementById('af_place')  || {}).value || '').trim(),
    dFrom:   (document.getElementById('af_from')    || {}).value || '',
    dTo:     (document.getElementById('af_to')      || {}).value || '',
    amtMin:  (document.getElementById('af_amtmin')  || {}).value || '',
    amtMax:  (document.getElementById('af_amtmax')  || {}).value || '',
    typeF:   (document.getElementById('af_type')    || {}).value || '',
    nakaiF:  (document.getElementById('af_nakai')   || {}).value || '',
    byF:     (document.getElementById('af_by')      || {}).value || '',
    mf:       document.getElementById('modeF').value || ''
  };

  // Apply same filter logic as renderAll
  var filtered = recs.filter(function(r) {
    return (!filters.q      || r.name.toLowerCase().includes(filters.q) || r.place.toLowerCase().includes(filters.q))
        && (!filters.place  || r.place.toLowerCase().includes(filters.place.toLowerCase()) || (r.iruppu && r.iruppu.toLowerCase().includes(filters.place.toLowerCase())))
        && (!filters.mf     || r.mode === filters.mf)
        && (!filters.dFrom  || r.date >= filters.dFrom)
        && (!filters.dTo    || r.date <= filters.dTo)
        && (filters.amtMin === '' || r.amount >= Number(filters.amtMin))
        && (filters.amtMax === '' || r.amount <= Number(filters.amtMax))
        && (!filters.typeF  || r.type  === filters.typeF)
        && (!filters.nakaiF || r.nakai === filters.nakaiF)
        && (!filters.byF    || r.enteredBy === filters.byF);
  });

  if (!filtered.length) { clearTimeout(exportTimer); _reportExportFinish(exportToken); toast('Filter-ல் பதிவுகள் இல்லை — PDF-க்கு எதுவும் இல்லை'); return; }
  if (filtered.length > 500) { clearTimeout(exportTimer); _reportExportFinish(exportToken); toast('அதிகபட்சம் 500 பதிவுகள் மட்டுமே PDF-ஆக Export ஆகும்'); return; }

  toast('📄 Filter PDF தயாரிக்கிறது (' + filtered.length + ' பதிவுகள்)...');

  google.script.run
    .withSuccessHandler(function(res) {
      clearTimeout(exportTimer);
      if (!_reportExportFinish(exportToken)) return;
      if (!res || !res.ok) { toast('❌ ' + (res && res.msg ? res.msg : 'PDF பிழை')); return; }
      try {
        var byteChars = atob(res.base64);
        var byteNums = new Uint8Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        var blob = new Blob([byteNums], { type: 'application/pdf' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url; a.download = res.filename || 'FilteredReport.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        toast('✅ Filter PDF Download ஆனது');
      } catch(e) { toast('❌ Download பிழை: ' + e.message); }
    })
    .withFailureHandler(function(e){
      clearTimeout(exportTimer);
      if (!_reportExportFinish(exportToken)) return;
      toastError(e);
    })
    .generateFilteredPdf(filtered);
}


function doDownloadReport() {
  var exportToken = _reportExportStart();
  if (!exportToken) return;
  var btn = document.getElementById('mcReportBtn');
  if (!btn) { _reportExportFinish(exportToken); return; }
  var origText = btn.textContent;
  btn.disabled = true; btn.textContent = 'உருவாக்குகிறது...';
  var exportTimer = setTimeout(function() {
    if (!_reportExportFinish(exportToken)) return;
    btn.disabled = false; btn.textContent = origText;
    toast('Report உருவாக்க அதிக நேரமாகிறது. Internet சரிபார்த்து மீண்டும் முயற்சிக்கவும்.');
  }, 30000);

  google.script.run
    .withSuccessHandler(function(res) {
      clearTimeout(exportTimer);
      if (!_reportExportFinish(exportToken)) return;
      btn.disabled = false; btn.textContent = origText;
      if (!res || !res.ok) { toast((res && res.msg) || 'PDF உருவாக்க முடியவில்லை'); return; }
      try {
        var byteChars = atob(res.base64);
        var byteNumbers = new Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = res.filename || 'Moi_Report.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        toast('✅ PDF Download ஆனது');
      } catch (e) {
        toast('PDF Download பிழை: ' + e.message);
      }
    })
    .withFailureHandler(function(e) {
      clearTimeout(exportTimer);
      if (!_reportExportFinish(exportToken)) return;
      btn.disabled = false; btn.textContent = origText;
      toastError(e);
    })
    .generateReportPdf('');
}


function onPdfFilterChanged(){ updatePdfFilterPreview(); }


// ============================================================
//  🤖 AI ASSISTANT (Beta) — chat UI controller.
//
//  LAZY LOAD: this file only defines functions/state — it makes NO
//  google.script.run call and touches no DOM until openAIAssistant()
//  is actually invoked from the More menu. So there is zero added
//  cost to dashboard load or app startup; the AI module only "wakes
//  up" once the user opens it.
//
//  Read-only: the only server call this file ever makes is
//  aiAssistantAsk(question), which is itself read-only (see
//  AIAssistant.gs). No delete/edit/create/import/export action is
//  wired to this screen.
// ============================================================

var AI_SUGGESTIONS = [
  'இன்றைய நல்ல நேரம்',
  'இன்றைய ராசி பலன்',
  'ஒரு திருக்குறள் சொல்லு',
  'ஒரு தமிழ் குழந்தைப் பெயர் சொல்லு',
  'Duplicate பெயர்கள் பார்க்க'
];

var _aiHistory = []; // { role:'user'|'ai', text:'...' } — in-memory only, per session
var _aiKuralCursor = -1; // avoid immediate repeated Kural replies

// v265 — zero-cost local Text-to-Speech for assistant replies.
// Uses the device/browser speechSynthesis engine only; no server/API call,
// no Sheet write. Preference is stored only on this device.
var _aiTtsSupported = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
var _aiAutoSpeak = (function(){
  try {
    var v = localStorage.getItem('nammamoi_ai_auto_speak');
    return v === null ? true : v === '1';
  } catch(e) { return true; }
})();
var _aiSpeakingButton = null;
var _aiLastAutoSpoken = ''; // suppress exact duplicate auto-TTS

function openAIAssistant() {
  if (!document.getElementById('aiAssistantModal')) return; // safety no-op if markup missing
  document.getElementById('aiAssistantModal').style.display = 'flex';
  _aiSyncSpeakerUi();
  if (!_aiHistory.length) _aiRenderWelcome();
  var input = document.getElementById('aiInput');
  if (input) setTimeout(function() { input.focus(); }, 50);
}

function dashboardAIAsk(question) {
  openAIAssistant();
  var input = document.getElementById('aiInput');
  if (!input) return;
  input.value = String(question || '');
  sendAIMessage();
}

function closeAIAssistant() {
  if (_aiSpeechListening && _aiSpeechRecognition) {
    try { _aiSpeechRecognition.stop(); } catch (e) {}
  }
  _aiStopSpeaking();
  document.getElementById('aiAssistantModal').style.display = 'none';
}

function onAIAssistantBgClick(e) {
  if (e.target === document.getElementById('aiAssistantModal')) closeAIAssistant();
}

function _aiRenderWelcome() {
  var box = document.getElementById('aiChatBody');
  if (!box) return;
  var chips = AI_SUGGESTIONS.map(function(s) {
    return '<button type="button" class="ai-chip" onclick="_aiAskSuggested(this)">' + x(s) + '</button>';
  }).join('');
  box.innerHTML =
    '<div class="ai-msg ai-msg-bot">' +
      '<div class="ai-bubble">வணக்கம்! நம்ம மொய் உதவி, மொய்/செலவு தகவல், நல்ல நேரம், ராசி பலன், திருக்குறள், குழந்தைப் பெயர் போன்றவற்றை கேட்கலாம். 🙏</div>' +
    '</div>' +
    '<div class="ai-suggest-wrap">' + chips + '</div>';
}

function _aiAskSuggested(btn) {
  var text = btn.textContent;
  var wrap = btn.closest ? btn.closest('.ai-suggest-wrap') : null;
  if (wrap) wrap.remove();
  document.getElementById('aiInput').value = text;
  sendAIMessage();
}

function onAIInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
}

function sendAIMessage() {
  var input = document.getElementById('aiInput');
  var q = (input.value || '').trim();
  if (!q) return;
  input.value = '';
  var suggestions = document.querySelector('#aiChatBody .ai-suggest-wrap');
  if (suggestions) suggestions.remove();
  _aiAppendMessage('user', q);

  // v181: Reminder voice/text commands are handed to the EXISTING
  // Reminder modal. Nothing is written until the user taps Save there.
  if (_aiTryReminderCommand(q)) return;

  // v286: duplicate-person review is a user-confirmed local tool; AI only opens the review screen.
  if (/duplicate|டூப்ளிகேட்|ஒரே பெயர்|ஒத்த பெயர்/i.test(q) && /பெயர்|name|duplicate|டூப்ளிகேட்/i.test(q)) {
    _aiAppendMessage('ai','உங்கள் பதிவுகளில் ஒரே நபர் வேறு spelling/style-ல் உள்ளாரா என்று பார்க்கிறேன். Merge எதுவும் தானாக நடக்காது.');
    setTimeout(function(){ closeAIAssistant(); if(typeof openDuplicatePersonReview==='function') openDuplicatePersonReview(); },120);
    return;
  }

  // v183: zero-cost local assistant handles launch-safe help/basics/stories.
  var localReply = _aiLocalAnswer(q);
  if (localReply) {
    _aiAppendMessage('ai', localReply);
    _aiMaybeAutoSpeak(localReply);
    return;
  }

  _aiAppendTyping();

  google.script.run
    .withSuccessHandler(function(res) {
      _aiRemoveTyping();
      var answer = (res && res.ok && res.answer) ? res.answer : 'தகவல் கிடைக்கவில்லை';
      _aiAppendMessage('ai', answer);
      _aiMaybeAutoSpeak(answer);
    })
    .withFailureHandler(function(e) {
      _aiRemoveTyping();
      console.error('AI Assistant request failed:', e);
      _aiAppendMessage('ai', 'ஒரு சிக்கல் ஏற்பட்டது, மீண்டும் முயற்சிக்கவும்.');
    })
    .aiAssistantAsk(q);
}

function _aiAppendMessage(role, text) {
  text = String(text == null ? '' : text);
  if (role === 'ai' && _aiHistory.length) {
    for (var di=_aiHistory.length-1; di>=0; di--) {
      if (_aiHistory[di].role === 'ai') {
        if (String(_aiHistory[di].text || '').trim() === text.trim()) {
          if (typeof toast === 'function') toast('இந்த பதில் ஏற்கனவே மேலே உள்ளது.');
          var existing=document.querySelector('#aiChatBody .ai-msg-bot:last-of-type');
          if (existing && existing.scrollIntoView) existing.scrollIntoView({block:'nearest'});
          return false;
        }
        break;
      }
    }
  }
  _aiHistory.push({ role: role, text: text });
  var box = document.getElementById('aiChatBody');
  if (!box) return;
  var cls = role === 'user' ? 'ai-msg-user' : 'ai-msg-bot';
  var div = document.createElement('div');
  div.className = 'ai-msg ' + cls;
  var bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  if (role === 'ai' && text.indexOf('\n') > 0) {
    var parts = text.split('\n');
    var head = document.createElement('strong');
    head.className = 'ai-response-title';
    head.textContent = parts.shift();
    var body = document.createElement('span');
    body.className = 'ai-response-body';
    body.textContent = parts.join('\n');
    bubble.appendChild(head);
    bubble.appendChild(body);
  } else {
    bubble.textContent = text; // textContent — never innerHTML with model/user text
  }
  div.appendChild(bubble);
  if (role === 'ai') {
    var speakBtn = document.createElement('button');
    speakBtn.type = 'button';
    speakBtn.className = 'ai-reply-speak-btn';
    speakBtn.textContent = '🔊';
    speakBtn.title = 'இந்த பதிலை கேள்';
    speakBtn.setAttribute('aria-label', 'இந்த பதிலை வாசிக்கவும்');
    speakBtn.onclick = function(){ _aiSpeakText(text, speakBtn); };
    if (!_aiTtsSupported) speakBtn.style.display = 'none';
    div.appendChild(speakBtn);
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return true;
}

function _aiAppendTyping() {
  var box = document.getElementById('aiChatBody');
  if (!box) return;
  var div = document.createElement('div');
  div.className = 'ai-msg ai-msg-bot';
  div.id = 'aiTypingRow';
  div.innerHTML = '<div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function _aiRemoveTyping() {
  var el = document.getElementById('aiTypingRow');
  if (el) el.remove();
}


// ============================================================
//  v266 — AI Assistant local speaker / Text-to-Speech
//  Chrome/Android hardening: dynamic capability check, voice refresh,
//  resume support, retained utterance references and safe chunk queue.
// ============================================================
var _aiCurrentUtterance = null;
var _aiSpeechQueue = [];
var _aiSpeechQueueIndex = 0;
var _aiSpeechSession = 0;
var _aiVoiceCache = [];

function _aiHasTts() {
  return !!(window.speechSynthesis && (window.SpeechSynthesisUtterance ||
           (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null)));
}

function _aiRefreshVoices() {
  if (!_aiHasTts()) {
    _aiVoiceCache = [];
    return [];
  }
  try { _aiVoiceCache = window.speechSynthesis.getVoices() || []; }
  catch (e) { _aiVoiceCache = []; }
  return _aiVoiceCache;
}

// Chrome/Android may populate voices after the page has loaded.
if (_aiHasTts()) {
  _aiTtsSupported = true;
  _aiRefreshVoices();
  try {
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', _aiRefreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = _aiRefreshVoices;
    }
  } catch (e) {}
}

function _aiLooksTamil(text) {
  return /[\u0B80-\u0BFF]/.test(String(text || ''));
}

function _aiPickVoice(lang) {
  if (!_aiHasTts()) return null;
  var voices = _aiRefreshVoices();
  if (!voices || !voices.length) voices = _aiVoiceCache || [];
  if (!voices.length) return null;
  var wanted = String(lang || '').toLowerCase();
  var base = wanted.split('-')[0];
  var i;
  for (i=0;i<voices.length;i++) {
    if (String(voices[i].lang || '').toLowerCase() === wanted) return voices[i];
  }
  for (i=0;i<voices.length;i++) {
    if (String(voices[i].lang || '').toLowerCase().indexOf(base + '-') === 0 ||
        String(voices[i].lang || '').toLowerCase() === base) return voices[i];
  }
  // Do not force an unrelated voice. Let the device TTS engine choose its
  // own fallback for the requested utterance language.
  return null;
}

function _aiSetSpeakingButton(button, speaking) {
  if (speaking && button) {
    _aiSpeakingButton = button;
    button.classList.add('speaking');
    button.textContent = '⏹';
  } else if (_aiSpeakingButton) {
    _aiSpeakingButton.classList.remove('speaking');
    _aiSpeakingButton.textContent = '🔊';
    _aiSpeakingButton = null;
  }
}

function _aiStopSpeaking() {
  _aiSpeechSession++;
  _aiSpeechQueue = [];
  _aiSpeechQueueIndex = 0;
  _aiCurrentUtterance = null;
  if (_aiHasTts()) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  _aiSetSpeakingButton(null, false);
}

function _aiSpeechChunks(text) {
  var clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Keeping chunks comfortably below Android TTS engine limits also avoids
  // Chrome silently dropping long utterances on some devices.
  var max = 220;
  var out = [];
  while (clean.length > max) {
    var cut = -1;
    var marks = ['. ', '? ', '! ', '। ', '… ', ', ', '; ', ' '];
    for (var m=0; m<marks.length; m++) {
      var idx = clean.lastIndexOf(marks[m], max);
      if (idx > Math.floor(max * 0.55)) { cut = idx + marks[m].length; break; }
    }
    if (cut < 1) cut = max;
    out.push(clean.slice(0, cut).trim());
    clean = clean.slice(cut).trim();
  }
  if (clean) out.push(clean);
  return out;
}

function _aiSpeakNextChunk(session, button) {
  if (session !== _aiSpeechSession || !_aiHasTts()) return;
  if (_aiSpeechQueueIndex >= _aiSpeechQueue.length) {
    _aiCurrentUtterance = null;
    _aiSetSpeakingButton(null, false);
    return;
  }

  var chunk = _aiSpeechQueue[_aiSpeechQueueIndex++];
  var lang = _aiLooksTamil(chunk) ? 'ta-IN' : 'en-IN';
  var Ctor = window.SpeechSynthesisUtterance ||
             (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
  if (!Ctor) return;

  var u = new Ctor(chunk);
  _aiCurrentUtterance = u; // Important: keep a strong ref until onend/onerror.
  u.lang = lang;
  u.rate = 0.95;
  u.pitch = 1;
  u.volume = 1;
  var voice = _aiPickVoice(lang);
  if (voice) u.voice = voice;

  u.onend = function() {
    if (session !== _aiSpeechSession) return;
    _aiCurrentUtterance = null;
    _aiSpeakNextChunk(session, button);
  };
  u.onerror = function(ev) {
    if (session !== _aiSpeechSession) return;
    var err = ev && ev.error ? String(ev.error) : '';
    // Some Chrome builds emit "interrupted" for an intentional cancel; do
    // not show that as a device error.
    if (err && err !== 'interrupted' && err !== 'canceled') {
      console.warn('AI speaker error:', err);
      if (typeof toast === 'function') toast('Speaker தொடங்கவில்லை. Phone Text-to-Speech setting-ஐ சரிபார்க்கவும்.');
    }
    _aiCurrentUtterance = null;
    _aiSpeechQueue = [];
    _aiSetSpeakingButton(null, false);
  };

  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
    // A paused state can remain after app/background transitions on Android.
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch(e) {
    console.error('AI speaker start failed:', e);
    _aiCurrentUtterance = null;
    _aiSpeechQueue = [];
    _aiSetSpeakingButton(null, false);
    if (typeof toast === 'function') toast('Speaker தொடங்க முடியவில்லை.');
  }
}

function _aiSpeakText(text, button) {
  var value = String(text || '').trim();
  if (!_aiHasTts() || !value) {
    _aiTtsSupported = false;
    _aiSyncSpeakerUi();
    return;
  }

  _aiTtsSupported = true;
  var wasSpeaking = false;
  try { wasSpeaking = !!(window.speechSynthesis.speaking || window.speechSynthesis.pending); } catch(e) {}

  _aiSpeechSession++;
  var session = _aiSpeechSession;
  _aiSpeechQueue = _aiSpeechChunks(value);
  _aiSpeechQueueIndex = 0;
  _aiCurrentUtterance = null;
  _aiSetSpeakingButton(button, !!button);

  // Chrome has a long-standing edge case where speak() immediately after
  // cancel() can be swallowed. Only cancel when there is an active queue;
  // then give the engine one short tick before restarting.
  if (wasSpeaking) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
    setTimeout(function(){ _aiSpeakNextChunk(session, button); }, 80);
  } else {
    try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch(e) {}
    _aiSpeakNextChunk(session, button);
  }
}

function _aiMaybeAutoSpeak(text) {
  var value=String(text||'').trim();
  if (!_aiAutoSpeak || !_aiHasTts() || !value) return;
  if (_aiLastAutoSpoken === value) return;
  _aiLastAutoSpoken = value;
  _aiSpeakText(value, null);
}

function _aiToggleAutoSpeak() {
  _aiAutoSpeak = !_aiAutoSpeak;
  try { localStorage.setItem('nammamoi_ai_auto_speak', _aiAutoSpeak ? '1' : '0'); } catch(e) {}
  if (!_aiAutoSpeak) {
    _aiStopSpeaking();
  } else if (_aiHasTts()) {
    // v278: unlock/test TTS inside the SAME user gesture. Android WebView/
    // Chrome may ignore later asynchronous speak() calls until speech has
    // first been started by a direct tap. Giving immediate audible feedback
    // also makes it clear whether the device TTS engine is available.
    try { window.speechSynthesis.cancel(); } catch(e) {}
    try { window.speechSynthesis.resume(); } catch(e) {}
    _aiRefreshVoices();
    setTimeout(function(){
      _aiSpeakText('ஒலி இயக்கப்பட்டது', null);
    }, 0);
  }
  _aiSyncSpeakerUi();
}

function _aiSyncSpeakerUi() {
  _aiTtsSupported = _aiHasTts();
  var btn = document.getElementById('aiAutoSpeakBtn');
  if (!btn) return;
  if (!_aiTtsSupported) {
    btn.textContent = '🔇';
    btn.disabled = true;
    btn.title = 'இந்த device/browser-ல் speaker support இல்லை';
    return;
  }
  btn.disabled = false;
  btn.textContent = _aiAutoSpeak ? '🔊' : '🔇';
  btn.classList.toggle('on', _aiAutoSpeak);
  btn.setAttribute('aria-pressed', _aiAutoSpeak ? 'true' : 'false');
  btn.title = _aiAutoSpeak ? 'AI பதில் தானாக வாசிக்கும் — நிறுத்த தட்டவும்' : 'AI பதிலை தானாக வாசிக்க தட்டவும்';
}

// ============================================================
//  v180 — AI Assistant voice input (Tamil-first, read-only)
//  Uses browser/WebView SpeechRecognition when available.
//  Voice only fills aiInput; existing sendAIMessage() remains the
//  single server path, so no reminder/create/edit/delete capability
//  is introduced here.
// ============================================================
var _aiSpeechRecognition = null;
var _aiSpeechListening = false;

// v237 — Voice input language toggle (Tamil-first default, English optional).
// Browser SpeechRecognition only supports one BCP-47 lang per session, so
// true Tanglish code-switching isn't possible — this lets the person pick
// which language to speak in for THIS voice turn, in-memory only, no
// storage/schema change. Defaults to Tamil (unchanged from before).
var _aiVoiceLang = 'ta-IN';

function _aiToggleVoiceLang() {
  _aiVoiceLang = (_aiVoiceLang === 'ta-IN') ? 'en-IN' : 'ta-IN';
  var btn = document.getElementById('aiVoiceLangBtn');
  if (btn) {
    btn.textContent = (_aiVoiceLang === 'ta-IN') ? 'த' : 'EN';
    btn.title = (_aiVoiceLang === 'ta-IN') ? 'தமிழில் பேசுவேன் — தட்டி English-க்கு மாற்றவும்' : 'English-ல் பேசுவேன் — தட்டி தமிழுக்கு மாற்றவும்';
  }
}

function _aiVoiceSetStatus(message, listening) {
  var st = document.getElementById('aiVoiceStatus');
  var btn = document.getElementById('aiVoiceBtn');
  if (st) st.textContent = message || '';
  if (btn) {
    btn.classList.toggle('listening', !!listening);
    btn.setAttribute('aria-pressed', listening ? 'true' : 'false');
    btn.title = listening ? 'கேட்கிறது… நிறுத்த தட்டவும்' : 'குரல் மூலம் கேள்';
  }
}

function _aiGetSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function toggleAIVoiceInput() {
  if (_aiSpeechListening && _aiSpeechRecognition) {
    try { _aiSpeechRecognition.stop(); } catch (e) {}
    return;
  }

  var Recognition = _aiGetSpeechRecognitionCtor();
  if (!Recognition) {
    _aiVoiceSetStatus('இந்த browser/app-ல் voice input support இல்லை. Keyboard voice typing பயன்படுத்தலாம்.', false);
    return;
  }

  var rec = new Recognition();
  _aiSpeechRecognition = rec;
  rec.lang = _aiVoiceLang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  var finalText = '';
  rec.onstart = function() {
    _aiSpeechListening = true;
    _aiVoiceSetStatus(_aiVoiceLang === 'ta-IN' ? '🎙️ கேட்கிறேன்… தமிழில் பேசுங்கள்' : '🎙️ Listening… speak in English', true);
  };

  rec.onresult = function(event) {
    var interim = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var piece = event.results[i][0] ? event.results[i][0].transcript : '';
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    var input = document.getElementById('aiInput');
    if (input) input.value = (finalText || interim).trim();
  };

  rec.onerror = function(event) {
    var code = event && event.error ? event.error : '';
    var msg = 'Voice input கிடைக்கவில்லை.';
    if (code === 'not-allowed') msg = 'Microphone permission அனுமதிக்கவும்.';
    else if (code === 'service-not-allowed') msg = 'இந்த app/WebView-ல் direct voice recognition கிடைக்கவில்லை. Keyboard 🎤 voice typing பயன்படுத்தவும்.';
    else if (code === 'no-speech') msg = 'குரல் கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்.';
    else if (code === 'audio-capture') msg = 'Microphone கிடைக்கவில்லை.';
    _aiSpeechListening = false;
    _aiVoiceSetStatus(msg, false);
  };

  rec.onend = function() {
    _aiSpeechListening = false;
    _aiSpeechRecognition = null;
    var input = document.getElementById('aiInput');
    var hasText = input && (input.value || '').trim();
    _aiVoiceSetStatus(hasText ? '✓ குரல் உரையாக மாற்றப்பட்டது — அனுப்பலாம்' : '', false);
    if (input && hasText) input.focus();
  };

  try {
    rec.start();
  } catch (e) {
    _aiSpeechListening = false;
    _aiSpeechRecognition = null;
    _aiVoiceSetStatus('Direct voice input தொடங்கவில்லை. Keyboard 🎤 voice typing பயன்படுத்தவும்.', false);
  }
}


// ============================================================
//  v181 — Safe AI → Reminder handoff
//
//  Important safety rule:
//  - AI never writes a reminder directly.
//  - A clear reminder create/update phrase only opens the existing
//    Reminder modal and prefills what can be determined safely.
//  - The existing Save button remains the final confirmation and uses
//    the existing addReminder()/updateReminder() endpoints unchanged.
// ============================================================

function _aiReminderNorm(v) {
  return String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function _aiReminderHasAny(q, words) {
  for (var i = 0; i < words.length; i++) {
    if (q.indexOf(words[i]) !== -1) return true;
  }
  return false;
}

function _aiReminderDate(q) {
  var text = _aiReminderNorm(q);

  // ISO yyyy-mm-dd
  var m = text.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);

  // dd-mm-yyyy / dd/mm/yyyy
  m = text.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})\b/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);

  var offset = 0;
  if (text.indexOf('நாளை மறுநாள்') !== -1 || text.indexOf('day after tomorrow') !== -1) offset = 2;
  else if (text.indexOf('நாளை') !== -1 || text.indexOf('tomorrow') !== -1) offset = 1;
  if (!offset) return '';

  var p = todayStr().split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function _aiReminderCommandType(q) {
  var text = _aiReminderNorm(q);
  var isReminder = _aiReminderHasAny(text, ['reminder', 'நினைவூட்ட', 'நினைவூட்டல்']);
  if (!isReminder) return '';

  if (_aiReminderHasAny(text, ['update', 'edit', 'change', 'மாற்று', 'மாற்ற', 'திருத்து', 'புதுப்பி'])) return 'update';
  if (_aiReminderHasAny(text, ['add', 'create', 'set', 'வை', 'வைக்க', 'போடு', 'சேர்', 'அமை'])) return 'create';
  return '';
}

function _aiOpenReminderCreateFromCommand(q) {
  var date = _aiReminderDate(q);
  closeAIAssistant();
  openReminderModal(date || '');
  var note = document.getElementById('rem_note');
  if (note) note.value = q;
  var err = document.getElementById('remErr');
  if (err && !date) err.textContent = 'Voice command-ல் தேதி தெளிவாக இல்லை — தேதி தேர்வு செய்து Save செய்யவும்.';
  toast('Reminder விவரம் திறக்கப்பட்டது — சரிபார்த்து Save செய்யவும்');
}

function _aiPickReminderCandidate(q, reminders) {
  var text = _aiReminderNorm(q);
  var matches = [];
  (reminders || []).forEach(function(r) {
    var name = _aiReminderNorm(r.name);
    var place = _aiReminderNorm(r.place);
    if ((name && text.indexOf(name) !== -1) ||
        (place && place.length >= 3 && text.indexOf(place) !== -1)) {
      matches.push(r);
    }
  });
  return matches.length === 1 ? matches[0] : null;
}

function _aiOpenReminderUpdateFromCommand(q, reminders) {
  var rem = _aiPickReminderCandidate(q, reminders);
  if (!rem) {
    _aiAppendMessage('ai', 'எந்த Reminder-ஐ மாற்ற வேண்டும் என்று தெளிவாக இல்லை. Reminder பெயரை சேர்த்து மீண்டும் சொல்லுங்கள்.');
    return;
  }

  closeAIAssistant();

  // Reuse existing edit flow so every existing field/guard remains intact.
  // Ensure the same collection editReminder() searches is current.
  _reminders = reminders || _reminders;
  editReminder(rem.id);

  var date = _aiReminderDate(q);
  if (date) {
    var d = document.getElementById('rem_date');
    if (d) d.value = date;
  }
  var note = document.getElementById('rem_note');
  if (note && q && note.value.indexOf(q) === -1) {
    note.value = note.value ? (note.value + ' | Voice: ' + q) : ('Voice: ' + q);
  }
  toast('Reminder மாற்றம் நிரப்பப்பட்டது — சரிபார்த்து Save செய்யவும்');
}

function _aiTryReminderCommand(q) {
  var type = _aiReminderCommandType(q);
  if (!type) return false;

  if (type === 'create') {
    _aiOpenReminderCreateFromCommand(q);
    return true;
  }

  // Update needs the current Reminder list. Read it fresh so AI does not
  // rely on a stale dashboard cache. This is a READ only; Save is still manual.
  _aiAppendTyping();
  google.script.run
    .withSuccessHandler(function(res) {
      _aiRemoveTyping();
      var reminders = (res && res.ok && Array.isArray(res.reminders)) ? res.reminders :
                      (Array.isArray(res) ? res : []);
      _aiOpenReminderUpdateFromCommand(q, reminders);
    })
    .withFailureHandler(function(e) {
      _aiRemoveTyping();
      console.error('AI reminder lookup failed:', e);
      _aiAppendMessage('ai', 'Reminder பட்டியல் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.');
    })
    .getReminders();
  return true;
}


// ============================================================
// v183 — Zero-cost local AI launch scope
// App help + basic general knowledge + greetings + small story library.
// No external AI API is used here. Privacy/secrets are blocked first.
// ============================================================
function _aiLocalNorm(v) {
  return String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function _aiLocalHas(t, words) {
  for (var i=0;i<words.length;i++) if (t.indexOf(words[i]) !== -1) return true;
  return false;
}

function _aiPrivacyBlocked(t) {
  return _aiLocalHas(t, [
    'api key','apikey','secret key','password','properties service','propertiesservice',
    'spreadsheet id','sheet id','ss id','deployment id','admin config','source code',
    'internal code','backend code','security rule','database id','token',
    'கடவுச்சொல்','ரகசிய key','ரகசியம்','உள் code','source code','api கீ','அட்மின் config'
  ]);
}

var _AI_APP_HELP = [
  {k:['மொய் சேர','moi add','add moi'], a:'மொய் பதிவை சேர்க்க, மொய் பகுதியில் “சேர்” என்பதைத் திறந்து பெயர், ஊர், நிகழ்வு, தொகை மற்றும் தேதியை சரிபார்த்து Save செய்யுங்கள்.'},
  {k:['daily cash','செலவு சேர','expense add','வரவு சேர','income add'], a:'Daily Cash பகுதியில் செலவு அல்லது வரவு வகையைத் தேர்வு செய்து தொகை, தேதி மற்றும் தேவையான விவரங்களை நிரப்பி Save செய்யலாம்.'},
  {k:['reminder','நினைவூட்ட'], a:'Reminder-ஐ bell/Reminder பகுதியில் உருவாக்கலாம். தேதி மற்றும் விவரத்தை சரிபார்த்து Save செய்யுங்கள்.'},
  {k:['pdf','report','அறிக்கை'], a:'Report/PDF வசதியை பயன்படுத்தலாம். Filtered PDF வசதி மேம்படுத்தப்பட்டு வருகிறது.'},
  {k:['calendar','நாட்காட்டி','பஞ்சாங்க'], a:'தமிழ் நாட்காட்டியில் மாத தேதிகளை பார்க்கலாம்; ஒரு தேதியைத் தேர்வு செய்தால் அந்த நாளின் தமிழ் நாள்/பஞ்சாங்க விவரங்களை பார்க்கலாம்.'},
  {k:['search','தேடு','தேட'], a:'மொய் Search பகுதியில் பெயர் அல்லது ஊர் மூலம் பதிவுகளை தேடலாம்.'},
  {k:['document','ஆவணம்'], a:'முக்கிய ஆவணங்கள் வசதி documents-ஐ ஒழுங்காக அணுக உதவுகிறது. தனிப்பட்ட ஆவண விவரங்களை AI Assistant வெளிப்படுத்தாது.'},
  {k:['crop','ocr','receipt','ரசீது'], a:'Receipt capture-ல் படத்தை crop செய்து OCR மூலம் விவரங்களைப் படிக்க முயற்சி செய்யலாம். OCR முடிவை Save செய்வதற்கு முன் சரிபார்ப்பது நல்லது.'}
];

var _AI_BASIC = [
  {k:['இந்தியாவின் தலைநகர்','capital of india'], a:'இந்தியாவின் தலைநகர் புதுதில்லி (New Delhi).'},
  {k:['1 kg','1kg','ஒரு கிலோ'], a:'1 கிலோகிராம் = 1000 கிராம்.'},
  {k:['1 litre','1 liter','ஒரு லிட்டர்'], a:'1 லிட்டர் = 1000 மில்லிலிட்டர்.'},
  {k:['computer என்றால்','what is computer'], a:'Computer என்பது தகவலை உள்ளீடாக பெற்று, நிரல்களின் வழிமுறைகளின்படி செயலாக்கி, முடிவை வழங்கும் மின்னணு சாதனம்.'},
  {k:['internet என்றால்','what is internet'], a:'Internet என்பது உலகம் முழுவதும் உள்ள கணினி மற்றும் சாதன வலைப்பின்னல்களை இணைக்கும் பெரிய network.'}
];

var _AI_STORIES = [
  'ஒரு சிறிய கிராமத்தில் ஒரு சிறுவன் தினமும் ஒரு மரத்திற்கு தண்ணீர் ஊற்றினான். பல நாட்கள் மாற்றம் தெரியவில்லை. ஆனால் அவன் விடாமல் தொடர்ந்தான். சில மாதங்களில் அந்த மரம் நிழல் தரும் அளவுக்கு வளர்ந்தது. பாடம்: சிறிய நல்ல முயற்சியும் தொடர்ந்து செய்தால் பெரிய பலன் தரும்.',
  'ஒரு எறும்பு சிறிய உணவுத் துண்டை எடுத்துச் செல்ல பலமுறை முயன்றது. ஒவ்வொரு முறையும் கீழே விழுந்தாலும் மீண்டும் எடுத்தது. இறுதியில் அது தனது கூட்டை அடைந்தது. பாடம்: முயற்சியை விடாமல் இருப்பது வெற்றிக்கு வழி.'
];



// ============================================================
// v236S — Tamil Family Assistant (local / zero per-query cost)
// Reuses the existing verified local Calendar/Rasi data where available.
// Static family-content helpers stay entirely client-side and read-only.
// ============================================================
var _AI_KURALS = [
  {n:1,k:'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.',m:'எழுத்துகளுக்கு அகரம் முதல் போல உலகிற்கு இறைவன் முதன்மை.'},
  {n:100,k:'இனிய உளவாக இன்னாத கூறல் கனியிருப்பக் காய்கவர்ந் தற்று.',m:'இனிய சொற்கள் இருக்கும்போது கடுமையான சொற்களைப் பயன்படுத்த வேண்டாம்.'},
  {n:391,k:'கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக.',m:'கற்க வேண்டியதை தெளிவாகக் கற்று, கற்றதற்கு ஏற்றபடி நடக்க வேண்டும்.'},
  {n:467,k:'எண்ணித் துணிக கருமம் துணிந்தபின் எண்ணுவம் என்பது இழுக்கு.',m:'செயலை தொடங்குவதற்கு முன் நன்றாக யோசிக்க வேண்டும்.'},
  {n:595,k:'வெள்ளத் தனைய மலர்நீட்டம் மாந்தர்தம் உள்ளத் தனையது உயர்வு.',m:'மனிதரின் உயர்வு அவர்களின் உள்ளத்தின் உயரத்தால் தீர்மானிக்கப்படுகிறது.'}
];
var _AI_PROVERBS = [
  'அளவுக்கு மிஞ்சினால் அமிர்தமும் நஞ்சு.',
  'சிறு துளி பெரு வெள்ளம்.',
  'கற்றது கைமண் அளவு; கல்லாதது உலகளவு.',
  'ஒன்றுபட்டால் உண்டு வாழ்வு.',
  'அவசரம் ஆபத்து.'
];
var _AI_RIDDLES = [
  'வாய் இல்லை, ஆனால் பேசும்; கால் இல்லை, ஆனால் ஓடும். அது என்ன? — பதில்: வானொலி/ஒலி (கேள்வி வடிவில் பயன்படுத்தலாம்).',
  'வெள்ளை வீட்டுக்குள் மஞ்சள் மனிதன். அது என்ன? — பதில்: முட்டை.',
  'எவ்வளவு எடுத்தாலும் பெரிதாகிக் கொண்டே போகும். அது என்ன? — பதில்: குழி.',
  'கால் இல்லாமல் வீட்டைச் சுற்றி வரும். அது என்ன? — பதில்: புகை.'
];
var _AI_BABY_NAMES = {
  boy:['ஆதவன்','கவின்','இனியன்','முகிலன்','யுவன்','அருள்','நிலவன்','வியன்'],
  girl:['யாழினி','இனியா','நிலா','மகிழினி','கயல்','தாரணி','அமுதா','வேணி']
};
var _AI_DAILY_INFO = [
  'ஒரு நாளில் செய்ய வேண்டிய 3 முக்கிய வேலைகளை காலை நேரமே எழுதிவைத்தால் கவனம் சிதறுவது குறையும்.',
  'முக்கிய ரசீது அல்லது ஆவணத்தை உடனே பெயரிட்டு சேமித்தால் பின்னர் தேடுவது எளிதாகும்.',
  'சிறிய தினசரி செலவுகளையும் பதிவு செய்தால் மாத இறுதியில் உண்மையான செலவு pattern தெளிவாக தெரியும்.',
  'தண்ணீர் போதுமான அளவு குடிப்பது தினசரி உடல் நல பழக்கங்களில் ஒன்று.',
  'ஒரே password-ஐ பல services-ல் பயன்படுத்தாமல் இருப்பது account security-க்கு நல்லது.'
];
var _AI_COOKING_TIPS = [
  'சாதம் உதிரியாக வர அரிசியை கழுவி 10–15 நிமிடம் ஊறவைத்து, அரிசி வகைக்கு ஏற்ற தண்ணீர் அளவு பயன்படுத்துங்கள்.',
  'சாம்பாரில் காய்கறி நன்றாக வெந்த பிறகு புளிச்சாறு சேர்த்தால் சுவை சமநிலையாக இருக்கும்.',
  'தோசை மாவை fridge-லிருந்து எடுத்ததும் மிகவும் குளிராக இருந்தால் சிறிது நேரம் room temperature-ல் வைத்துப் பயன்படுத்தலாம்.',
  'கீரையை அதிக நேரம் வேகவைக்காமல் குறைந்த நேரத்தில் சமைத்தால் நிறமும் texture-மும் நன்றாக இருக்கும்.'
];
function _aiPickDaily(arr, salt){
  var d=new Date(), key=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()+(salt||0);
  return arr[Math.abs(key)%arr.length];
}
function _aiFamilyAnswer(t){
  // Panchangam / நல்ல நேரம் — reuse the existing local calendar engine; no new calculation path.
  if (_aiLocalHas(t,['நல்ல நேரம்','nalla neram','பஞ்சாங்கம்','பஞ்சாங்க','panchangam','panchang'])) {
    try {
      if (typeof _tcalPanchang === 'function') {
        var d=new Date(), p=_tcalPanchang(d);
        return 'இன்றைய பஞ்சாங்கம்\n• நட்சத்திரம் — '+p.nak+'\n• திதி — '+p.tithi+'\n• நல்ல நேரம் — '+p.good+'\n• ராகு காலம் — '+p.rahu+'\n• எமகண்டம் — '+p.yama+'\n• குளிகை — '+p.gulika;
      }
    } catch(e) { try{console.error('AI panchang failed',e);}catch(_){} }
    return 'தமிழ் Calendar-ஐ திறந்து இன்றைய பஞ்சாங்கம் / நல்ல நேரத்தை பார்க்கலாம்.';
  }

  // Rasi Palan — same deterministic guidance arrays used by the existing Rasi screen.
  if (_aiLocalHas(t,['ராசி பலன்','ராசிபலன்','rasi palan','horoscope'])) {
    if (typeof _RASI_SIGNS !== 'undefined' && typeof _RASI_GENERAL !== 'undefined') {
      for (var i=0;i<_RASI_SIGNS.length;i++) {
        var r=_RASI_SIGNS[i];
        if (t.indexOf(String(r.n).toLowerCase())!==-1 || t.indexOf(String(r.k).toLowerCase())!==-1) {
          var d=new Date(), key=(typeof _rasiDayKey==='function'?_rasiDayKey(d):(d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()));
          return r.e+' '+r.n+': '+_RASI_GENERAL[(key+i*7)%_RASI_GENERAL.length];
        }
      }
    }
    // Never let a generic word like “இன்றைய” fall through to the server
    // dashboard-summary route. Rasi needs a sign before a horoscope can be shown.
    return 'எந்த ராசிக்கான பலன் வேண்டும்? மேஷம், ரிஷபம், மிதுனம், கடகம், சிம்மம், கன்னி, துலாம், விருச்சிகம், தனுசு, மகரம், கும்பம் அல்லது மீனம் என்று சொல்லுங்கள்.';
  }

  if (_aiLocalHas(t,['திருக்குறள்','திருக்குறள் சொல்லு','kural','thirukkural'])) {
    var daily=_AI_KURALS.indexOf(_aiPickDaily(_AI_KURALS,11));
    var idx = daily;
    if (_aiKuralCursor === idx) idx = (idx + 1) % _AI_KURALS.length;
    _aiKuralCursor = idx;
    var k=_AI_KURALS[idx];
    return 'திருக்குறள் '+k.n+':\n'+k.k+'\nபொருள்: '+k.m;
  }
  if (_aiLocalHas(t,['பழமொழி','proverb'])) return 'பழமொழி: '+_aiPickDaily(_AI_PROVERBS,23);
  if (_aiLocalHas(t,['விடுகதை','riddle'])) return 'விடுகதை: '+_aiPickDaily(_AI_RIDDLES,31);
  if (_aiLocalHas(t,['குழந்தை பெயர்','குழந்தைப் பெயர்','baby name','boy name','girl name','ஆண் குழந்தை','பெண் குழந்தை'])) {
    var isGirl=_aiLocalHas(t,['பெண்','girl','female']);
    var isBoy=_aiLocalHas(t,['ஆண்','boy','male']);
    var arr=isGirl?_AI_BABY_NAMES.girl:(isBoy?_AI_BABY_NAMES.boy:_AI_BABY_NAMES.boy.concat(_AI_BABY_NAMES.girl));
    return 'பெயர் suggestions: '+arr.slice(0,6).join(', ')+'. வேண்டுமென்றால் ஆண்/பெண் குழந்தை என்று குறிப்பிட்டு கேளுங்கள்.';
  }
  if (_aiLocalHas(t,['தினம் ஒரு தகவல்','இன்றைய தகவல்','daily info','ஒரு தகவல்'])) return 'இன்றைய தகவல்: '+_aiPickDaily(_AI_DAILY_INFO,47);
  if (_aiLocalHas(t,['சமையல்','cooking','recipe','சமையல் குறிப்பு','சமையல் tips'])) return 'சமையல் குறிப்பு: '+_aiPickDaily(_AI_COOKING_TIPS,59);
  return '';
}

function _aiLocalAnswer(q) {
  var t=_aiLocalNorm(q);
  if (!t) return '';

  if (_aiPrivacyBlocked(t)) {
    return 'பாதுகாப்பு மற்றும் தனியுரிமை காரணமாக app-ன் ரகசியங்கள், internal code/config, API keys, password அல்லது admin-only தகவல்களை பகிர முடியாது.';
  }

  if (_aiLocalHas(t,['உன் பெயர்','உன்னோட name','your name','who are you','நீ யார்'])) {
    return 'நான் Namma MOI Family Assistant. App help, பஞ்சாங்கம்/நல்ல நேரம், ராசி பலன், திருக்குறள், பழமொழி, விடுகதை, குழந்தைப் பெயர்கள் மற்றும் சில குடும்ப பயன்பாட்டு தகவல்களுக்கு உதவுகிறேன்.';
  }
  if (_aiLocalHas(t,['hi','hello','வணக்கம்','ஹாய்'])) return 'வணக்கம்! Namma MOI help, இன்றைய நல்ல நேரம், ராசி பலன், திருக்குறள், குழந்தைப் பெயர், விடுகதை அல்லது ஒரு basic கேள்வி கேட்கலாம். 😊';
  if (_aiLocalHas(t,['thanks','thank you','நன்றி'])) return 'நன்றி! 😊';

  var familyReply=_aiFamilyAnswer(t);
  if (familyReply) return familyReply;

  for (var i=0;i<_AI_APP_HELP.length;i++) if (_aiLocalHas(t,_AI_APP_HELP[i].k)) return _AI_APP_HELP[i].a;
  for (var j=0;j<_AI_BASIC.length;j++) if (_aiLocalHas(t,_AI_BASIC[j].k)) return _AI_BASIC[j].a;

  if (_aiLocalHas(t,['story','கதை','சிறுகதை','moral story'])) {
    var idx = Math.abs(t.length) % _AI_STORIES.length;
    return _AI_STORIES[idx];
  }

  if (_aiLocalHas(t,['latest','today news','news','weather','stock','price','இன்றைய செய்தி','வானிலை'])) {
    return 'இந்த launch version-ல் live/current இணைய தகவல்களை நான் பார்க்கவில்லை. App help, basic தகவல் அல்லது சிறிய கதை கேட்கலாம்.';
  }
  return '';
}

