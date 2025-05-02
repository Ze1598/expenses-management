const CLIENT_ID = "";
const API_KEY = ""; // API Key is generally not needed for user-specific data access via OAuth

// Scopes required by the application
// drive.file: Access files created or opened by the app.
// spreadsheets: View and manage your spreadsheets in Google Drive.
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

// Discovery Docs for Google APIs
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", "https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Names for the Google Sheet and specific sheets within it
const SPREADSHEET_FILENAME = "ExpenseApp_Data";
const EXPENSES_SHEET_NAME = "Expenses";
const CATEGORIES_SHEET_NAME = "Categories";

