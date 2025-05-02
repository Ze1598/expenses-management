// --- Application Initialization --- 

/**
 * Function called by auth.js after successful authentication and token acquisition.
 */
async function onAuthenticated() {
    console.log("Authentication successful. Initializing application...");
    updateSignInStatus(true); // Update UI to signed-in state
    showLoading(expenseListDiv, "Initializing...");
    showLoading(categoryListDiv, "Initializing...");
    showLoading(dashboardContent, "Initializing...");

    try {
        // 1. Find or create the spreadsheet
        await findOrCreateSheet(SPREADSHEET_FILENAME);
        console.log("Spreadsheet ready.");

        // 2. Fetch initial data (categories first, then expenses)
        await loadInitialData();

        // 3. Populate UI elements that depend on initial data
        populateDashboardFilters(); // Needs categories
        showView("expenses-view"); // Show default view, which will trigger displayExpenses/populateCategoryDropdown

        console.log("Application initialized successfully.");

    } catch (error) {
        console.error("Error during application initialization:", error);
        showError(appContainer, `Initialization failed: ${error.message}. Please try refreshing.`);
        // Optionally sign the user out if initialization fails critically
        // handleSignOutClick(); 
    }
}

/**
 * Fetches initial categories and expenses from the Google Sheet.
 */
async function loadInitialData() {
    console.log("Loading initial data...");
    showLoading(expenseListDiv, "Loading categories...");
    showLoading(categoryListDiv, "Loading categories...");
    try {
        currentCategories = await getCategories();
        displayCategories(currentCategories); // Update admin view list
        populateCategoryDropdown(currentCategories); // Update expense form dropdown & dashboard filter

        showLoading(expenseListDiv, "Loading expenses...");
        currentExpenses = await getExpenses();
        displayExpenses(currentExpenses); // Update expense view list

        console.log("Initial data loaded.");
    } catch (error) {
        console.error("Error loading initial data:", error);
        showError(expenseListDiv, `Error loading data: ${error.message}`);
        showError(categoryListDiv, `Error loading data: ${error.message}`);
        // Rethrow the error to be caught by the caller (onAuthenticated)
        throw error; 
    }
}

/**
 * Function called by auth.js when the user signs out.
 */
function clearUserData() {
    console.log("Clearing user data on sign out.");
    currentExpenses = [];
    currentCategories = [];
    SPREADSHEET_ID = null; // Reset spreadsheet ID
    // UI is cleared by updateSignInStatus(false) in ui_manager.js
}

// --- Event Handlers --- 

/**
 * Handles the submission of the expense form (Add or Edit).
 * @param {Event} event The form submission event.
 */
async function handleExpenseFormSubmit(event) {
    event.preventDefault();
    console.log("Handling expense form submit...");
    const expenseId = expenseIdInput.value;
    const expenseData = {
        description: expenseDescriptionInput.value,
        amount: parseFloat(expenseAmountInput.value),
        date: expenseDateInput.value, // Already in YYYY-MM-DD format
        category: expenseCategorySelect.value
    };

    if (isNaN(expenseData.amount)) {
        alert("Invalid amount entered.");
        return;
    }

    showLoading(expenseListDiv, expenseId ? "Updating expense..." : "Adding expense...");
    hideExpenseForm();

    try {
        let updatedExpense;
        if (expenseId) {
            // Update existing expense
            await updateExpense(expenseId, expenseData);
            updatedExpense = { ...expenseData, id: expenseId }; // Assume success, create local representation
            // Update local state
            const index = currentExpenses.findIndex(exp => exp.id === expenseId);
            if (index !== -1) {
                currentExpenses[index] = updatedExpense;
            }
        } else {
            // Add new expense
            updatedExpense = await addExpense(expenseData); // GAPI handler returns the new expense with ID
            // Update local state
            currentExpenses.push(updatedExpense);
        }
        console.log("Expense saved successfully.");
        displayExpenses(currentExpenses); // Refresh the list
        // Optionally refresh dashboard if visible
        if (dashboardView.style.display === "block") {
            displayDashboardData();
        }
    } catch (error) {
        console.error("Error saving expense:", error);
        showError(expenseListDiv, `Error saving expense: ${error.message}`);
        // Re-display the potentially old list if loading failed
        displayExpenses(currentExpenses);
    }
}

/**
 * Handles the submission of the category form (Add or Edit).
 * @param {Event} event The form submission event.
 */
