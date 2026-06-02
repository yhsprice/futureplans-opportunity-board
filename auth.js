function getCurrentUser() {
  const user = localStorage.getItem("loggedInUser");

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  return JSON.parse(user);
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}
