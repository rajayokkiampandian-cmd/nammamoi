
  // ══════ Dashboard mirror (presentational only, matches mockup screen 03) ══════
  // Copies/derives values from data the app has ALREADY fetched via its
  // existing calls (#hdrUser text, #todayCards totals, and the in-memory
  // recs[] array populated by the existing loadData()) into the greeting
  // row and the four stat cards. Read-only DOM mirroring + simple client-
  // side arithmetic on already-loaded MOI data. Daily Cash summary is fetched
  // on demand for the selected range and cached until that range changes.
  // No business logic or database structure is changed.
  (function(){
    function greetWord(){
      var h = new Date().getHours();
      return h < 12 ? '☀️ காலை வணக்கம்' : (h < 17 ? '🙏 வணக்கம்' : '🌙 மாலை வணக்கம்');
    }
    var _dashExpenseKey = '';
    var _dashExpenseLoading = false;
    function _d2(n){ return String(n).padStart(2,'0'); }
    function _dateStr(d){ return d.getFullYear()+'-'+_d2(d.getMonth()+1)+'-'+_d2(d.getDate()); }
    function _dashboardGetRange(){
      var sel = document.getElementById('dashRange');
      var type = sel ? sel.value : 'month';
      var now = new Date(), from, to;
      if (type === 'today') {
        from = to = _dateStr(now);
      } else if (type === 'week') {
        var wd = now.getDay(), mondayOffset = wd === 0 ? -6 : 1-wd;
        var ws = new Date(now.getFullYear(),now.getMonth(),now.getDate()+mondayOffset);
        var we = new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+6);
        from = _dateStr(ws); to = _dateStr(we);
      } else if (type === 'lastmonth') {
        var lm = new Date(now.getFullYear(),now.getMonth()-1,1);
        from = _dateStr(lm); to = _dateStr(new Date(lm.getFullYear(),lm.getMonth()+1,0));
      } else if (type === 'year') {
        var yEl = document.getElementById('dashYear');
        var y = Number(yEl && yEl.value) || now.getFullYear();
        from = y+'-01-01'; to = y+'-12-31';
      } else if (type === 'custom') {
        var f = document.getElementById('dashFrom'), t = document.getElementById('dashTo');
        from = f && f.value ? f.value : _dateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        to = t && t.value ? t.value : _dateStr(now);
      } else {
        var mEl = document.getElementById('dashMonth');
        var ym = (mEl && /^\d{4}-\d{2}$/.test(mEl.value)) ? mEl.value : (now.getFullYear()+'-'+_d2(now.getMonth()+1));
        var parts = ym.split('-'), yy = Number(parts[0]), mm = Number(parts[1]);
        from = ym+'-01';
        to = _dateStr(new Date(yy, mm, 0));
      }
      if (from > to) { var swap = from; from = to; to = swap; }
      return {type:type, from:from, to:to};
    }
    function _dashboardLoadExpense(range, el){
      if (!el || typeof google === 'undefined' || !google.script || !google.script.run) return;
      var key = range.type+'|'+range.from+'|'+range.to;
      if (_dashExpenseKey === key || _dashExpenseLoading) return;
      _dashExpenseLoading = true; el.textContent = '…';
      var monthFilter = range.type === 'month' ? range.from.substring(0,7) : '';
      google.script.run.withSuccessHandler(function(res){
        _dashExpenseLoading = false; _dashExpenseKey = key;
        if (!res || !res.ok) { el.textContent = res && res.locked ? '🔒' : '—'; return; }
        el.textContent = '₹' + fmt(Number(res.total)||0);
      }).withFailureHandler(function(err){
        _dashExpenseLoading = false; console.error('Dashboard expense summary failed', err); el.textContent = '—';
      }).getExpenseSummary(monthFilter, monthFilter ? '' : range.from, monthFilter ? '' : range.to);
    }
    function _dashboardInitPickers(){
      var now = new Date();
      var m = document.getElementById('dashMonth');
      var y = document.getElementById('dashYear');
      if (m && !m.value) m.value = now.getFullYear()+'-'+_d2(now.getMonth()+1);
      if (y && !y.value) y.value = now.getFullYear();
    }
    window.dashboardSetRange = function(mode){
      var sel=document.getElementById('dashRange'); if(sel) sel.value=mode;
      dashboardRangeChanged();
    };
    window.dashboardRangeChanged = function(){
      _dashboardInitPickers();
      var sel = document.getElementById('dashRange');
      var mode = sel ? sel.value : 'month';
      var month = document.getElementById('dashMonthRange');
      var year = document.getElementById('dashYearRange');
      var custom = document.getElementById('dashCustomRange');
      if (month) month.style.display = mode === 'month' ? 'flex' : 'none';
      if (year) year.style.display = mode === 'year' ? 'flex' : 'none';
      if (custom) custom.style.display = mode === 'custom' ? 'flex' : 'none';
      document.querySelectorAll('.dash-range-chips [data-range]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-range')===mode);});
      if (mode !== 'custom') { _dashExpenseKey = ''; sync(); }
    };
    window.dashboardApplyPickerRange = function(){ _dashExpenseKey = ''; sync(); };
    window.dashboardApplyCustomRange = function(){ _dashExpenseKey = ''; sync(); };
    _dashboardInitPickers();
    // Dashboard drill-downs must preserve the exact range shown on the card.
    // Reuse the existing MOI/Expense filters; no calculation/backend changes.
    window.dashboardOpenMoiRange = function(mode){
      var range = _dashboardGetRange();
      var fromEl = document.getElementById('af_from');
      var toEl = document.getElementById('af_to');
      var modeEl = document.getElementById('modeF');
      if (fromEl) fromEl.value = range.from;
      if (toEl) toEl.value = range.to;
      if (modeEl) modeEl.value = mode || '';
      go('all');
    };
    window.dashboardOpenFutureMoi = function(){
      if (typeof _openReminderPanelFocus === 'function') _openReminderPanelFocus();
      else if (typeof toggleReminderPanel === 'function') toggleReminderPanel();
    };
    window.dashboardOpenHandLoans = function(){
      selectApp('expense');
      expGo('list');
      // V272: the current Daily Cash filter control is txnFilterSelect and the
      // single source of truth is setTxnFilter(). The old txnFilterType id no
      // longer exists, so the dashboard strip previously opened the list but
      // silently left it on "All". Route through the live filter API instead.
      setTimeout(function(){
        if (typeof setTxnFilter === 'function') setTxnFilter('handloan');
        else {
          if (typeof _txnFilter !== 'undefined') _txnFilter = 'handloan';
          if (typeof renderTransactionList === 'function') renderTransactionList();
        }
      },80);
    };
    window.dashboardOpenExpenseRange = function(){
      var range = _dashboardGetRange();
      selectApp('expense');
      _summaryRangeMode = 'custom';
      _summaryRangeStart = range.from;
      _summaryRangeEnd = range.to;
      var period = document.getElementById('summaryPeriodSelect');
      var custom = document.getElementById('summaryCustomRange');
      var fromEl = document.getElementById('summaryRangeFrom');
      var toEl = document.getElementById('summaryRangeTo');
      var monthEl = document.getElementById('expSummaryMonth');
      if (period) period.value = 'custom';
      if (custom) custom.style.display = 'grid';
      if (fromEl) fromEl.value = range.from;
      if (toEl) toEl.value = range.to;
      if (monthEl) monthEl.value = '';
      expGo('summary');
    };
    // Daily Cash writes can invalidate the dashboard's range-key cache without
    // touching dashboard calculations or forcing an immediate network call.
    window.invalidateDashboardExpenseCache = function(){ _dashExpenseKey = ''; };
    function _dashboardInsightText(c, range){
      c = c || {};
      var balance = Number(c.periodBalance)||0;
      var future = Number(c.futureMoiTotal)||0;
      var expense = Number(c.expenseTotal)||0;
      var given = Number(c.seimuraiTotal)||0;
      var income = Number(c.incomeTotal)||0;
      var activeLoans = Number(c.activeHandLoanCount)||0;
      var isEn = (typeof UI_LANG !== 'undefined' && UI_LANG === 'en');
      var periodTa = range && range.type === 'year' ? 'இந்த ஆண்டு' : (range && range.type === 'custom' ? 'தேர்ந்த காலத்தில்' : 'இந்த மாதம்');
      var periodEn = range && range.type === 'year' ? 'This year' : (range && range.type === 'custom' ? 'In the selected period' : 'This month');
      if (future > 0 && balance >= 0) {
        if (future > balance) {
          var gap = future - balance;
          return {tone:'warn', text:isEn
            ? 'Upcoming MOI is ₹'+fmt(future)+', which is ₹'+fmt(gap)+' more than the current period balance. Plan ahead.'
            : 'வரவிருக்கும் மொய் ₹'+fmt(future)+' — தற்போதைய கால மீதியை விட ₹'+fmt(gap)+' அதிகம். முன்பே திட்டமிடுங்கள்.'};
        }
        var after = balance - future;
        return {tone:'good', text:isEn
          ? 'After setting aside ₹'+fmt(future)+' for upcoming MOI, about ₹'+fmt(after)+' remains from this period.'
          : 'வரவிருக்கும் மொய்க்கு ₹'+fmt(future)+' ஒதுக்கிய பிறகும் இந்த காலத்தில் சுமார் ₹'+fmt(after)+' மீதியாக இருக்கும்.'};
      }
      if (balance < 0) {
        return {tone:'warn', text:isEn
          ? periodEn+' outflows are ₹'+fmt(Math.abs(balance))+' above inflows. Review expenses and planned payments.'
          : periodTa+' வரவை விட வெளியேற்றம் ₹'+fmt(Math.abs(balance))+' அதிகம். செலவு மற்றும் திட்டமிட்ட பணப்பரிவர்த்தனைகளை பாருங்கள்.'};
      }
      if (expense > 0 && income > 0) {
        var pct = Math.round((expense / income) * 100);
        return {tone:pct > 80 ? 'warn' : 'neutral', text:isEn
          ? periodEn+' expenses are about '+pct+'% of regular income.'
          : 'வருமானத்தில் செலவு: '+pct+'%' };
      }
      if (given > 0) {
        return {tone:'neutral', text:isEn
          ? periodEn+' MOI given totals ₹'+fmt(given)+'. Upcoming MOI planning can be viewed separately.'
          : periodTa+' செய்முறை ₹'+fmt(given)+'. வரவிருக்கும் மொய் திட்டத்தை தனியாக பார்க்கலாம்.'};
      }
      if (activeLoans > 0) {
        return {tone:'neutral', text:isEn
          ? activeLoans+' active hand-loan record'+(activeLoans===1?'':'s')+' need follow-up.'
          : activeLoans+' கைமாற்று நிலுவை பதிவு'+(activeLoans===1?'':'கள்')+' follow-up தேவை.'};
      }
      return null;
    }
    function _dashboardRenderInsight(c, range){
      var box=document.getElementById('dashSmartInsight');
      var txt=document.getElementById('dashSmartInsightText');
      if(!box||!txt)return;
      var insight=_dashboardInsightText(c,range);
      if(!insight){ box.style.display='none'; txt.textContent=''; box.removeAttribute('data-tone'); return; }
      txt.textContent=insight.text;
      box.setAttribute('data-tone', insight.tone || 'neutral');
      box.style.display='flex';
    }
    window.refreshDashboardPlanningInsight=function(){
      if(window._dashPlanCache && window._dashPlanCache.res) _dashboardRenderInsight(window._dashPlanCache.res,_dashboardGetRange());
    };
    function sync(){
      var u = document.getElementById('hdrUser');
      var hi = document.getElementById('dashGreetHi');
      var av = document.getElementById('dashAvatar');
      if (u && hi && u.textContent.trim()) {
        var t = u.textContent.replace(/^Admin\s*/,'').trim();
        hi.textContent = greetWord() + (t ? ', ' + t : '') + ' 👋';
        if (av && t) av.textContent = t.charAt(0).toUpperCase();
      } else if (hi) {
        hi.textContent = greetWord() + ' 👋';
      }

      var range = _dashboardGetRange();
      var labelGiven = document.getElementById('dashLabelGiven');
      var labelExpense = document.getElementById('dashLabelExpense');
      var labelBalance = document.getElementById('dashLabelBalance');
      // V283: range chips already communicate period; keep card labels native-app short.
      if (labelGiven) { var lg=labelGiven.querySelector('.dash-label-text'); if(lg) lg.textContent='செய்முறை'; }
      if (labelExpense) { var le=labelExpense.querySelector('.dash-label-text'); if(le) le.textContent='செலவு'; }
      if (labelBalance) { var lb=labelBalance.querySelector('.dash-label-text'); if(lb) lb.textContent='மீதி'; }
      var sGiven = document.getElementById('dashStatGiven');
      var sFuture= document.getElementById('dashStatFutureMoi');
      var sExp   = document.getElementById('dashStatExpense');
      var sBal   = document.getElementById('dashStatBalance');
      var hStrip = document.getElementById('dashHandLoanStrip');
      var hVal   = document.getElementById('dashHandLoanValue');
      var fMeta  = document.getElementById('dashFutureMoiMeta');
      var planKey = range.from + '|' + range.to;
      if (window._dashPlanLoadingKey === planKey) return;
      if (window._dashPlanCache && window._dashPlanCache.key === planKey) {
        var c=window._dashPlanCache.res;
        if (sGiven) animateStatText(sGiven,'₹'+fmt(c.seimuraiTotal||0));
        if (sFuture) animateStatText(sFuture,'₹'+fmt(c.futureMoiTotal||0));
        if (sExp) animateStatText(sExp,'₹'+fmt(c.expenseTotal||0));
        if (sBal) animateStatText(sBal,(Number(c.periodBalance)<0?'−₹':'₹')+fmt(Math.abs(Number(c.periodBalance)||0)));
        if (fMeta) fMeta.textContent=(c.futureMoiCount||0)>0 ? ((c.futureMoiCount||0)+' திட்டம்') : '';
        if (hStrip) hStrip.style.display=(c.activeHandLoanCount||0)>0?'flex':'none';
        if (hVal) hVal.textContent='கொடுத்தது ₹'+fmt(c.activeHandGiven||0)+' · வாங்கியது ₹'+fmt(c.activeHandReceived||0);
        _dashboardRenderInsight(c, range);
        return;
      }
      window._dashPlanLoadingKey=planKey;
      [sGiven,sFuture,sExp,sBal].forEach(function(el){ if(el){ el.textContent=''; el.classList.add('skeleton','dash-stat-skeleton'); } });
      google.script.run.withSuccessHandler(function(c){
        window._dashPlanLoadingKey='';
        [sGiven,sFuture,sExp,sBal].forEach(function(el){ if(el) el.classList.remove('skeleton','dash-stat-skeleton'); });
        if(!c||!c.ok)return;
        window._dashPlanCache={key:planKey,res:c};
        sync();
      }).withFailureHandler(function(){
        window._dashPlanLoadingKey='';
        [sGiven,sFuture,sExp,sBal].forEach(function(el){ if(el){ el.classList.remove('skeleton','dash-stat-skeleton'); el.textContent='—'; } });
      }).getDashboardPlanningSummary(range.from,range.to);
    }
    sync();
    ['hdrUser','todayCards'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) new MutationObserver(sync).observe(el, {childList:true, subtree:true, characterData:true});
    });
    // PERF RC2: MutationObserver above already refreshes immediately when
    // user/data text changes. Keep only a lightweight clock fallback for
    // greeting/day rollover, and do no dashboard work while the page is hidden.
    setInterval(function(){
      if (document.visibilityState === 'visible') sync();
    }, 60000);
  })();
  