const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const personInput = document.getElementById("personInput");
const personSuggestions = document.getElementById("personSuggestions");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.querySelector(".login-button");

let people = [];
let peopleLoaded = false;
let peopleLoading = false;

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function fetchWithTimeout(url, timeoutMilliseconds = 15000) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMilliseconds);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPeople() {
  if (peopleLoading) {
    return false;
  }

  peopleLoading = true;
  peopleLoaded = false;

  personInput.disabled = true;
  passwordInput.disabled = true;
  loginButton.disabled = true;
  personInput.placeholder = "Loading employee list...";

  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
    try {
      const requestUrl =
        `${API_URL}?action=getPeople&_=${Date.now()}`;

      const response = await fetchWithTimeout(requestUrl);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Employee list was not returned correctly.");
      }

      people = data;
      peopleLoaded = true;

      personInput.disabled = false;
      passwordInput.disabled = false;
      loginButton.disabled = false;
      personInput.placeholder = "Start typing your name...";

      peopleLoading = false;
      return true;

    } catch (error) {
      console.error(
        `Employee list attempt ${attempt} failed:`,
        error
      );

      if (attempt < maximumAttempts) {
        await wait(1500);
      }
    }
  }

  people = [];
  peopleLoaded = false;
  peopleLoading = false;

  personInput.disabled = false;
  passwordInput.disabled = false;
  loginButton.disabled = false;

  personInput.placeholder = "Could not connect. Refresh or try again.";

  alert(
    "The portal could not connect to the employee list. " +
    "This is a connection problem, not an incorrect password. " +
    "Please refresh and try again."
  );

  return false;
}

function showSuggestions() {
  const typed = personInput.value.trim().toLowerCase();

  personSuggestions.innerHTML = "";

  if (!peopleLoaded) {
    personSuggestions.style.display = "none";
    return;
  }

  if (!typed) {
    personSuggestions.style.display = "none";
    return;
  }

  const matches = people
    .filter(person =>
      String(person.Active || person.ActiveStatus || "").trim() === "Yes" &&
      String(person.Role || "").trim() !== "COP" &&
      String(person.Name || "")
        .trim()
        .toLowerCase()
        .startsWith(typed)
    )
    .sort((a, b) =>
      String(a.Name || "").localeCompare(String(b.Name || ""))
    )
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
      passwordInput.focus();
    });

    personSuggestions.appendChild(item);
  });

  personSuggestions.style.display = "block";
}

personInput.addEventListener("input", showSuggestions);

document.addEventListener("click", event => {
  if (!event.target.closest(".autocomplete")) {
    personSuggestions.style.display = "none";
  }
});

async function login() {
  if (!peopleLoaded) {
    alert(
      "The employee list did not finish loading. " +
      "Please wait or refresh the page."
    );

    await loadPeople();
    return;
  }

  const typedName = personInput.value.trim();
  const password = passwordInput.value.trim();

  if (!typedName || !password) {
    alert("Please choose your name and enter your password.");
    return;
  }

  const person = people.find(p =>
    String(p.Name || "").trim().toLowerCase() ===
      typedName.toLowerCase() &&
    String(p.Password || "") === String(password) &&
    String(p.Active || p.ActiveStatus || "").trim() === "Yes" &&
    String(p.Role || "").trim() !== "COP"
  );

  if (!person) {
    alert("Name or password is incorrect.");
    return;
  }

  localStorage.setItem(
    "loggedInUser",
    JSON.stringify({
      PersonID: person.PersonID,
      Name: person.Name,
      Email: person.Email,
      Role: person.Role,
      Tier: person.Tiers,
      AdultApproved: person.AdultApproved || "No"
    })
  );

  if (String(person.Role || "").trim() === "Manager") {
    window.location.href = "manager.html";
  } else {
    window.location.href = "coach-dashboard.html";
  }
}

passwordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    login();
  }
});

loadPeople();
