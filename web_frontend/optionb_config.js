/* Namma MOI v296 — Option B frontend configuration
 * Fill these values after creating the standard Google Cloud OAuth client
 * and the Apps Script API Executable deployment.
 */
window.NAMMAMOI_OPTION_B = {
  // OAuth 2.0 Web client ID from the SAME standard Google Cloud project
  // used by the Apps Script project. Example: 123...apps.googleusercontent.com
CLIENT_ID: '485579350441-tnb42vqu2h6dfguurlo7vpoese48fbmd.apps.googleusercontent.com',
  
  // Apps Script API Executable deployment ID (Deploy > New deployment > API Executable).
SCRIPT_DEPLOYMENT_ID: 'AKfycbzAbsKKNZ1hXjqb24D8rrXOATndrWhfVUSqr9jYtPbE-EVb9B_zbV1LqIBelAwrsqvG',
  // Copy EVERY scope shown in Apps Script > Overview > Project OAuth scopes.
  // Keep openid/email so the frontend can establish the Google identity.
  OAUTH_SCOPES: [
  'openid',
  'email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/script.send_mail',
  'https://www.googleapis.com/auth/script.scriptapp',
  'https://www.googleapis.com/auth/script.locale',
  'https://www.googleapis.com/auth/script.container.ui',
  'https://www.googleapis.com/auth/documents'
],

  // Production own-domain URL. Add this as an Authorized JavaScript origin
  // in the OAuth Web client.
  PUBLIC_APP_URL: 'https://www.nammamoi.in',
  DEV_MODE: false
};
