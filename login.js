const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const personSelect = document.getElementById("personSelect");
const passwordInput = document.getElementById("passwordInput");

let people = [];

async function loadPeople() {
  const response = await fetch(`${API_URL}?action=getPeople`);
  people = await response.json();

  personSelect.innerHTML = `<option value="">Select your name</option>`;

  people
    .filter(person => person.Active === "Yes")
    .sort((a, b) => a.Name.localeCompare(b.Name))
    .forEach(person => {
      const option = document.createElement("option");
      option.value = person.PersonID;
      option.textContent = person.Name;
      personSelect.appendChild(option);
    });
}

function login() {
  const personID = personSelect.value;
  const password = passwordInput.value.trim();

  const person = people.find(p =>
    String(p.PersonID) === String(personID) &&
    String(p.Password) === String(password)
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

window.location.href = "index.html";

loadPeople();
