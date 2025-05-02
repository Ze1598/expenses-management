// Global variable to store the spreadsheet ID once found/created
let SPREADSHEET_ID = null;

/**
 * Finds an existing Google Sheet by name or creates a new one if not found.
 * @param {string} fileName The name of the spreadsheet file.
 * @returns {Promise<string>} A promise that resolves with the spreadsheet ID.
 */
async function findOrCreateSheet(fileName) {
    if (SPREADSHEET_ID) {
        console.log(`Using cached Spreadsheet ID: ${SPREADSHEET_ID}`);
        return SPREADSHEET_ID;
    }

    console.log(`Searching for spreadsheet: ${fileName}`);
    let response;
    try {
        // Search for the file in Google Drive
        response = await gapi.client.drive.files.list({
            q: `name=\'${fileName}\' and mimeType=\'application/vnd.google-apps.spreadsheet\' and trashed=false and \'me\' in owners`,
            fields: "files(id, name)",
        });
    } catch (err) {
        console.error("Error searching for spreadsheet:", err);
        throw new Error(`Error searching for spreadsheet: ${err.result?.error?.message || err.message}`);
    }

    const files = response.result.files;
    if (files && files.length > 0) {
        // File found
        SPREADSHEET_ID = files[0].id;
        console.log(`Spreadsheet found with ID: ${SPREADSHEET_ID}`);
        // Optional: Verify sheet names exist, create if not? (Add later if needed)
        return SPREADSHEET_ID;
    } else {
        // File not found, create it
        console.log("Spreadsheet not found, creating new one...");
        try {
            response = await gapi.client.sheets.spreadsheets.create({}, {
                properties: {
                    title: fileName
                },
                sheets: [
                    { properties: { title: EXPENSES_SHEET_NAME } }, // Create Expenses sheet
                    { properties: { title: CATEGORIES_SHEET_NAME } } // Create Categories sheet
                ]
            });

            SPREADSHEET_ID = response.result.spreadsheetId;
            console.log(`Spreadsheet created with ID: ${SPREADSHEET_ID}`);

            // Add header rows to the newly created sheets
            await setupInitialSheetHeaders(SPREADSHEET_ID);

            return SPREADSHEET_ID;
        } catch (err) {
            console.error("Error creating spreadsheet:", err);
            throw new Error(`Error creating spreadsheet: ${err.result?.error?.message || err.message}`);
        }
    }
}

/**
 * Adds header rows to the Expenses and Categories sheets.
 * @param {string} spreadsheetId The ID of the spreadsheet.
 */
async function setupInitialSheetHeaders(spreadsheetId) {
    console.log("Setting up initial sheet headers...");
    const requests = [
        {
            // Expenses Header
            range: `${EXPENSES_SHEET_NAME}!A1:E1`,
            values: [["ID", "Description", "Amount", "Date", "Category"]]
        },
        {
            // Categories Header
            range: `${CATEGORIES_SHEET_NAME}!A1:B1`,
            values: [["ID", "Name"]]
        }
    ];

    try {
        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                valueInputOption: "USER_ENTERED",
                data: requests
            }
        });
        console.log("Initial sheet headers added successfully.");
    } catch (err) {
        console.error("Error adding initial sheet headers:", err);
        // Don't throw error here, creation succeeded, headers are just a setup step
    }
}


/**
 * Retrieves all categories from the Categories sheet.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of category objects.
 */
