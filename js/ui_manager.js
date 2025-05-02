// --- State Variables --- 
let currentExpenses = [];
let currentCategories = [];

// --- UI Element References --- 
const appContainer = document.getElementById("app-container");
const authContainer = document.getElementById("auth-container");
const googleSignInButton = document.getElementById("google-signin-button");
const signOutButton = document.getElementById("signout-button");
const userInfoDisplay = document.getElementById("user-info");

const expenseListView = document.getElementById("expenses-view");
const dashboardView = document.getElementById("dashboard-view");
const adminView = document.getElementById("admin-view");
const views = [expenseListView, dashboardView, adminView];

const expenseListDiv = document.getElementById("expense-list");
const categoryListDiv = document.getElementById("category-list");

const expenseFormContainer = document.getElementById("expense-form-container");
const expenseForm = document.getElementById("expense-form");
const expenseIdInput = document.getElementById("expense-id");
const expenseDescriptionInput = document.getElementById("expense-description");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDateInput = document.getElementById("expense-date");
const expenseCategorySelect = document.getElementById("expense-category");

const categoryFormContainer = document.getElementById("category-form-container");
const categoryForm = document.getElementById("category-form");
const categoryIdInput = document.getElementById("category-id");
const categoryNameInput = document.getElementById("category-name");

const dashboardContent = document.getElementById("dashboard-content");
const filterYearSelect = document.getElementById("filter-year");
const filterMonthSelect = document.getElementById("filter-month");
const filterCategorySelect = document.getElementById("filter-category");
const mtdTotalDiv = document.getElementById("mtd-total");
const ytdTotalsDiv = document.getElementById("ytd-totals");
const mtdByCategoryDiv = document.getElementById("mtd-by-category");

// --- UI Update Functions --- 

/**
 * Updates the UI based on the user's sign-in status.
 * @param {boolean} isSignedIn True if the user is signed in, false otherwise.
 * @param {object|null} userProfile User profile information from Google (optional).
 */
function updateSignInStatus(isSignedIn, userProfile = null) {
    if (isSignedIn) {
        console.log("Updating UI for signed-in state.");
        authContainer.classList.add("signed-in");
        googleSignInButton.style.display = "none";
        signOutButton.style.display = "block";
        appContainer.style.display = "block"; // Show the main app content
        if (userProfile && userProfile.name) {
            userInfoDisplay.textContent = `Welcome, ${userProfile.name}`;
            userInfoDisplay.style.display = "inline";
        } else {
             userInfoDisplay.textContent = `Welcome!`
             userInfoDisplay.style.display = "inline";
        }
        showView("expenses-view"); // Default view after sign-in
    } else {
        console.log("Updating UI for signed-out state.");
        authContainer.classList.remove("signed-in");
        googleSignInButton.style.display = "block";
        signOutButton.style.display = "none";
        userInfoDisplay.style.display = "none";
        appContainer.style.display = "none"; // Hide the main app content
        // Clear dynamic content
        expenseListDiv.innerHTML = "<p>Please sign in to view expenses.</p>";
        categoryListDiv.innerHTML = "<p>Please sign in to manage categories.</p>";
        dashboardContent.innerHTML = "<p>Please sign in to view the dashboard.</p>";
    }
}

/**
 * Shows the specified view and hides others.
 * @param {string} viewId The ID of the view section to show.
 */
function showView(viewId) {
    console.log(`Switching to view: ${viewId}`);
    views.forEach(view => {
        if (view.id === viewId) {
            view.style.display = "block";
        } else {
            view.style.display = "none";
        }
    });
    // Reset forms when switching views
    hideExpenseForm();
    hideCategoryForm();
    // Trigger data refresh if needed for the specific view
    if (viewId === "dashboard-view") {
        populateDashboardFilters(); // Ensure filters are up-to-date
        displayDashboardData(); // Calculate and display initial dashboard data
    }
     if (viewId === "admin-view") {
        displayCategories(currentCategories); // Ensure categories are displayed
    }
     if (viewId === "expenses-view") {
        displayExpenses(currentExpenses); // Ensure expenses are displayed
        populateCategoryDropdown(currentCategories); // Ensure dropdown is populated
    }
}

/**
 * Populates the category dropdown in the expense form.
 * @param {Array<object>} categories Array of category objects.
 */
