/* ==========================================================================
   NAMMAMOI — app.js
   App-level config + interactive components: FAQ accordion, dashboard
   showcase tabs, contact form submission, help-page live search.

   Paste your Google Apps Script Web App URLs below — nothing in this
   project is hardcoded against a live backend yet.
   ========================================================================== */

/* CONFIG now lives in js/config.js, loaded before this file on every page.
   Do not redeclare `const CONFIG` here — a second declaration throws
   "Identifier 'CONFIG' has already been declared" and silently breaks
   every script on the page (login, menu, animations, everything). */

(function () {
  'use strict';

  /* ---------- FAQ ACCORDION ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-q');
    if (!question) return;
    question.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      // Close siblings for a single-open accordion feel
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !wasOpen);
      question.setAttribute('aria-expanded', (!wasOpen).toString());
      var answer = item.querySelector('.faq-a');
      answer.style.maxHeight = !wasOpen ? answer.scrollHeight + 'px' : null;
    });
  });

  /* ---------- DASHBOARD SHOWCASE TABS ---------- */
  var showcaseTabs = document.querySelectorAll('.showcase-tab');
  var showcasePanels = document.querySelectorAll('[data-showcase-panel]');
  if (showcaseTabs.length && showcasePanels.length) {
    showcaseTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        showcaseTabs.forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        var target = tab.getAttribute('data-target');
        showcasePanels.forEach(function (panel) {
          panel.style.display = (panel.getAttribute('data-showcase-panel') === target) ? 'grid' : 'none';
        });
      });
    });
  }

  /* ---------- Header/nav "உள்நுழைய" links — skip the interstitial ---------- */
  // Once CONFIG.APP_URL is set, every login link across the site (header
  // button + mobile menu item) points straight at the app — no more
  // stopping at login.html just to click one more button. If APP_URL isn't
  // configured yet, these links keep their default href="login.html",
  // which explains how to set it up.
  if (CONFIG.APP_URL) {
    document.querySelectorAll('.js-app-link').forEach(function (el) {
      el.setAttribute('href', CONFIG.APP_URL);
    });
  }

  /* ---------- LOGIN PAGE — single button, hands off to the real app ---------- */
  var setupNote = document.getElementById('setupNote');
  if (setupNote) {
    setupNote.style.display = CONFIG.APP_URL ? 'none' : '';
  }

  // If someone lands on login.html directly (bookmark, old link, etc.) and
  // the app link is already configured, forward them immediately instead
  // of making them click a second button.
  var loginCard = document.querySelector('.login-card');
  if (loginCard && CONFIG.APP_URL) {
    var noteBox = document.getElementById('loginNote');
    if (noteBox) {
      noteBox.textContent = '↪️ பயன்பாட்டிற்கு அழைத்துச் செல்கிறோம்...';
      noteBox.classList.add('show');
    }
    setTimeout(function () { window.location.href = CONFIG.APP_URL; }, 350);
  }

  // The real username/password check happens inside your Apps Script app
  // (it already has its own login screen) — this is the ONLY login step on
  // the marketing site, so people are never asked twice. Once you paste
  // your link into CONFIG.APP_URL (js/config.js), this button takes people
  // straight to it (and, per above, most people won't even see this page).
  var openAppBtn = document.querySelector('.login-card');
  if (openAppBtn) {
    openAppBtn.addEventListener('click', function () {
      var noteBox = document.getElementById('loginNote');
      if (!CONFIG.APP_URL) {
        if (noteBox) {
          noteBox.textContent = '⚠️ இன்னும் இணைப்பு கட்டமைக்கப்படவில்லை. js/config.js கோப்பில் CONFIG.APP_URL-ஐ நிரப்பவும்.';
          noteBox.classList.add('show', 'is-warning');
        }
        return;
      }
      openAppBtn.disabled = true;
      openAppBtn.textContent = 'அழைத்துச் செல்கிறது...';
      window.location.href = CONFIG.APP_URL;
    });
  }

  /* ---------- CONTACT FORM ---------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var successBox = document.getElementById('formSuccess');
      var submitBtn = contactForm.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = 'அனுப்புகிறது...';

      // Wire this up to CONFIG.API_URL (or a dedicated contact endpoint)
      // once the Apps Script URL is available. Local-only confirmation
      // is shown for now so the form is fully testable offline.
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        if (successBox) {
          successBox.classList.add('show');
          successBox.setAttribute('role', 'status');
        }
        contactForm.reset();
      }, 700);
    });
  }

  /* ---------- HELP PAGE — LIVE FAQ/TOPIC SEARCH ---------- */
  var helpSearch = document.getElementById('helpSearchInput');
  if (helpSearch) {
    var helpItems = document.querySelectorAll('[data-help-keywords]');
    helpSearch.addEventListener('input', function () {
      var q = helpSearch.value.trim().toLowerCase();
      var anyVisible = false;
      helpItems.forEach(function (item) {
        var haystack = item.getAttribute('data-help-keywords').toLowerCase() + ' ' + item.textContent.toLowerCase();
        var match = !q || haystack.indexOf(q) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      var emptyState = document.getElementById('helpEmptyState');
      if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'block';
    });
  }

})();