async function getCategories() {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available. Call findOrCreateSheet first.");
    console.log("Fetching categories...");
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${CATEGORIES_SHEET_NAME}!A2:B`, // Start from row 2 to skip header
        });
        const values = response.result.values || [];
        const categories = values.map(row => ({ id: row[0], name: row[1] }));
        console.log(`Fetched ${categories.length} categories.`);
        return categories;
    } catch (err) {
        console.error("Error fetching categories:", err);
        throw new Error(`Error fetching categories: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Retrieves all expenses from the Expenses sheet.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of expense objects.
 */
async function getExpenses() {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available. Call findOrCreateSheet first.");
    console.log("Fetching expenses...");
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${EXPENSES_SHEET_NAME}!A2:E`, // Start from row 2 to skip header
        });
        const values = response.result.values || [];
        const expenses = values.map(row => ({
            id: row[0],
            description: row[1],
            amount: parseFloat(row[2]) || 0, // Handle potential parsing errors
            date: row[3], // Keep as string for now, parsing/formatting in UI/Analytics
            category: row[4]
        }));
        console.log(`Fetched ${expenses.length} expenses.`);
        return expenses;
    } catch (err) {
        console.error("Error fetching expenses:", err);
        throw new Error(`Error fetching expenses: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Adds a new category to the Categories sheet.
 * @param {object} categoryObject An object with the category details (e.g., { name: 'Groceries' }).
 * @returns {Promise<object>} A promise that resolves with the result of the append operation.
 */
async function addCategory(categoryObject) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available. Call findOrCreateSheet first.");
    console.log("Adding category:", categoryObject);
    const newId = self.crypto.randomUUID();
    const rowData = [
        newId,
        categoryObject.name
    ];
    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${CATEGORIES_SHEET_NAME}!A:B`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            resource: {
                values: [rowData]
            }
        });
        console.log("Category added successfully:", response.result);
        // Return the newly created category object with its ID
        return { id: newId, name: categoryObject.name }; 
    } catch (err) {
        console.error("Error adding category:", err);
        throw new Error(`Error adding category: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Adds a new expense to the Expenses sheet.
 * @param {object} expenseObject An object with the expense details (e.g., { description: 'Milk', amount: 3.50, date: '2025-05-01', category: 'Groceries' }).
 * @returns {Promise<object>} A promise that resolves with the result of the append operation.
 */
async function addExpense(expenseObject) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available. Call findOrCreateSheet first.");
    console.log("Adding expense:", expenseObject);
    const newId = self.crypto.randomUUID();
    const rowData = [
        newId,
        expenseObject.description,
        expenseObject.amount,
        expenseObject.date, // Assuming date is already formatted as a string
        expenseObject.category
    ];
    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${EXPENSES_SHEET_NAME}!A:E`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            resource: {
                values: [rowData]
            }
        });
        console.log("Expense added successfully:", response.result);
         // Return the newly created expense object with its ID
        return { ...expenseObject, id: newId };
    } catch (err) {
        console.error("Error adding expense:", err);
        throw new Error(`Error adding expense: ${err.result?.error?.message || err.message}`);
    }
}

// --- Placeholder functions for Update/Delete --- 
// These require finding the row index, which is complex client-side.
// Implementing the simpler (less efficient) read-then-write strategy for now.

/**
 * Finds the row index for a given ID in a specified sheet.
 * @param {string} sheetName The name of the sheet (e.g., EXPENSES_SHEET_NAME).
 * @param {number} idColumnIndex The 0-based index of the column containing the ID.
 * @param {string} idToFind The ID to search for.
 * @returns {Promise<number>} The 1-based row index, or -1 if not found.
 */
async function findRowIndexById(sheetName, idColumnIndex, idToFind) {
    console.log(`Finding row index for ID ${idToFind} in sheet ${sheetName}`);
    try {
        // Read only the ID column to minimize data transfer
        const idColumnLetter = String.fromCharCode('A'.charCodeAt(0) + idColumnIndex);
        const range = `${sheetName}!${idColumnLetter}2:${idColumnLetter}`;
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });
        const values = response.result.values || [];
        for (let i = 0; i < values.length; i++) {
            if (values[i][0] === idToFind) {
                const rowIndex = i + 2; // +1 for 0-based index, +1 because we started reading from row 2
                console.log(`ID ${idToFind} found at row ${rowIndex}`);
                return rowIndex; 
            }
        }
        console.log(`ID ${idToFind} not found in sheet ${sheetName}`);
        return -1; // Not found
    } catch (err) {
        console.error(`Error finding row index for ID ${idToFind}:`, err);
        throw new Error(`Error finding row index: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Updates an existing expense in the Expenses sheet.
 * @param {string} expenseId The ID of the expense to update.
 * @param {object} updatedExpenseObject The object containing updated expense data.
 * @returns {Promise<object>} A promise that resolves with the result of the update operation.
 */
async function updateExpense(expenseId, updatedExpenseObject) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available.");
    console.log(`Updating expense ID: ${expenseId}`, updatedExpenseObject);
    
    const rowIndex = await findRowIndexById(EXPENSES_SHEET_NAME, 0, expenseId); // ID is in column 0 (A)
    if (rowIndex === -1) {
        throw new Error(`Expense with ID ${expenseId} not found for update.`);
    }

    const range = `${EXPENSES_SHEET_NAME}!A${rowIndex}:E${rowIndex}`; // Update the entire row
    const rowData = [
        expenseId, // Keep the original ID
        updatedExpenseObject.description,
        updatedExpenseObject.amount,
        updatedExpenseObject.date,
        updatedExpenseObject.category
    ];

    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [rowData]
            }
        });
        console.log("Expense updated successfully:", response.result);
        return response.result;
    } catch (err) {
        console.error("Error updating expense:", err);
        throw new Error(`Error updating expense: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Updates an existing category in the Categories sheet.
 * @param {string} categoryId The ID of the category to update.
 * @param {object} updatedCategoryObject The object containing updated category data (e.g., { name: 'New Name' }).
 * @returns {Promise<object>} A promise that resolves with the result of the update operation.
 */
async function updateCategory(categoryId, updatedCategoryObject) {
     if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available.");
    console.log(`Updating category ID: ${categoryId}`, updatedCategoryObject);
    
    const rowIndex = await findRowIndexById(CATEGORIES_SHEET_NAME, 0, categoryId); // ID is in column 0 (A)
    if (rowIndex === -1) {
        throw new Error(`Category with ID ${categoryId} not found for update.`);
    }

    const range = `${CATEGORIES_SHEET_NAME}!A${rowIndex}:B${rowIndex}`; // Update the entire row
    const rowData = [
        categoryId, // Keep the original ID
        updatedCategoryObject.name
    ];

    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [rowData]
            }
        });
        console.log("Category updated successfully:", response.result);
        return response.result;
    } catch (err) {
        console.error("Error updating category:", err);
        throw new Error(`Error updating category: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Helper function to get the numerical sheetId (gid) for a given sheet name.
 * Required for batchUpdate operations like deleteDimension.
 * @param {string} sheetName The name of the sheet.
 * @returns {Promise<number>} The numerical sheet ID (gid).
 */
async function getSheetGidByName(sheetName) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available.");
    console.log(`Getting GID for sheet: ${sheetName}`);
    try {
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets(properties(title,sheetId))'
        });
        const sheets = response.result.sheets;
        const foundSheet = sheets.find(sheet => sheet.properties.title === sheetName);
        if (foundSheet) {
            console.log(`Found GID ${foundSheet.properties.sheetId} for sheet ${sheetName}`);
            return foundSheet.properties.sheetId;
        } else {
            throw new Error(`Sheet with name '${sheetName}' not found.`);
        }
    } catch (err) {
        console.error(`Error getting GID for sheet ${sheetName}:`, err);
        throw new Error(`Error getting sheet GID: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Deletes an expense row from the Expenses sheet using batchUpdate.
 * @param {string} expenseId The ID of the expense to delete.
 * @returns {Promise<object>} A promise that resolves with the result of the batchUpdate operation.
 */
async function deleteExpense(expenseId) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available.");
    console.log(`Deleting expense ID: ${expenseId}`);

    const rowIndex = await findRowIndexById(EXPENSES_SHEET_NAME, 0, expenseId); // ID is in column 0 (A)
    if (rowIndex === -1) {
        throw new Error(`Expense with ID ${expenseId} not found for deletion.`);
    }

    const sheetGid = await getSheetGidByName(EXPENSES_SHEET_NAME);

    const deleteRequest = {
        deleteDimension: {
            range: {
                sheetId: sheetGid,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-indexed
                endIndex: rowIndex
            }
        }
    };

    try {
        const response = await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [deleteRequest]
            }
        });
        console.log("Expense deleted successfully:", response.result);
        return response.result;
    } catch (err) {
        console.error("Error deleting expense:", err);
        throw new Error(`Error deleting expense: ${err.result?.error?.message || err.message}`);
    }
}

/**
 * Deletes a category row from the Categories sheet using batchUpdate.
 * @param {string} categoryId The ID of the category to delete.
 * @returns {Promise<object>} A promise that resolves with the result of the batchUpdate operation.
 */
async function deleteCategory(categoryId) {
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID not available.");
    console.log(`Deleting category ID: ${categoryId}`);

    const rowIndex = await findRowIndexById(CATEGORIES_SHEET_NAME, 0, categoryId); // ID is in column 0 (A)
    if (rowIndex === -1) {
        throw new Error(`Category with ID ${categoryId} not found for deletion.`);
    }

    const sheetGid = await getSheetGidByName(CATEGORIES_SHEET_NAME);

    const deleteRequest = {
        deleteDimension: {
            range: {
                sheetId: sheetGid,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-indexed
                endIndex: rowIndex
            }
        }
    };

    try {
        const response = await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [deleteRequest]
            }
        });
        console.log("Category deleted successfully:", response.result);
        return response.result;
    } catch (err) {
        console.error("Error deleting category:", err);
        throw new Error(`Error deleting category: ${err.result?.error?.message || err.message}`);
    }
}

