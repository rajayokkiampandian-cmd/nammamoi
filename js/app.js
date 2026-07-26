/* ==========================================================================
   NAMMAMOI — app.js
   App-level config + interactive components: FAQ accordion, dashboard
   showcase tabs, contact form submission, help-page live search.

   Paste your Google Apps Script Web App URLs below — nothing in this
   project is hardcoded against a live backend yet.
   ========================================================================== */

const CONFIG = {
  API_URL:    "",   // Apps Script Web App base URL
  LOGIN_URL:  "",   // e.g. CONFIG.API_URL + "?action=login"
  SAVE_URL:   "",   // record create/update endpoint
  SEARCH_URL: "",   // record search / autocomplete endpoint
  REPORT_URL: ""    // PDF/Excel report generation endpoint
};

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
