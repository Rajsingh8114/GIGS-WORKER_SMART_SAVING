/* Auto-Save page: master switch, AI/rules mode, guardrails, today's decision, history.
   Settings save themselves a moment after every change — there is no Save button. */
let AUTO = { settings: null, ai: null, today: null, goals: [] };
let saveTimer;

document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Auto-Save");
  const root = document.querySelector("#page-root");
  root.innerHTML = `<div class="skeleton"></div>`;
  await window.autoSaveReady;
  await load();
});

async function load() {
  const [info, goals, history] = await Promise.all([api.get("/api/autosave/settings"), api.get("/api/goals"), api.get("/api/autosave/history")]);
  AUTO = { settings: info.settings, ai: info.ai, today: info.today, goals, history };
  draw();
  refreshPreview();
}

function draw() {
  const s = AUTO.settings;
  const root = document.querySelector("#page-root");
  const aiLine = AUTO.ai.configured
    ? `<span class="badge ai">${icon("agent")} Claude connected · ${esc(AUTO.ai.model)}</span>`
    : `<span class="badge off">Adaptive engine</span>`;
  root.innerHTML = `
    <header class="page-header">
      <div><h1>Auto-Save</h1><p>Let GigSave set money aside for you every day — safely, and only what you can spare.</p></div>
      <span class="save-indicator" id="saveState"></span>
    </header>
    <section class="autosave-hero">
      <div class="card agent-card">
        <div class="autosave-top">
          <div><h2>${s.enabled ? "Auto-Save is on" : "Auto-Save is off"}</h2><p class="muted" style="margin:0">${s.enabled ? "Runs once per day, the first time you open GigSave." : "Switch it on to start saving automatically."}</p></div>
          <label class="switch" title="Turn Auto-Save on or off"><input type="checkbox" id="fEnabled" ${s.enabled ? "checked" : ""} aria-label="Auto-Save"><span class="track"></span></label>
        </div>
        <div class="decision" id="decision"><div class="skeleton" style="min-height:90px"></div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn-primary" id="runNow" ${s.enabled ? "" : "disabled"}>${icon("autosave")} Run now</button>
          <button class="btn btn-secondary" id="refreshPreview">Recalculate</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title"><h2>How much to save</h2>${aiLine}</div>
        <div class="segmented" role="tablist" style="margin-bottom:6px">
          <button type="button" data-mode="smart" class="${s.mode === "smart" ? "on" : ""}">Smart</button>
          <button type="button" data-mode="fixed" class="${s.mode === "fixed" ? "on" : ""}">Fixed amount</button>
        </div>
        <div id="modeBody"></div>
        <div class="form-grid" style="margin-top:16px">
          <div class="field"><label for="fMax">Daily limit (Rs)</label><input class="input" id="fMax" type="number" min="0" step="10" value="${s.max_daily}"><span class="hint">Never save more than this in a day.</span></div>
          <div class="field"><label for="fBuffer">Keep available (Rs)</label><input class="input" id="fBuffer" type="number" min="0" step="100" value="${s.min_buffer}"><span class="hint">Cash always left untouched.</span></div>
          <div class="field" style="grid-column:1/-1"><label for="fGoal">Send savings to</label><select id="fGoal"><option value="">General savings (no goal)</option>${AUTO.goals.map((g) => `<option value="${g.id}" ${s.goal_id === g.id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div>
        </div>
      </div>
    </section>
    <section class="grid grid-2" style="margin-top:18px">
      <div class="card">
        <div class="section-title"><h2>Recent auto-saves</h2><span class="badge success">${rupee(AUTO.history.total_saved)} · ${AUTO.history.days_saved} ${AUTO.history.days_saved === 1 ? "day" : "days"}</span></div>
        <div class="timeline">${AUTO.history.runs.length ? AUTO.history.runs.slice(0, 8).map(runRow).join("") : `<p class="muted">Nothing yet — your first auto-save will show up here.</p>`}</div>
      </div>
      <div class="card chart-card">
        <div class="section-title"><h2>Saved per day</h2><span class="badge">Last 30 runs</span></div>
        <div style="height:280px"><canvas id="autoChart"></canvas></div>
      </div>
    </section>
    <section class="card" style="margin-top:18px" id="aiCard"></section>
    <section class="card" style="margin-top:18px">
      <div class="section-title"><h2>How the AI stays safe</h2></div>
      <div class="grid grid-3">
        <div><span class="stat-icon">${icon("shield")}</span><h3>Guardrails first</h3><p class="muted">Whatever the AI suggests is capped at 125% of GigSave's own calculation, your daily limit, and your keep-available cash.</p></div>
        <div><span class="stat-icon gold">${icon("clock")}</span><h3>Once a day</h3><p class="muted">One decision per day, saved or skipped. It never double-saves, even if you refresh or open multiple tabs.</p></div>
        <div><span class="stat-icon">${icon("agent")}</span><h3>Explains itself</h3><p class="muted">Every auto-save comes with a plain-language reason so you always know why that amount was chosen.</p></div>
      </div>
</section>`;
  bind();
  drawChart();
  renderModeBody();
  renderAiCard();
}

function renderModeBody() {
  const s = AUTO.settings;
  const body = document.querySelector("#modeBody");
  body.innerHTML = s.mode === "smart"
    ? `<div class="setting-row"><div><b>Let AI fine-tune each day</b><span class="muted">${AUTO.ai.configured ? "Claude reviews the amount against today's income and your cash." : "Uses today's earnings vs. your average. Connect Claude below for smarter reviews."}</span></div><label class="switch sm"><input type="checkbox" id="fAi" ${s.use_ai ? "checked" : ""} aria-label="Use AI"><span class="track"></span></label></div>`
    : `<div class="field" style="margin-top:12px"><label for="fFixed">Amount per day (Rs)</label><input class="input" id="fFixed" type="number" min="0" step="10" value="${s.fixed_amount}"></div>`;
  const ai = document.querySelector("#fAi");
  if (ai) ai.onchange = () => change({ use_ai: ai.checked });
  const fixed = document.querySelector("#fFixed");
  if (fixed) fixed.oninput = () => change({ fixed_amount: Number(fixed.value) || 0 });
}

function runRow(r) {
  const saved = r.status === "saved";
  const tag = r.engine === "ai" ? "AI" : r.engine === "fixed" ? "Fixed" : "Adaptive";
  return `<div class="timeline-item"><span class="timeline-dot ${saved ? "" : "skip"}"></span><div><b>${new Date(r.run_date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</b> <span class="badge ${r.engine === "ai" ? "ai" : "off"}" style="margin-left:6px">${tag}</span><p>${esc(r.reason || "")}</p></div><span class="timeline-amount">${saved ? rupee(r.amount) : "Skipped"}</span></div>`;
}

function drawChart() {
  const runs = [...AUTO.history.runs].reverse();
  if (!runs.length) return;
  lineChart("autoChart", runs.map((r) => r.run_date.slice(5)), runs.map((r) => (r.status === "saved" ? r.amount : 0)), "Auto-saved", "#0e9f6e");
}

function bind() {
  document.querySelector("#fEnabled").onchange = async (e) => {
    await change({ enabled: e.target.checked }, true);
    if (e.target.checked) {
      const result = await api.post("/api/autosave/run", {});
      if (result.status === "saved") showToast(`Saved ${rupee(result.run.amount)} automatically`);
    }
    await load();
  };
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => {
    document.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
    change({ mode: b.dataset.mode });
    renderModeBody();
  }));
  document.querySelector("#fMax").oninput = (e) => change({ max_daily: Number(e.target.value) || 0 });
  document.querySelector("#fBuffer").oninput = (e) => change({ min_buffer: Number(e.target.value) || 0 });
  document.querySelector("#fGoal").onchange = (e) => change({ goal_id: e.target.value ? Number(e.target.value) : null });
  document.querySelector("#refreshPreview").onclick = refreshPreview;
  document.querySelector("#runNow").onclick = async () => {
    const result = await api.post("/api/autosave/run?force=true", {});
    showToast(result.status === "saved" ? `Saved ${rupee(result.run.amount)} automatically` : result.status === "already_ran" ? "Already handled today" : "Nothing to save right now");
    await load();
  };
}

/* Debounced autosave of the settings themselves. */
function change(patch, immediate = false) {
  AUTO.settings = { ...AUTO.settings, ...patch };
  const state = document.querySelector("#saveState");
  if (state) { state.className = "save-indicator busy"; state.textContent = "Saving…"; }
  clearTimeout(saveTimer);
  const send = async () => {
    try {
      const result = await api.put("/api/autosave/settings", AUTO.settings);
      AUTO.settings = result.settings;
      const el = document.querySelector("#saveState");
      if (el) { el.className = "save-indicator ok"; el.innerHTML = `${icon("check")} All changes saved`; }
      refreshPreview();
    } catch (_) {
      const el = document.querySelector("#saveState");
      if (el) { el.className = "save-indicator"; el.textContent = "Couldn't save"; }
    }
  };
  if (immediate) return send();
  saveTimer = setTimeout(send, 600);
}

async function refreshPreview() {
  const box = document.querySelector("#decision");
  if (!box) return;
  try {
    const p = await api.get("/api/autosave/preview");
    const done = AUTO.today;
    box.innerHTML = `
      <div class="stat-label">${done ? "Today's decision" : "Today's amount"}</div>
      <div class="stat-value">${rupee(done ? done.amount : p.amount)}</div>
      <p class="muted" style="margin:0">${esc(done ? done.reason : p.reason)}</p>
      <div class="decision-meta">
        <span class="badge ${p.engine === "ai" ? "ai" : ""}">${p.engine === "ai" ? "AI decision" : p.engine === "fixed" ? "Fixed amount" : "Adaptive engine"}</span>
        <span class="badge">Rule-based: ${rupee(p.rule_amount)}</span>
        <span class="badge">${esc(p.confidence)} confidence</span>
        ${done ? `<span class="badge ${done.status === "saved" ? "success" : "warn"}">${done.status === "saved" ? "Saved today" : "Skipped today"}</span>` : ""}
      </div>`;
  } catch (_) {
    box.textContent = "Couldn't calculate right now.";
  }
}

/* "Connect Claude" box: paste an Anthropic API key right here instead of editing files. */
function renderAiCard() {
  const box = document.querySelector("#aiCard");
  const ai = AUTO.ai;
  if (ai.configured) {
    box.innerHTML = `
      <div class="section-title"><h2>AI connection</h2><span class="badge ai">${icon("check")} Connected</span></div>
      <div class="setting-row" style="border:0;padding-top:0">
        <div><b>Claude is reviewing your daily auto-saves</b><span class="muted">${ai.source === "server" ? "Set up by the server administrator." : `Using your key ending in ${esc(ai.key_hint)}.`} Model: ${esc(ai.model)}.</span></div>
        ${ai.source === "user" ? `<button class="btn btn-ghost" id="aiRemove">Disconnect</button>` : ""}
      </div>`;
    const rm = document.querySelector("#aiRemove");
    if (rm) rm.onclick = async () => { await api.delete("/api/autosave/ai-key"); showToast("AI disconnected"); await load(); };
    return;
  }
  box.innerHTML = `
    <div class="section-title"><h2>Connect Claude (optional)</h2><span class="badge off">Not connected</span></div>
    <p class="muted" style="margin-top:0">Auto-Save already works without AI. Connect Claude and it will also review each day's amount and write the explanation. Create a key at <b>console.anthropic.com</b> and paste it here.</p>
    <form id="aiForm" style="display:flex;gap:10px;flex-wrap:wrap">
      <input class="input" id="aiKey" type="password" autocomplete="off" placeholder="Paste your Anthropic API key (sk-ant-…)" style="flex:1;min-width:240px" required minlength="20">
      <button class="btn btn-primary" id="aiConnect">Connect</button>
    </form>
    <p class="muted" style="font-size:13px;margin-bottom:0">We check the key first. It's stored for your account only and never shown again.</p>`;
  document.querySelector("#aiForm").onsubmit = async (event) => {
    event.preventDefault();
    const btn = document.querySelector("#aiConnect");
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      await api.put("/api/autosave/ai-key", { api_key: document.querySelector("#aiKey").value.trim() });
      showToast("Claude is connected");
      await load();
    } catch (_) {
      btn.disabled = false; btn.textContent = "Connect";
    }
  };
}
