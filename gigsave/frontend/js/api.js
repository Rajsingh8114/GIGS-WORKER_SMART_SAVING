const API_BASE =
  location.protocol === "file:"
    ? "http://127.0.0.1:8000"
    : "";

const TOKEN_KEY = "gigsave_token";

/* =========================
   AUTHENTICATION
========================= */

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function protectPage() {
  if (!token()) {
    location.href = "login.html";
  }
}

/* =========================
   TOAST NOTIFICATIONS
========================= */

function showToast(message, type = "success") {
  let wrap = document.querySelector(".toast-wrap");

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }

  const toast = document.createElement("div");
  toast.className =
    `toast ${type === "error" ? "error" : ""}`;

  toast.textContent = String(message);
  wrap.appendChild(toast);

  setTimeout(() => toast.remove(), 3400);
}

/* =========================
   API REQUESTS
========================= */

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body !== undefined &&
      options.body !== null &&
      !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const currentToken = token();

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const message =
      "Cannot connect to the server. Check that your backend is running.";

    showToast(message, "error");
    throw new Error(message);
  }

  let body = null;

  try {
    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await response.json();
    } else {
      const text = await response.text();
      body = text ? { detail: text } : null;
    }
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !location.pathname.endsWith("login.html")
    ) {
      clearToken();
      location.href = "login.html";
    }

    const detail = body?.detail;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || String(item)).join(", ")
      : detail || `Request failed (${response.status})`;

    showToast(message, "error");
    throw new Error(String(message));
  }

  return body;
}

