/* Applies the saved (or OS) colour theme before first paint. Loaded in <head> on every page. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem("gigsave_theme"); } catch (_) {}
  var dark = saved ? saved === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();

function toggleTheme() {
  var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("gigsave_theme", next); } catch (_) {}
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) { btn.innerHTML = themeIcon(); });
  if (window.Chart && Chart.instances) Object.values(Chart.instances).forEach(function (chart) { chart.update(); });
}

function themeIcon() {
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  var path = dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + path + "</svg>";
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.innerHTML = themeIcon();
    btn.addEventListener("click", toggleTheme);
  });
});
