document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Investments");
  await drawInvestments();
});

async function drawInvestments() {
  const root = document.querySelector("#page-root");
  const rec = await api.get("/api/investments/recommendations");
  root.innerHTML = `
    <header class="page-header"><div><h1>Investments</h1><p>Educational allocation categories shaped by risk preference and financial behavior.</p></div><span class="badge warn">Not investment advice</span></header>
    <section class="grid grid-2">
      <div class="card chart-card"><div class="section-title"><h2>${rec.risk_profile} Profile</h2><span class="badge">Allocation</span></div><div style="height:320px"><canvas id="allocationChart"></canvas></div><p class="muted">${rec.disclaimer}</p></div>
      <div class="card"><div class="section-title"><h2>Risk Questionnaire</h2></div>
        <form id="riskForm" class="form-grid">
          ${select("horizon", "Investment horizon", ["Short term", "3-5 years", "Long term 5+ years"])}
          ${select("income_stability", "Income stability", ["Low", "Moderate", "Stable"])}
          ${select("emergency_fund", "Emergency fund", ["Not started", "Partial", "Complete 6 months"])}
          ${select("risk_tolerance", "Risk tolerance", ["Low", "Moderate", "High aggressive"])}
          ${select("experience", "Experience", ["Beginner", "Some experience", "Experienced"])}
          ${select("financial_goal", "Financial goal", ["Protect cash", "Balanced growth", "Long term growth"])}
          <button class="btn btn-primary" style="grid-column:1/-1">Update Profile</button>
        </form>
      </div>
    </section>
    <section class="grid grid-4" style="margin-top:18px">${rec.allocation.map((item) => `<article class="card"><div class="stat-label">${item.category}</div><div class="stat-value">${item.percent}%</div></article>`).join("")}</section>`;
  doughnutChart("allocationChart", rec.allocation.map((x) => x.category), rec.allocation.map((x) => x.percent));
  document.querySelector("#riskForm").onsubmit = async (event) => {
    event.preventDefault();
    const result = await api.post("/api/investments/profile", formData(event.target));
    showToast(`Profile updated to ${result.risk_profile}`);
    drawInvestments();
  };
}

function select(name, label, options) {
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map((x) => `<option>${x}</option>`).join("")}</select></div>`;
}
