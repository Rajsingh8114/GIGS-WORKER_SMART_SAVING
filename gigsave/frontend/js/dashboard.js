document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Dashboard");
  const root = document.querySelector("#page-root");
  root.innerHTML = `<div class="skeleton"></div><div style="height:18px"></div><div class="skeleton"></div>`;
  await window.autoSaveReady; // so today's auto-save is already reflected in the numbers below
  const [dashboard, analytics, auto] = await Promise.all([
    api.get("/api/dashboard"),
    api.get("/api/dashboard/analytics"),
    api.get("/api/autosave/settings").catch(() => null),
  ]);
  const cards = dashboard.cards;
  const rec = dashboard.recommendation;
  const first = esc(dashboard.user.name.split(" ")[0]);
  root.innerHTML = `
    <header class="page-header">
      <div><h1>${greeting()}, ${first}</h1><p>Here's your financial snapshot for today.</p></div>
      <a class="btn btn-primary" href="savings.html">${icon("savings")} Save today</a>
    </header>
    <section class="grid grid-4">
      ${stat("Available Balance", cards.available_balance, "This month so far", "", "wallet")}
      ${stat("Monthly Income", cards.monthly_income, "Recorded payouts", "", "income")}
      ${stat("Monthly Expenses", cards.monthly_expenses, "Tracked spending", "warn", "expenses")}
      ${stat("Total Savings", cards.total_savings, `${cards.savings_target_progress}% of monthly target`, "", "savings")}
    </section>
    <section class="grid grid-2" style="margin-top:18px">
      <div class="card chart-card"><div class="section-title"><h2>Income Trend</h2><span class="badge success">${esc(analytics.income.income_stability)}</span></div><div style="height:310px"><canvas id="incomeTrend"></canvas></div></div>
      <div class="card chart-card"><div class="section-title"><h2>Income by Platform</h2><span class="badge">30 days</span></div><div style="height:310px"><canvas id="platformChart"></canvas></div></div>
    </section>
    <section class="grid grid-3" style="margin-top:18px">
      <div class="card agent-card">
        <div class="section-title"><h2>Your Financial Agent</h2><span class="badge">Rule-based</span></div>
        <p class="muted">${esc(rec.reason)}</p>
        <div class="stat-value">${rupee(rec.recommended_amount)}</div>
        <p class="trend">Recommended saving today</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn-primary" id="saveNow">Save ${rupee(rec.recommended_amount)}</button>
          <button class="btn btn-secondary" id="why">Why this?</button>
        </div>
      </div>
      <div class="card" id="autoCard"></div>
      <div class="card">
        <div class="section-title"><h2>Top Goals</h2><a class="badge" href="goals.html">Manage</a></div>
        <div class="grid">${dashboard.goals.map(goalCard).join("")}</div>
      </div>
    </section>`;
  const trend = analytics.income.trend;
  lineChart("incomeTrend", trend.map((x) => x.date.slice(5)), trend.map((x) => x.amount), "Income");
  doughnutChart("platformChart", analytics.income.platforms.map((x) => x.label), analytics.income.platforms.map((x) => x.amount));
  drawAutoCard(auto);
  document.querySelector("#why").onclick = () => openModal(`<h2>How GigSave calculated this</h2><p class="muted">${esc(rec.reason)}</p><ul>${rec.factors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><button class="btn btn-primary" data-close>Got it</button>`);
  document.querySelector("#saveNow").onclick = async () => {
    const amount = rec.recommended_amount;
    if (!amount) return showToast("No safe saving recommended today", "error");
    await api.post("/api/savings", { amount, saving_date: todayISO(), source: "Dashboard recommendation" });
    showToast("Saving added");
  };
});

function drawAutoCard(auto) {
  const card = document.querySelector("#autoCard");
  if (!auto) { card.innerHTML = `<div class="section-title"><h2>Auto-Save</h2></div><p class="muted">Auto-Save is unavailable right now.</p>`; return; }
  const on = auto.settings.enabled;
  const today = auto.today;
  card.innerHTML = `
    <div class="section-title"><h2>Auto-Save</h2><span class="badge ${on ? "ai" : "off"}">${on ? (auto.settings.mode === "smart" && auto.settings.use_ai ? "AI-assisted" : "On") : "Off"}</span></div>
    <p class="muted">${on ? "GigSave moves a safe amount into savings once a day, so you don't have to remember." : "Turn it on and GigSave will save a safe amount for you every day."}</p>
    ${today ? `<div class="stat-value">${rupee(today.amount)}</div><p class="trend ${today.status === "saved" ? "" : "warn"}">${today.status === "saved" ? "Saved automatically today" : "Skipped today"}</p><p class="muted" style="font-size:14px">${esc(today.reason)}</p>` : `<div class="stat-value">${on ? "Ready" : "—"}</div>`}
    <div class="autosave-mini">
      <label class="switch" title="Toggle Auto-Save"><input type="checkbox" id="autoToggle" ${on ? "checked" : ""} aria-label="Auto-Save"><span class="track"></span></label>
      <a class="btn btn-secondary" href="autosave.html">Manage</a>
    </div>`;
  document.querySelector("#autoToggle").onchange = async (event) => {
    const settings = { ...auto.settings, enabled: event.target.checked };
    await api.put("/api/autosave/settings", settings);
    showToast(settings.enabled ? "Auto-Save is on" : "Auto-Save is off");
    location.reload();
  };
}
