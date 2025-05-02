# Expense Management Web App

## Overview

This is a simple, client-side web application designed for managing personal expenses. It uses your Google Account for authentication and stores all expense and category data directly within a Google Sheet file (`ExpenseApp_Data`) in your Google Drive.

## Features

*   **Google Sign-In:** Secure authentication using your existing Google Account via Google Identity Services (GIS).
*   **Expense Management:** Create, Read, Update, and Delete (CRUD) operations for your expenses.
*   **Category Management:** CRUD operations for expense categories via a dedicated Admin panel.
*   **Dashboard:** View expense analytics, including:
    *   Month-to-Date (MTD) Total
    *   Year-to-Date (YTD) Monthly Totals
    *   Month-to-Date (MTD) Totals by Category
*   **Dashboard Filtering:** Filter analytics data by Year, Month, and Category.
*   **Google Sheets Integration:** Automatically finds or creates a Google Sheet named `ExpenseApp_Data` in your Google Drive to use as the data store. All data interactions happen via the Google Drive and Google Sheets APIs.

## Technical Stack

*   **Frontend:** HTML, CSS, Vanilla JavaScript (ES6+)
*   **Authentication:** Google Identity Services (GIS)
*   **APIs:** Google Drive API v3, Google Sheets API v4

## Project Structure

```
/
├── index.html          # Main application page
├── css/
│   └── style.css       # Stylesheet
└── js/
    ├── config.js       # Configuration
    ├── auth.js         # Google Sign-In/Out logic
    ├── gapi_handler.js # Interactions with Google Drive/Sheets APIs
    ├── ui_manager.js   # Functions for updating the UI and handling view logic
    ├── analytics.js    # Functions for calculating dashboard metrics
    └── main.js         # Main application orchestration, event handling
```

## Setup and Deployment

### Prerequisites

*   A Google Account.

### 1. Google Cloud Configuration

Before deploying or running the application, you need to configure Google Cloud Platform to enable the necessary APIs and obtain an OAuth 2.0 Client ID:

1.  **Create/Select Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project or select an existing one.
2.  **Enable APIs:**
    *   Navigate to **APIs & Services > Library**.
    *   Search for and enable the **Google Drive API**.
    *   Search for and enable the **Google Sheets API**.
3.  **Configure OAuth Consent Screen:**
    *   Navigate to **APIs & Services > OAuth consent screen**.
    *   Choose **External** user type.
    *   Fill in the required application details (App name, User support email, Developer contact information).
    *   **Scopes:** Click **Add or Remove Scopes**. Add the following scopes:
        *   `https://www.googleapis.com/auth/drive.file` (Allows the app to create/access the specific spreadsheet it uses)
        *   `https://www.googleapis.com/auth/spreadsheets` (Allows the app to read/write data to the spreadsheet)
    *   Click **Update** and then **Save and Continue** through the rest of the consent screen setup (you likely don't need test users unless required by Google).
4.  **Create OAuth Client ID:**
    *   Navigate to **APIs & Services > Credentials**.
    *   Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
    *   Select **Web application** as the Application type.
    *   Give it a name (e.g., "Expense App Client").
    *   **Authorized JavaScript origins:** This is crucial. You **must** add the exact URL where your application will be hosted. Examples:
        *   For local testing: `http://localhost:8080` (or whichever port you use)
        *   For deployment: `https://your-domain.com` or `https://your-app.netlify.app`
        *   *Do not add a trailing slash unless specifically required.*
    *   **Authorized redirect URIs:** Usually not required for this GIS setup, but you can add the same URLs as the origins if you encounter issues.
    *   Click **Create**.
5.  **Copy Client ID:** After creation, copy the **Client ID** value. You will need this for the application configuration.

### 2. Application Configuration

1.  Open the `js/config.js` file in the project code.
2.  Find the line `const CLIENT_ID = "...";`.
3.  Replace the placeholder string with the **Client ID** you copied from the Google Cloud Console.
4.  Save the file.

### 3. Deployment

This is a static web application. You need to host the project files (`index.html`, `css/`, `js/`) on a web server or static hosting provider.

1.  **Choose Hosting:** Select a hosting provider (e.g., Netlify, Vercel, GitHub Pages, AWS S3, Google Cloud Storage, or any standard web server).
2.  **Upload Files:** Upload the entire project folder structure (including the modified `js/config.js`) to your hosting provider's designated directory.
3.  **Configure Hosting:** Ensure your hosting is configured to serve `index.html` as the default page.
4.  **Verify Google Cloud Origin:** Double-check that the final public URL provided by your hosting service is listed under **Authorized JavaScript origins** for your OAuth Client ID in the Google Cloud Console (Step 1.4 above). Allow a few minutes for changes to propagate if you just added it.

### 4. Local Development (Optional)

To run the app locally for testing:

1.  Ensure you have configured `js/config.js` with your Client ID.
2.  Ensure you have added the appropriate local origin (e.g., `http://localhost:8080`) to your Authorized JavaScript origins in Google Cloud.
3.  Navigate to the project's root directory in your terminal.
4.  Start a simple local web server. If you have Python 3 installed, you can use:
    ```bash
    python -m http.server 8080 --bind 0.0.0.0
    ```
5.  Open your web browser and go to `http://localhost:8080`.

## Usage

1.  **Sign In:** Access the application URL. Click the Google Sign-In button and authenticate with the Google Account associated with the configured Client ID.
2.  **Grant Permissions:** If prompted, grant the application permission to access your Google Drive files (specifically the one it creates/uses) and Google Sheets.
3.  **Navigate:** Use the navigation buttons (Expenses, Dashboard, Admin) to switch between views.
4.  **Manage Expenses:** In the "Expenses" view, add, edit, or delete expense records. Select categories from the dropdown.
5.  **Manage Categories:** In the "Admin" view, add, edit, or delete expense categories. Note: You cannot delete a category if it's currently assigned to an expense.
6.  **View Dashboard:** In the "Dashboard" view, see calculated analytics. Use the filters (Year, Month, Category) and click "Apply Filters" to update the displayed data.

## Google Sheet Data Store

*   The application will automatically look for or create a Google Sheet named **`ExpenseApp_Data`** in the root directory of the authenticated user's Google Drive.
*   This sheet contains two tabs: **`Expenses`** and **`Categories`**.
*   The application reads from and writes directly to this sheet.