const api = {
  get: (path) => apiRequest(path),

  post: (path, data) =>
    apiRequest(path, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (path, data) =>
    apiRequest(path, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (path) =>
    apiRequest(path, {
      method: "DELETE",
    }),
};

/* =========================
   GENERAL HELPERS
========================= */

function rupee(value) {
  const amount = Number(value || 0);

  return `Rs ${(
    Number.isFinite(amount) ? amount : 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function todayISO() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formData(form) {
  return Object.fromEntries(
    new FormData(form).entries()
  );
}

/* =========================
   ICONS
========================= */

const ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',

  income:
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',

  expenses:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',

  savings:
    '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',

  autosave:
    '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',

  investments:
    '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',

  goals:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',

  tax:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',

  agent:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',

  menu:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',

  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',

  check:
    '<polyline points="20 6 9 17 4 12"/>',

  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',

  clock:
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',

  wallet:
    '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',

  trend:
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
};

function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* =========================
   HTML ESCAPING
   FIXED SYNTAX ERROR
========================= */

function esc(value) {
  const htmlEntities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => htmlEntities[character]
  );
}

/* =========================
   NAVIGATION
========================= */

function navItems() {
  return [
    [
      "Overview",
      [
        ["dashboard.html", "dashboard", "Dashboard"],
        ["income.html", "income", "Income"],
        ["expenses.html", "expenses", "Expenses"],
      ],
    ],
    [
      "Grow",
      [
        ["savings.html", "savings", "Savings"],
        ["autosave.html", "autosave", "Auto-Save", "AI"],
        ["goals.html", "goals", "Goals"],
        ["investments.html", "investments", "Investments"],
      ],
    ],
    [
      "Assist",
      [
        ["tax.html", "tax", "Tax"],
        ["agent.html", "agent", "Financial Agent"],
      ],
    ],
  ];
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

/* =========================
   APPLICATION LAYOUT
========================= */

function renderShell(active) {
  const app = document.querySelector("[data-app]");

  if (!app) return;

  if (!token()) {
    location.href = "login.html";
    return;
  }

  app.className = "app-shell";

  const dateText = new Date().toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );

  app.innerHTML = `
    <aside class="sidebar">
      <a class="logo" href="dashboard.html">
        <span class="logo-mark">G</span>
        <span>GigSave</span>
      </a>

      <nav class="nav-links" aria-label="Main">
        ${navItems()
          .map(([label, items]) => {
            const links = items
              .map(([href, ico, text, tag]) => `
                <a class="nav-link ${active === text ? "active" : ""}"
                   href="${href}">
                  <span class="nav-ico">${icon(ico)}</span>
                  ${text}
                  ${tag ? `<span class="nav-new">${tag}</span>` : ""}
                </a>
              `)
              .join("");

            return `<div class="nav-label">${label}</div>${links}`;
          })
          .join("")}
      </nav>

      <a class="sidebar-card" href="autosave.html" id="sideAuto">
        <small>Auto-Save</small>
        <strong>
          <span class="status-dot" id="sideDot"></span>
          <span id="sideState">Checking...</span>
        </strong>
        <span class="amount" id="sideAmount"></span>
      </a>
    </aside>

    <main class="main">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="icon-btn mobile-toggle"
                  id="mobileMenuBtn"
                  aria-label="Open menu">
            ${icon("menu")}
          </button>

          <span class="topbar-date">${dateText}</span>
        </div>

        <div class="topbar-actions">
          <button class="icon-btn"
                  data-theme-toggle
                  aria-label="Toggle dark mode"
                  title="Toggle dark mode"></button>

          <button class="user-chip"
                  id="logoutBtn"
                  title="Click to sign out">
            <span class="avatar" id="avatar">G</span>
            <span id="userName">Loading</span>
            ${icon("logout")}
          </button>
        </div>
      </div>

      <div id="page-root"></div>
    </main>
  `;

  const menuButton = document.querySelector("#mobileMenuBtn");

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      document.body.classList.toggle("menu-open");
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    if (typeof themeIcon === "function") {
      btn.innerHTML = themeIcon();
    }

    if (typeof toggleTheme === "function") {
      btn.addEventListener("click", toggleTheme);
    }
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
    });
  });

  api.get("/api/auth/me")
    .then((user) => {
      const nameElement = document.querySelector("#userName");
      const avatarElement = document.querySelector("#avatar");

      if (!user) return;

      if (nameElement) {
        nameElement.textContent = user.name || "User";
      }

      if (avatarElement) {
        avatarElement.textContent =
          (user.name || "G").charAt(0).toUpperCase();
      }
    })
    .catch((error) => {
      console.error("Could not load user information:", error);
    });

  const logoutButton = document.querySelector("#logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearToken();
      location.href = "login.html";
    });
  }

  window.autoSaveReady = runAutoSave();
}

/* =========================
   AUTOMATIC SAVINGS
========================= */

async function runAutoSave() {
  const set = (state, on, amount = "") => {
    const stateElement = document.querySelector("#sideState");
    const dotElement = document.querySelector("#sideDot");
    const amountElement = document.querySelector("#sideAmount");

    if (stateElement) {
      stateElement.textContent = state;
    }

    if (dotElement) {
      dotElement.classList.toggle("on", on);
    }

    if (amountElement) {
      amountElement.textContent = amount;
    }
  };

  try {
    const result = await api.post("/api/autosave/run", {});

    window.autoSaveResult = result;

    if (result?.status === "disabled") {
      set("Off - tap to enable", false);
      return result;
    }

    const run = result?.run;

    if (!run) {
      set("Unavailable", false);
      return result;
    }

    if (result.status === "saved") {
      showToast(
        `${run.engine === "ai" ? "AI " : ""}Auto-Save moved ${rupee(run.amount)} into savings`
      );
    }

    set(
      run.status === "saved" ? "Saved today" : "Skipped today",
      run.status === "saved",
      run.status === "saved" ? rupee(run.amount) : "Rs 0"
    );

    return result;
  } catch (error) {
    console.error("Auto-save failed:", error);
    set("Unavailable", false);
    return null;
  }
}

/* =========================
   FORM DRAFT SAVING
========================= */

function enableDraft(form, key) {
  if (!form) return;

  const storageKey = `gigsave_draft_${key}`;

  const indicator = document.createElement("span");
  indicator.className = "save-indicator";
  indicator.style.gridColumn = "1 / -1";

  form.appendChild(indicator);

  const read = () => {
    try {
      return JSON.parse(
        localStorage.getItem(storageKey) || "null"
      );
    } catch (_) {
      return null;
    }
  };

  const draft = read();

  if (draft && typeof draft === "object") {
    Object.entries(draft).forEach(([name, value]) => {
      const element = form.elements.namedItem(name);

      if (
        element &&
        typeof element.value !== "undefined" &&
        !element.matches?.("[type=date]")
      ) {
        element.value = value;
      }
    });

    indicator.className = "save-indicator ok";
    indicator.innerHTML = `${icon("check")} Draft restored`;
  }

  let timer;

  form.addEventListener("input", () => {
    indicator.className = "save-indicator busy";
    indicator.textContent = "Saving draft...";

    clearTimeout(timer);

    timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(formData(form))
        );

        indicator.className = "save-indicator ok";
        indicator.innerHTML = `${icon("check")} Draft saved`;
      } catch (error) {
        console.error("Could not save form draft:", error);
        indicator.textContent = "Draft could not be saved";
      }
    }, 500);
  });

  form.addEventListener("submit", () => {
    clearTimeout(timer);

    try {
      localStorage.removeItem(storageKey);
    } catch (_) {
      // Ignore local storage errors.
    }

    indicator.textContent = "";
  });
}

/* =========================
   CHART HELPERS
========================= */

const cssVar = (name) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

const CHART_PALETTE = [
  "#0e9f6e",
  "#e9a23b",
  "#0f766e",
  "#6366f1",
  "#ef4b6c",
  "#38bdf8",
  "#a3b8ad",
  "#3d5a4c",
];

function lineChart(
  id,
  labels,
  data,
  label,
  color = "#0e9f6e"
) {
  const canvas = document.getElementById(id);

  if (!canvas || typeof window.Chart === "undefined") {
    return null;
  }

  return new Chart(canvas, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}26`,
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2.5,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index",
      },

      plugins: {
        legend: {
          display: false,
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },

          ticks: {
            color: () => cssVar("--muted"),
            maxTicksLimit: 8,
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: () => cssVar("--border"),
          },

          ticks: {
            color: () => cssVar("--muted"),
          },

          border: {
            display: false,
          },
        },
      },
    },
  });
}

