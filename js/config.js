/* ==========================================================================
   NAMMAMOI — config.js
   Single source of truth for CONFIG. Loaded BEFORE app.js on every page
   (see the <script> order in each .html file) — app.js reads this CONFIG,
   it does not declare its own anymore, so there is no more "Identifier
   'CONFIG' has already been declared" error.
   ========================================================================== */

const CONFIG = {
  API_URL:    "https://script.google.com/macros/s/AKfycbwFBG_27pA63PX34iR5zBEAfyT6Kxk8BaTEuHvN7bf_Av90kXtDBji7B9zczdTg4StN/exec",
  LOGIN_URL:  "",   // e.g. CONFIG.API_URL + "?action=login"
  SAVE_URL:   "",   // record create/update endpoint
  SEARCH_URL: "",   // record search / autocomplete endpoint
  REPORT_URL: "",   // PDF/Excel report generation endpoint
  APP_URL:    "https://script.google.com/macros/s/AKfycbwFBG_27pA63PX34iR5zBEAfyT6Kxk8BaTEuHvN7bf_Av90kXtDBji7B9zczdTg4StN/exec"
};