async function handleCategoryFormSubmit(event) {
    event.preventDefault();
    console.log("Handling category form submit...");
    const categoryId = categoryIdInput.value;
    const categoryData = {
        name: categoryNameInput.value
    };

    if (!categoryData.name) {
        alert("Category name cannot be empty.");
        return;
    }

    // Prevent duplicate category names (case-insensitive check)
    const existingCategory = currentCategories.find(
        cat => cat.name.toLowerCase() === categoryData.name.toLowerCase() && cat.id !== categoryId
    );
    if (existingCategory) {
        alert(`Category "${categoryData.name}" already exists.`);
        return;
    }

    showLoading(categoryListDiv, categoryId ? "Updating category..." : "Adding category...");
    hideCategoryForm();

    try {
        let updatedCategory;
        if (categoryId) {
            // Update existing category
            await updateCategory(categoryId, categoryData);
            updatedCategory = { ...categoryData, id: categoryId };
            // Update local state
            const index = currentCategories.findIndex(cat => cat.id === categoryId);
            if (index !== -1) {
                currentCategories[index] = updatedCategory;
            }
        } else {
            // Add new category
            updatedCategory = await addCategory(categoryData);
            // Update local state
            currentCategories.push(updatedCategory);
        }
        console.log("Category saved successfully.");
        displayCategories(currentCategories); // Refresh the admin list
        populateCategoryDropdown(currentCategories); // Refresh dropdowns
         // Optionally refresh dashboard if visible
        if (dashboardView.style.display === "block") {
            displayDashboardData();
        }
    } catch (error) {
        console.error("Error saving category:", error);
        showError(categoryListDiv, `Error saving category: ${error.message}`);
        // Re-display the potentially old list
        displayCategories(currentCategories);
    }
}

/**
 * Handles clicking the delete button for an expense.
 * @param {string} expenseId The ID of the expense to delete.
 */
async function deleteExpenseHandler(expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }
    console.log(`Handling delete for expense ID: ${expenseId}`);
    showLoading(expenseListDiv, "Deleting expense...");

    try {
        await deleteExpense(expenseId);
        // Update local state
        currentExpenses = currentExpenses.filter(exp => exp.id !== expenseId);
        console.log("Expense deleted successfully.");
        displayExpenses(currentExpenses); // Refresh the list
         // Optionally refresh dashboard if visible
        if (dashboardView.style.display === "block") {
            displayDashboardData();
        }
    } catch (error) {
        console.error("Error deleting expense:", error);
        showError(expenseListDiv, `Error deleting expense: ${error.message}`);
        // Re-display the potentially old list
        displayExpenses(currentExpenses);
    }
}

/**
 * Handles clicking the delete button for a category.
 * @param {string} categoryId The ID of the category to delete.
 */
async function deleteCategoryHandler(categoryId) {
     // Check if category is in use by any expense
    const isCategoryInUse = currentExpenses.some(exp => exp.category === currentCategories.find(cat => cat.id === categoryId)?.name);
    if (isCategoryInUse) {
        alert("Cannot delete category because it is currently assigned to one or more expenses. Please reassign or delete those expenses first.");
        return;
    }

    if (!confirm("Are you sure you want to delete this category?")) {
        return;
    }
    console.log(`Handling delete for category ID: ${categoryId}`);
    showLoading(categoryListDiv, "Deleting category...");

    try {
        await deleteCategory(categoryId);
        // Update local state
        currentCategories = currentCategories.filter(cat => cat.id !== categoryId);
        console.log("Category deleted successfully.");
        displayCategories(currentCategories); // Refresh the admin list
        populateCategoryDropdown(currentCategories); // Refresh dropdowns
         // Optionally refresh dashboard if visible
        if (dashboardView.style.display === "block") {
            displayDashboardData();
        }
    } catch (error) {
        console.error("Error deleting category:", error);
        showError(categoryListDiv, `Error deleting category: ${error.message}`);
        // Re-display the potentially old list
        displayCategories(currentCategories);
    }
}

/**
 * Reads filter values, calculates analytics, and displays them on the dashboard.
 */
function displayDashboardData() {
    console.log("Updating dashboard data...");
    showLoading(dashboardContent, "Calculating analytics...");
    const filters = {
        year: filterYearSelect.value,
        month: filterMonthSelect.value,
        category: filterCategorySelect.value
    };

    try {
        const analyticsData = calculateAnalytics(currentExpenses, filters);
        displayDashboardAnalytics(analyticsData);
    } catch (error) {
        console.error("Error displaying dashboard data:", error);
        showError(dashboardContent, `Error calculating or displaying analytics: ${error.message}`);
    }
}

/**
 * Handler for the 'Apply Filters' button on the dashboard.
 */
function applyDashboardFilters() {
    displayDashboardData();
}

// --- Initial Setup --- 
// Add event listeners or initial calls if needed, although most logic
// is triggered by the authentication flow (onAuthenticated).
console.log("main.js loaded. Waiting for GAPI/GIS initialization...");

