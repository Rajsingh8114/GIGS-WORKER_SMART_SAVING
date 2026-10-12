document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Expenses");
  const root = document.querySelector("#page-root");
  root.innerHTML = pageScaffold("Expenses", "See where work cashflow goes and spot tax-useful categories.", "Add Expense", expenseForm());
  document.querySelector("#date").value = todayISO();
  enableDraft(document.querySelector("#entryForm"), "expense");
  await loadExpenses();
  document.querySelector("#entryForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    data.amount = Number(data.amount);
    await api.post("/api/expenses", data);
    showToast("Expense added");
    event.target.reset();
    document.querySelector("#date").value = todayISO();
    loadExpenses();
  };
});

async function loadExpenses() {
  const [rows, analytics] = await Promise.all([api.get("/api/expenses"), api.get("/api/expenses/analytics")]);
  document.querySelector("#metrics").innerHTML = `${mini("All Recorded Expenses", rupee(analytics.total))}${mini("Categories", analytics.by_category.length)}${mini("Largest Category", analytics.by_category.at(-1)?.label || "None")}${mini("Tax Useful", "Tracked")}`;
  renderTable(rows, ["category", "amount", "expense_date", "description"], "/api/expenses/");
  doughnutChart("pageChart", analytics.by_category.map((x) => x.label), analytics.by_category.map((x) => x.amount));
}

function expenseForm() {
  return `
    <div class="field"><label>Category</label><select name="category"><option>Fuel</option><option>Food</option><option>Rent</option><option>Phone</option><option>Vehicle Maintenance</option><option>Insurance</option><option>Equipment</option><option>Other</option></select></div>
    <div class="field"><label>Amount</label><input class="input" name="amount" type="number" min="1" required></div>
    <div class="field"><label>Date</label><input class="input" id="date" name="expense_date" type="date" required></div>
    <div class="field"><label>Description</label><input class="input" name="description"></div>`;
}
