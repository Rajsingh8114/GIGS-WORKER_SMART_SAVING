document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Savings");
  const root = document.querySelector("#page-root");
  root.innerHTML = `<div class="skeleton"></div>`;
  await window.autoSaveReady; // include today's auto-save in the numbers
  const [rows, analytics, rec, goals] = await Promise.all([
    api.get("/api/savings"),
    api.get("/api/savings/analytics"),
    api.get("/api/savings/recommendation"),
    api.get("/api/goals"),
  ]);
  root.innerHTML = `
    <header class="page-header"><div><h1>Savings</h1><p>Turn irregular earnings into steady progress.</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-secondary" href="autosave.html">${icon("autosave")} Auto-Save</a><button class="btn btn-primary" id="addSaving">Add Saving</button></div></header>
    <section class="grid grid-4">
      ${stat("Total Savings", analytics.total, "Lifetime", "", "savings")}
      ${stat("Monthly Target", 10000, "Default goal", "", "goals")}
      ${stat("Emergency Fund", analytics.emergency_fund.current, `${analytics.emergency_fund.percent}% funded`, "", "shield")}
      ${stat("Today's Recommendation", rec.recommended_amount, rec.confidence, "", "agent")}
    </section>
    <section class="grid grid-2" style="margin-top:18px">
      <div class="card chart-card"><div class="section-title"><h2>Savings History</h2><span class="badge">30 days</span></div><div style="height:310px"><canvas id="savingsChart"></canvas></div></div>
      <div class="card agent-card"><div class="section-title"><h2>Recommendation</h2><span class="badge success">${rec.confidence}</span></div><div class="stat-value">${rupee(rec.recommended_amount)}</div><p class="muted">${esc(rec.reason)}</p><ul>${rec.factors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><button class="btn btn-primary" id="saveRec">Save Now</button></div>
    </section>
    <section class="card" style="margin-top:18px"><div class="section-title"><h2>Savings Goals</h2><a class="badge" href="goals.html">Create Goal</a></div><div class="grid grid-3">${goals.map(goalCard).join("")}</div></section>
    <section class="card" style="margin-top:18px"><div class="section-title"><h2>History</h2></div><div class="table-wrap"><table><thead><tr><th>Amount</th><th>Date</th><th>Source</th></tr></thead><tbody>${rows.slice(0, 14).map((r) => `<tr><td>${rupee(r.amount)}</td><td>${r.saving_date}</td><td>${esc(r.source)}</td></tr>`).join("")}</tbody></table></div></section>`;
  lineChart("savingsChart", analytics.history.map((x) => x.date.slice(5)), analytics.history.map((x) => x.amount), "Savings", "#0e9f6e");
  document.querySelector("#saveRec").onclick = () => saveAmount(rec.recommended_amount);
  document.querySelector("#addSaving").onclick = () => openSavingModal(goals);
});

function openSavingModal(goals) {
  openModal(`<h2>Add Saving</h2><form id="savingForm" class="form-grid"><div class="field"><label>Amount</label><input class="input" name="amount" type="number" min="1" required></div><div class="field"><label>Date</label><input class="input" name="saving_date" type="date" value="${todayISO()}" required></div><div class="field"><label>Source</label><input class="input" name="source" value="Manual"></div><div class="field"><label>Goal</label><select name="goal_id"><option value="">No goal</option>${goals.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></div><button class="btn btn-primary" style="grid-column:1/-1">Save</button></form>`);
  document.querySelector("#savingForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    data.amount = Number(data.amount);
    data.goal_id = data.goal_id ? Number(data.goal_id) : null;
    await api.post("/api/savings", data);
    showToast("Saving added");
    location.reload();
  };
}

async function saveAmount(amount) {
  if (!amount) return showToast("No safe saving recommended today", "error");
  await api.post("/api/savings", { amount, saving_date: todayISO(), source: "Recommendation" });
  showToast("Saving added");
}
