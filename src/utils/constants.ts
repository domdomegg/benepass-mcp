// Hardcoded Benepass endpoints + the public OAuth client_id used by their
// employee-web app. None of these are secrets — they're discoverable from any
// browser session. They're also not expected to change without us shipping a
// new version of this package, so they don't need to be env-configurable.
export const CLIENT_ID = '6l7jeu4r44kgndgeab4aot355m';
export const COGNITO_IDP_URL = 'https://cognito-idp.us-east-1.amazonaws.com/';
export const COGNITO_TOKEN_URL = 'https://cognito.benefitsapi.com/oauth2/token';
export const API_BASE_URL = 'https://api.benefitsapi.com';
