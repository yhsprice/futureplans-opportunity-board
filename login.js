const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const personInput = document.getElementById("personInput");
const personSuggestions = document.getElementById("personSuggestions");
const passwordInput = document.getElementById("passwordInput");

let people = [];

async function loadPeople() {
  const response = await fetch(`${API_URL}?action=getPeople`);
  people = await response.json();
}

function showSuggestions() {
  const typed = personInput.value.trim().toLowerCase();
  personSuggestions.innerHTML = "";

  if (!typed) {
    personSuggestions.style.display = "none";
    return;
  }

  const matches = people
  .filter(person =>
    String(person.Active || person.ActiveStatus || "").trim() === "Yes" &&
    String(person.Role || "").trim() !== "COP" &&
    String(person.Name || "").toLowerCase().startsWith(typed)
  )
    .sort((a, b) => a.Name.localeCompare(b.Name))
    .slice(0, 8);

  if (!matches.length) {
    personSuggestions.style.display = "none";
    return;
  }

  matches.forEach(person => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.textContent = person.Name;

    item.addEventListener("click", () => {
      personInput.value = person.Name;
      personSuggestions.style.display = "none";
    });

    personSuggestions.appendChild(item);
  });

  personSuggestions.style.display = "block";
}

personInput.addEventListener("input", showSuggestions);

document.addEventListener("click", function(event) {
  if (!event.target.closest(".autocomplete")) {
    personSuggestions.style.display = "none";
  }
});

function login() {
  const typedName = personInput.value.trim();
  const password = passwordInput.value.trim();

  const person = people.find(p =>
  String(p.Name).trim().toLowerCase() === typedName.toLowerCase() &&
  String(p.Password) === String(password) &&
  String(p.Active || p.ActiveStatus || "").trim() === "Yes" &&
  String(p.Role || "").trim() !== "COP"
);

  if (!person) {
    alert("Name or password is incorrect.");
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify({
    PersonID: person.PersonID,
    Name: person.Name,
    Email: person.Email,
    Role: person.Role,
    Tier: person.Tiers,
    AdultApproved: person.AdultApproved || "No"
  }));

  if (String(person.Role).trim() === "Manager") {
    window.location.href = "manager.html";
  } else {
    window.location.href = "coach-dashboard.html";
  }
}

loadPeople();
