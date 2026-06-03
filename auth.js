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

  if (banner && user) {
    banner.innerHTML = `
      <div class="opportunity">
        <strong>Logged in as:</strong> ${user.Name} (${user.Role})
        <button onclick="logout()">Logout</button>
      </div>
    `;
  }
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
