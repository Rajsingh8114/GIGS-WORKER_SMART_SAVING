document.addEventListener("DOMContentLoaded", async () => {
  renderShell("Financial Agent");
  const root = document.querySelector("#page-root");
  root.innerHTML = `
    <header class="page-header"><div><h1>Financial Agent</h1><p>Understand your money. Make better financial decisions.</p></div><span class="badge" id="agentMode">Calculation-first</span></header>
    <section class="grid grid-2">
      <div class="card agent-card">
        <div class="suggestions">
          ${["How much can I save this week?", "Why is my income considered volatile?", "How close am I to my emergency fund?", "What should I focus on this month?", "Explain my spending."].map((q) => `<button>${q}</button>`).join("")}
        </div>
        <div class="chat-log" id="chatLog" style="margin-top:18px"><div class="bubble">Ask me about savings capacity, volatility, emergency fund progress, spending, or tax organization.</div></div>
        <form id="chatForm" style="display:flex;gap:10px;margin-top:16px"><input class="input" name="message" placeholder="Ask your financial agent" required><button class="btn btn-primary">Send</button></form>
      </div>
      <div class="card"><div class="section-title"><h2>How answers work</h2></div><p class="muted">The agent uses your recorded income, expenses, goals, savings, and risk profile. Numbers always come from your own data; when an AI key is configured, Claude rewrites the answer in plain language.</p><div id="agentData" class="card" style="background:var(--surface-soft);box-shadow:none;margin-top:16px">No data selected yet.</div></div>
    </section>`;
  document.querySelectorAll(".suggestions button").forEach((btn) => btn.onclick = () => ask(btn.textContent));
  document.querySelector("#chatForm").onsubmit = (event) => {
    event.preventDefault();
    ask(formData(event.target).message);
    event.target.reset();
  };
});

async function ask(message) {
  const log = document.querySelector("#chatLog");
  log.insertAdjacentHTML("beforeend", `<div class="bubble user">${esc(message)}</div>`);
  const result = await api.post("/api/agent/chat", { message });
  log.insertAdjacentHTML("beforeend", `<div class="bubble">${esc(result.response)}</div>`);
  document.querySelector("#agentData").innerHTML = `<pre style="white-space:pre-wrap;margin:0">${esc(JSON.stringify(result.data, null, 2))}</pre>`;
  if (result.ai) { const m = document.querySelector("#agentMode"); m.textContent = "AI-assisted"; m.classList.add("ai"); }
  log.scrollTop = log.scrollHeight;
}
