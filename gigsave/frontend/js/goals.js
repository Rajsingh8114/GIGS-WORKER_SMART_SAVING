document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Goals");
  await drawGoals();
});

async function drawGoals() {
  const root = document.querySelector("#page-root");
  const goals = await api.get("/api/goals");
  root.innerHTML = `
    <header class="page-header"><div><h1>Goals</h1><p>Prioritize emergency cash, planned purchases, and maintenance buffers.</p></div><button class="btn btn-primary" id="newGoal">Create Goal</button></header>
    <section class="grid grid-3">${goals.map((g) => {
      const progress = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
      return `<article class="card goal-card"><div class="section-title"><h2>${esc(g.name)}</h2><span class="badge">${progress}%</span></div><div class="stat-value">${rupee(g.current_amount)}</div><p class="muted">of ${rupee(g.target_amount)} by ${g.deadline || "No deadline"}</p><div class="progress"><span style="width:${progress}%"></span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-secondary" onclick="addMoney(${g.id})">Add Money</button><button class="btn btn-ghost" onclick="deleteGoal(${g.id})">Delete</button></div></article>`;
    }).join("")}</section>`;
  document.querySelector("#newGoal").onclick = () => openGoalModal();
}

function openGoalModal() {
  openModal(`<h2>Create Goal</h2><form id="goalForm" class="form-grid"><div class="field"><label>Name</label><input class="input" name="name" required></div><div class="field"><label>Target</label><input class="input" name="target_amount" type="number" min="1" required></div><div class="field"><label>Current</label><input class="input" name="current_amount" type="number" min="0" value="0"></div><div class="field"><label>Deadline</label><input class="input" name="deadline" type="date"></div><button class="btn btn-primary" style="grid-column:1/-1">Create</button></form>`);
  document.querySelector("#goalForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    data.target_amount = Number(data.target_amount);
    data.current_amount = Number(data.current_amount);
    if (!data.deadline) data.deadline = null;
    await api.post("/api/goals", data);
    showToast("Goal created");
    location.reload();
  };
}

async function addMoney(id) {
  const amount = Number(prompt("Amount to add"));
  if (!amount) return;
  await api.post("/api/savings", { amount, saving_date: todayISO(), source: "Goal top-up", goal_id: id });
  showToast("Goal updated");
  drawGoals();
}

async function deleteGoal(id) {
  await api.delete(`/api/goals/${id}`);
  showToast("Goal deleted");
  drawGoals();
}