function populateCategoryDropdown(categories) {
    expenseCategorySelect.innerHTML = 
        categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join("");
    // Also populate the dashboard filter dropdown
    filterCategorySelect.innerHTML = 
        `<option value="all">All Categories</option>` + 
        categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join("");
}

/**
 * Displays the list of expenses in the UI.
 * @param {Array<object>} expenses Array of expense objects.
 */
function displayExpenses(expenses) {
    console.log(`Displaying ${expenses.length} expenses.`);
    if (expenses.length === 0) {
        expenseListDiv.innerHTML = "<p>No expenses found. Add one!</p>";
        return;
    }
    expenseListDiv.innerHTML = expenses.map(exp => `
        <div data-id="${exp.id}">
            <span>
                <strong>${exp.description}</strong> - $${exp.amount.toFixed(2)} 
                (${exp.date}) - [${exp.category}]
            </span>
            <span class="expense-actions">
                <button onclick="editExpense(\'${exp.id}\')">Edit</button>
                <button onclick="deleteExpenseHandler(\'${exp.id}\')">Delete</button>
            </span>
        </div>
    `).join("");
}

/**
 * Displays the list of categories in the Admin view.
 * @param {Array<object>} categories Array of category objects.
 */
function displayCategories(categories) {
    console.log(`Displaying ${categories.length} categories.`);
     if (categories.length === 0) {
        categoryListDiv.innerHTML = "<p>No categories found. Add one!</p>";
        return;
    }
    categoryListDiv.innerHTML = categories.map(cat => `
        <div data-id="${cat.id}">
            <span>${cat.name}</span>
            <span class="category-actions">
                <button onclick="editCategory(\'${cat.id}\')">Edit</button>
                <button onclick="deleteCategoryHandler(\'${cat.id}\')">Delete</button>
            </span>
        </div>
    `).join("");
}

/**
 * Shows the expense form, optionally pre-filling it for editing.
 * @param {object|null} expenseToEdit The expense object to edit, or null for adding.
 */
function showExpenseForm(expenseToEdit = null) {
    expenseForm.reset(); // Clear previous entries
    populateCategoryDropdown(currentCategories); // Ensure dropdown is up-to-date
    if (expenseToEdit) {
        expenseIdInput.value = expenseToEdit.id;
        expenseDescriptionInput.value = expenseToEdit.description;
        expenseAmountInput.value = expenseToEdit.amount;
        expenseDateInput.value = expenseToEdit.date; // Assumes date is in YYYY-MM-DD format
        expenseCategorySelect.value = expenseToEdit.category;
        expenseFormContainer.querySelector("h3").textContent = "Edit Expense";
    } else {
        expenseIdInput.value = ""; // Clear ID for new expense
        expenseDateInput.valueAsDate = new Date(); // Default to today
        expenseFormContainer.querySelector("h3").textContent = "Add New Expense";
    }
    expenseFormContainer.style.display = "block";
    document.getElementById("show-add-expense-form-btn").style.display = "none";
}

/**
 * Hides the expense form.
 */
function hideExpenseForm() {
    expenseForm.reset();
    expenseIdInput.value = "";
    expenseFormContainer.style.display = "none";
    document.getElementById("show-add-expense-form-btn").style.display = "block";
}

/**
 * Shows the category form, optionally pre-filling it for editing.
 * @param {object|null} categoryToEdit The category object to edit, or null for adding.
 */
function showCategoryForm(categoryToEdit = null) {
    categoryForm.reset();
    if (categoryToEdit) {
        categoryIdInput.value = categoryToEdit.id;
        categoryNameInput.value = categoryToEdit.name;
        categoryFormContainer.querySelector("h3").textContent = "Edit Category";
    } else {
        categoryIdInput.value = "";
        categoryFormContainer.querySelector("h3").textContent = "Add New Category";
    }
    categoryFormContainer.style.display = "block";
    document.getElementById("show-add-category-form-btn").style.display = "none";
}

/**
 * Hides the category form.
 */
function hideCategoryForm() {
    categoryForm.reset();
    categoryIdInput.value = "";
    categoryFormContainer.style.display = "none";
    document.getElementById("show-add-category-form-btn").style.display = "block";
}

/**
 * Populates the filter dropdowns in the dashboard.
 */
