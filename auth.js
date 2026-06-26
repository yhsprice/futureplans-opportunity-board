function getCurrentUser() {
  const user = localStorage.getItem("loggedInUser");

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  return JSON.parse(user);
}

function showUserBanner() {
  const banner = document.getElementById("userBanner");
  const user = getCurrentUser();

  if (!banner || !user) return;

  const firstName = user.Name.split(" ")[0];

  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-weight:600;">
        Welcome, ${firstName}
      </span>

      <button onclick="logout()">
        Logout
      </button>
    </div>
  `;
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

function showManagerLinksOnly() {
  const user = getCurrentUser();

  document.querySelectorAll(".manager-only").forEach(element => {
    if (user.Role !== "Manager") {
      element.style.display = "none";
    }
  });
}

function formatDateOnly(value) {
  if (!value) return "";

  // Already in MM/DD/YYYY format
  if (typeof value === "string" && value.includes("/")) {
    return value.split(" ")[0];
  }

  // Already in YYYY-MM-DD format
  if (typeof value === "string" && value.includes("-") && value.length >= 10) {
    const [year, month, day] = value.substring(0, 10).split("-");
    return `${month}/${day}/${year}`;
  }

  const date = new Date(value);

  if (isNaN(date)) return value;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date)) return value;

  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
