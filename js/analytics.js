/**
 * Calculates various analytics based on expenses and filters.
 * @param {Array<object>} expensesData Array of expense objects.
 * @param {object} filters Object containing filter criteria (year, month, category).
 * @returns {object} An object containing calculated analytics (mtdTotal, ytdMonthlyTotals, mtdByCategory).
 */
function calculateAnalytics(expensesData, filters) {
    console.log("Calculating analytics with filters:", filters);

    const { year, month, category } = filters;
    const targetYear = parseInt(year);
    const targetMonth = month === "all" ? null : parseInt(month);
    const targetCategory = category === "all" ? null : category;

    let mtdTotal = 0;
    const ytdMonthlyTotals = {}; // Store as { monthNumber: total }
    const mtdByCategory = {}; // Store as { categoryName: total }

    expensesData.forEach(expense => {
        const expenseDate = new Date(expense.date + "T00:00:00"); // Ensure date is parsed correctly, add time to avoid timezone issues
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth() + 1; // getMonth() is 0-indexed
        const expenseCategory = expense.category;

        // --- Year-to-Date Monthly Totals (for the selected year) ---
        if (expenseYear === targetYear) {
            // Apply category filter if selected for YTD totals
            if (!targetCategory || expenseCategory === targetCategory) {
                if (!ytdMonthlyTotals[expenseMonth]) {
                    ytdMonthlyTotals[expenseMonth] = 0;
                }
                ytdMonthlyTotals[expenseMonth] += expense.amount;
            }
        }

        // --- Month-to-Date Calculations (for selected year and month) ---
        if (expenseYear === targetYear && 
            (!targetMonth || expenseMonth === targetMonth)) {
            
            // Apply category filter if selected for MTD totals
            if (!targetCategory || expenseCategory === targetCategory) {
                 // MTD Total
                mtdTotal += expense.amount;
            }

            // MTD by Category (always calculate for the selected month, regardless of category filter)
            if (!targetMonth || expenseMonth === targetMonth) { // Redundant check, but clearer
                 if (!mtdByCategory[expenseCategory]) {
                    mtdByCategory[expenseCategory] = 0;
                }
                mtdByCategory[expenseCategory] += expense.amount;
            }
        }
    });

    const results = {
        mtdTotal,
        ytdMonthlyTotals,
        mtdByCategory
    };
    console.log("Analytics calculation complete:", results);
    return results;
}