function populateDashboardFilters() {
    // Populate Year Filter (e.g., last 5 years + current year)
    const currentYear = new Date().getFullYear();
    let yearOptions = "";
    for (let i = 0; i < 5; i++) {
        yearOptions += `<option value="${currentYear - i}">${currentYear - i}</option>`;
    }
    filterYearSelect.innerHTML = yearOptions;
    filterYearSelect.value = currentYear; // Default to current year

    // Populate Month Filter
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    filterMonthSelect.innerHTML = 
        `<option value="all">All Months</option>` + 
        months.map((month, index) => `<option value="${index + 1}">${month}</option>`).join("");
    filterMonthSelect.value = "all"; // Default to all months

    // Category filter is populated by populateCategoryDropdown
}

/**
 * Displays the calculated analytics data on the dashboard.
 * @param {object} analyticsData Object containing calculated metrics.
 */
function displayDashboardAnalytics(analyticsData) {
    console.log("Displaying dashboard analytics:", analyticsData);
    dashboardContent.innerHTML = ""; // Clear previous data or loading message

    // MTD Total
    mtdTotalDiv.innerHTML = `<h3>Month-to-Date Total:</h3><p>$${analyticsData.mtdTotal.toFixed(2)}</p>`;
    dashboardContent.appendChild(mtdTotalDiv);

    // YTD Monthly Totals
    let ytdHtml = "<h3>Year-to-Date Monthly Totals:</h3><ul>";
    const sortedMonths = Object.keys(analyticsData.ytdMonthlyTotals).sort((a, b) => parseInt(a) - parseInt(b));
    if (sortedMonths.length > 0) {
         sortedMonths.forEach(month => {
            ytdHtml += `<li>Month ${month}: $${analyticsData.ytdMonthlyTotals[month].toFixed(2)}</li>`;
        });
    } else {
        ytdHtml += "<li>No expenses found for the selected year.</li>";
    }
    ytdHtml += "</ul>";
    ytdTotalsDiv.innerHTML = ytdHtml;
    dashboardContent.appendChild(ytdTotalsDiv);

    // MTD by Category
    let mtdCatHtml = "<h3>Month-to-Date by Category:</h3><ul>";
    const sortedCategories = Object.keys(analyticsData.mtdByCategory).sort();
     if (sortedCategories.length > 0) {
        sortedCategories.forEach(category => {
            mtdCatHtml += `<li>${category}: $${analyticsData.mtdByCategory[category].toFixed(2)}</li>`;
        });
    } else {
         mtdCatHtml += "<li>No expenses found for the selected month/year.</li>";
    }
    mtdCatHtml += "</ul>";
    mtdByCategoryDiv.innerHTML = mtdCatHtml;
    dashboardContent.appendChild(mtdByCategoryDiv);
}

/**
 * Shows a loading indicator in a specific container.
 * @param {HTMLElement} container The container element.
 * @param {string} message Loading message.
 */
function showLoading(container, message = "Loading...") {
    container.innerHTML = `<p>${message}</p>`;
}

/**
 * Shows an error message in a specific container.
 * @param {HTMLElement} container The container element.
 * @param {string} errorMessage The error message to display.
 */
function showError(container, errorMessage) {
    container.innerHTML = `<p style="color: red;">Error: ${errorMessage}</p>`;
}

// --- Event Handlers (to be called from main.js or HTML) ---

// These functions find the relevant data and call showExpenseForm/showCategoryForm
function editExpense(expenseId) {
    const expense = currentExpenses.find(exp => exp.id === expenseId);
    if (expense) {
        showExpenseForm(expense);
    } else {
        console.error(`Expense with ID ${expenseId} not found for editing.`);
    }
}

function editCategory(categoryId) {
    const category = currentCategories.find(cat => cat.id === categoryId);
    if (category) {
        showCategoryForm(category);
    } else {
        console.error(`Category with ID ${categoryId} not found for editing.`);
    }
}

// These will be implemented in main.js to call the GAPI handler and update UI
// function handleExpenseFormSubmit(event) { ... }
// function handleCategoryFormSubmit(event) { ... }
// function deleteExpenseHandler(expenseId) { ... }
// function deleteCategoryHandler(categoryId) { ... }
// function applyDashboardFilters() { ... }

