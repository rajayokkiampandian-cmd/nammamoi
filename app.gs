/* =========================================================================
   NammaMoi — app.js
   Central configuration for the Google Apps Script backend.
   Paste your deployed Web App URLs below. Nothing is hardcoded elsewhere;
   every network call in this project reads from CONFIG.
   ========================================================================= */

const CONFIG = {
  API_URL:    "",   // Base Apps Script Web App URL, e.g. https://script.google.com/macros/s/XXXX/exec
  LOGIN_URL:  "",   // Login / auth endpoint
  SAVE_URL:   "",   // Save a moi record
  SEARCH_URL: "",   // Search records
  REPORT_URL: "",   // Generate / fetch reports
  CONTACT_URL: ""   // Optional: contact form submission endpoint
};

/**
 * NammaMoiAPI — a thin wrapper around fetch() for talking to the Apps
 * Script backend. All functions resolve to a plain object of the shape
 * { ok: boolean, data?: any, error?: string }, and never throw, so callers
 * can handle failures gracefully in the UI.
 */
const NammaMoiAPI = (() => {

  async function post(url, payload) {
    if (!url) {
      return { ok: false, error: "இந்த சேவை இணைக்கப்படவில்லை (endpoint not configured)." };
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids GAS CORS preflight
        body: JSON.stringify(payload || {})
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || "Network error" };
    }
  }

  return {
    login: (credentials) => post(CONFIG.LOGIN_URL || CONFIG.API_URL, { action: "login", ...credentials }),
    saveRecord: (record) => post(CONFIG.SAVE_URL || CONFIG.API_URL, { action: "save", ...record }),
    search: (query) => post(CONFIG.SEARCH_URL || CONFIG.API_URL, { action: "search", ...query }),
    getReport: (params) => post(CONFIG.REPORT_URL || CONFIG.API_URL, { action: "report", ...params }),
    sendContactMessage: (fields) => post(CONFIG.CONTACT_URL || CONFIG.API_URL, { action: "contact", ...fields })
  };
})();

/* Expose for other scripts / console debugging without leaking globals we don't need */
window.CONFIG = CONFIG;
window.NammaMoiAPI = NammaMoiAPI;
