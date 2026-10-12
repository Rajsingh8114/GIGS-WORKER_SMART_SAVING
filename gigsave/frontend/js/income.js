document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Income");
  const root = document.querySelector("#page-root");
  root.innerHTML = pageScaffold("Income", "Track every platform payout and understand earning patterns.", "Add Income", incomeForm());
  document.querySelector("#date").value = todayISO();
  enableDraft(document.querySelector("#entryForm"), "income");
  await loadIncome();
  document.querySelector("#entryForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    data.amount = Number(data.amount);
    await api.post("/api/income", data);
    showToast("Income added");
    event.target.reset();
    document.querySelector("#date").value = todayISO();
    loadIncome();
  };
});

async function loadIncome() {
  const [rows, analytics] = await Promise.all([api.get("/api/income"), api.get("/api/income/analytics")]);
  document.querySelector("#metrics").innerHTML = `
    ${mini("Average Daily Income", rupee(analytics.average_daily_income))}
    ${mini("Highest Earning Day", rupee(analytics.highest_earning_day))}
    ${mini("Lowest Earning Day", rupee(analytics.lowest_earning_day))}
    ${mini("Income Volatility", `${analytics.income_volatility}%`)}
  `;
  renderTable(rows, ["platform", "category", "amount", "income_date", "description"], "/api/income/");
  lineChart("pageChart", analytics.trend.map((x) => x.date.slice(5)), analytics.trend.map((x) => x.amount), "Income");
}

function incomeForm() {
  return `
    <div class="field"><label>Platform</label><select name="platform"><option>Uber</option><option>Ola</option><option>Swiggy</option><option>Zomato</option><option>Rapido</option><option>Freelance</option><option>Other</option></select></div>
    <div class="field"><label>Amount</label><input class="input" name="amount" type="number" min="1" required></div>
    <div class="field"><label>Date</label><input class="input" id="date" name="income_date" type="date" required></div>
    <div class="field"><label>Category</label><input class="input" name="category" value="Gig Work"></div>
    <div class="field" style="grid-column:1/-1"><label>Description</label><input class="input" name="description" placeholder="Morning payout, client invoice"></div>`;
}
