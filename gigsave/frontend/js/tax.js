document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Tax");
  const root = document.querySelector("#page-root");
  const data = await api.get("/api/tax/summary");
  root.innerHTML = `
    <header class="page-header"><div><h1>Tax Assistant</h1><p>Organize gig income and expense categories for review.</p></div><span class="badge warn">Educational estimate</span></header>
    <section class="grid grid-3">
      ${stat("Estimated Annual Income", data.estimated_annual_income, "Year to date", "", "income")}
      ${stat("Estimated Business/Gig Expenses", data.estimated_business_expenses, "Tracked categories", "warn", "expenses")}
      ${stat("Estimated Net Income", data.estimated_net_income, "Before formal tax rules", "", "tax")}
    </section>
    <section class="grid grid-2" style="margin-top:18px">
      <div class="card chart-card"><div class="section-title"><h2>Expense Breakdown</h2></div><div style="height:320px"><canvas id="taxChart"></canvas></div></div>
      <div class="card"><div class="section-title"><h2>Summary</h2></div><p>${data.summary}</p><p class="muted">${data.disclaimer}</p><a class="btn btn-primary" href="expenses.html">Review Expenses</a></div>
    </section>`;
  doughnutChart("taxChart", data.expense_breakdown.map((x) => x.category), data.expense_breakdown.map((x) => x.amount));
});
