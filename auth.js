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

  const date = new Date(value);
  if (isNaN(date)) return value;

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}
