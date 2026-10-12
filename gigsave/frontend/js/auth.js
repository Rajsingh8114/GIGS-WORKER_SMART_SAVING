document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(loginForm);
      try {
        const result = await api.post("/api/auth/login", payload);
        setToken(result.access_token);
        showToast("Welcome back to GigSave");
        location.href = "dashboard.html";
      } catch (_) {}
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(registerForm);
      payload.monthly_income_estimate = Number(payload.monthly_income_estimate);
      try {
        const result = await api.post("/api/auth/register", payload);
        setToken(result.access_token);
        showToast("Account created");
        location.href = "dashboard.html";
      } catch (_) {}
    });
  }
});
