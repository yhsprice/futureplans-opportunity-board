const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const personInput = document.getElementById("personInput");
const peopleList = document.getElementById("peopleList");
const passwordInput = document.getElementById("passwordInput");

let people = [];

async function loadPeople() {
  const response = await fetch(`${API_URL}?action=getPeople`);
  people = await response.json();

  peopleList.innerHTML = "";

  people
    .filter(person =>
      String(person.Active || person.ActiveStatus || "").trim() === "Yes"
    )
    .sort((a, b) => a.Name.localeCompare(b.Name))
    .forEach(person => {
      const option = document.createElement("option");
      option.value = person.Name;
      peopleList.appendChild(option);
    });
}

function login() {
  const typedName = personInput.value.trim();
  const password = passwordInput.value.trim();

  const person = people.find(p =>
    String(p.Name).trim().toLowerCase() === typedName.toLowerCase() &&
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

  if (String(person.Role).trim() === "Manager") {
    window.location.href = "manager.html";
  } else {
    window.location.href = "coach-dashboard.html";
  }
}

loadPeople();