function doughnutChart(id, labels, data) {
  const canvas = document.getElementById(id);

  if (!canvas || typeof window.Chart === "undefined") {
    return null;
  }

  return new Chart(canvas, {
    type: "doughnut",

    data: {
      labels,

      datasets: [
        {
          data,
          backgroundColor: CHART_PALETTE,
          borderWidth: 3,
          borderColor: () => cssVar("--surface"),
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",

          labels: {
            color: () => cssVar("--muted"),
            usePointStyle: true,
            boxWidth: 8,
          },
        },
      },

      cutout: "68%",
    },
  });
}

/* =========================
   MODAL
========================= */

function openModal(content) {
  let modal = document.querySelector(".modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      ${content}
    </div>
  `;

  modal.classList.add("open");

  modal.onclick = (event) => {
    if (
      event.target === modal ||
      event.target.closest("[data-close]")
    ) {
      modal.classList.remove("open");
    }
  };
}

/* =========================
   DASHBOARD STATISTICS
========================= */

function stat(
  label,
  value,
  trend,
  tone = "",
  ico = "wallet"
) {
  return `
    <article class="card stat-card">
      <div class="stat-head">
        <div class="stat-label">${esc(label)}</div>

        <span class="stat-icon ${tone === "warn" ? "gold" : ""}">
          ${icon(ico)}
        </span>
      </div>

      <div class="stat-value">${rupee(value)}</div>

      <div class="trend ${esc(tone)}">${esc(trend)}</div>
    </article>
  `;
}

/* =========================
   SAVINGS GOALS
========================= */

function goalCard(goal) {
  const current = Number(goal.current_amount) || 0;
  const target = Number(goal.target_amount) || 0;

  const calculatedProgress =
    target > 0
      ? Math.round((current / target) * 100)
      : 0;

  const rawProgress =
    goal.progress ?? calculatedProgress;

  const progress = Math.max(
    0,
    Math.min(100, Number(rawProgress) || 0)
  );

  return `
    <div class="goal-card">
      <h3>${esc(goal.name)}</h3>

      <div class="progress">
        <span style="width:${progress}%"></span>
      </div>

      <div class="muted">
        ${rupee(current)} / ${rupee(target)} (${progress}%)
      </div>
    </div>
  `;
}