let tokenClient;
let gapiInited = false;
let gisInited = false;

document.addEventListener('DOMContentLoaded', function() {
    // Gis Library Load
    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = gisLoaded;
    document.body.appendChild(scriptGis);

    // Gapi Library Load
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = gapiLoaded;
    document.body.appendChild(scriptGapi);
});

/**
 * Callback after the GIS library is loaded.
 */
function gisLoaded() {
    console.log("GIS library loaded.");
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse, // Defined below
    });
    gisInited = true;
    maybeEnableAuthButtons();
    // Render the Sign-In button
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse // Defined below
    });
    google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large' } // Customize button appearance
    );
    // Prompt for consent on initial load if needed (optional)
    // google.accounts.id.prompt();
}

/**
 * Callback after the GAPI library is loaded.
 */
function gapiLoaded() {
    console.log("GAPI library loaded.");
    gapi.load('client', initializeGapiClient);
}

/**
 * Initializes the GAPI client library.
 * Will be called automatically after the GAPI library loads.
 */
async function initializeGapiClient() {
    console.log("Initializing GAPI client...");
    await gapi.client.init({
        // NOTE: API Key is generally not needed for OAuth2 flows accessing user data
        // apiKey: API_KEY, 
        discoveryDocs: DISCOVERY_DOCS,
    });
    console.log("GAPI client initialized.");
    gapiInited = true;
    maybeEnableAuthButtons();
}

/**
 * Callback that handles the response from the GIS token client.
 * This is called when requesting specific scopes via tokenClient.requestAccessToken().
 */
function handleTokenResponse(resp) {
    if (resp.error) {
        console.error('Error getting access token:', resp.error);
        updateSignInStatus(false);
        // Potentially show error to user
        return;
    }
    console.log('Access Token received (handleTokenResponse).');
    // GAPI client should now have the token implicitly
    // You can now make GAPI calls
    updateSignInStatus(true);
    // Trigger initial data load or other actions needed after auth
    onAuthenticated(); // Call function in main.js
}

/**
 * Callback that handles the response from the Google Sign-In button click (credential response).
 */
function handleCredentialResponse(response) {
    console.log("Credential response received (handleCredentialResponse).");
    // The ID token is in response.credential
    // For this client-side app, we don't strictly need to verify the ID token on a backend.
    // We primarily use this flow to establish the user session.
    // The crucial step is to get the access token for API calls.

    // We need to request the scopes defined in SCOPES using the token client.
    // This might trigger a consent screen if the user hasn't granted permissions before.
    requestAccessToken();
}

/**
 * Requests an access token for the defined scopes.
 */
function requestAccessToken() {
    console.log("Requesting access token...");
    // Prompt the user to select a Google Account and grant access if required
    // Ensure necessary scopes are requested
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Attempts to enable the Sign-In/Sign-Out buttons once both GAPI and GIS libraries are loaded.
 */
function maybeEnableAuthButtons() {
    if (gapiInited && gisInited) {
        console.log("Both GAPI and GIS initialized. Auth buttons should be functional.");
        // Potentially enable UI elements that depend on these libraries
        // The sign-in button is rendered by GIS itself.
        // We might enable a sign-out button here if needed.
        document.getElementById('signout-button').disabled = false; // Assuming a signout button exists
    }
}

/**
 * Signs the user out.
 */
function handleSignOutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        console.log("Signing out...");
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Access token revoked.');
            gapi.client.setToken(null);
            // Update UI
            updateSignInStatus(false);
            // Clear any stored user data
            clearUserData(); // Call function in main.js or ui_manager.js
        });
        // Also disable GIS auto-select for next time
        google.accounts.id.disableAutoSelect();
    }
}

// Helper to update UI based on sign-in status (implementation likely in ui_manager.js)
// function updateSignInStatus(isSignedIn) { ... }

// Placeholder for triggering actions after successful authentication (in main.js)
// function onAuthenticated() { ... }

// Placeholder for clearing user data on sign-out (in main.js or ui_manager.js)
// function clearUserData() { ... }

