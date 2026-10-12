function pageScaffold(title, subtitle, button, fields) {
  return `
    <header class="page-header"><div><h1>${title}</h1><p>${subtitle}</p></div><button class="btn btn-primary" onclick="document.querySelector('#formCard').scrollIntoView()">${button}</button></header>
    <section class="mini-metrics" id="metrics"></section>
    <section class="grid grid-2" style="margin-top:18px">
      <div class="card chart-card"><div class="section-title"><h2>Analytics</h2><span class="badge">Live</span></div><div style="height:310px"><canvas id="pageChart"></canvas></div></div>
      <div class="card" id="formCard"><div class="section-title"><h2>${button}</h2></div><form id="entryForm" class="form-grid">${fields}<button class="btn btn-primary" style="grid-column:1/-1">Save</button></form></div>
    </section>
    <section class="card" style="margin-top:18px"><div class="section-title"><h2>History</h2><input class="input" id="searchBox" placeholder="Search" style="max-width:260px"></div><div class="table-wrap"><table id="dataTable"></table></div></section>`;
}

function mini(label, value) {
  return `<div class="mini-metric"><span class="muted">${label}</span><strong>${value}</strong></div>`;
}

function renderTable(rows, columns, deletePath) {
  const table = document.querySelector("#dataTable");
  const draw = (items) => {
    table.innerHTML = `<thead><tr>${columns.map((c) => `<th>${c.replace("_", " ")}</th>`).join("")}<th></th></tr></thead><tbody>${items.map((row) => `<tr>${columns.map((c) => `<td>${c === "amount" ? rupee(row[c]) : esc(row[c] || "")}</td>`).join("")}<td><button class="btn btn-ghost" data-id="${row.id}">Delete</button></td></tr>`).join("")}</tbody>`;
    table.querySelectorAll("[data-id]").forEach((btn) => btn.onclick = async () => {
      await api.delete(`${deletePath}${btn.dataset.id}`);
      showToast("Deleted");
      btn.closest("tr").remove();
    });
  };
  draw(rows.slice(0, 12));
  const search = document.querySelector("#searchBox");
  search.oninput = () => {
    const query = search.value.toLowerCase();
    draw(rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query)).slice(0, 12));
  };
}
