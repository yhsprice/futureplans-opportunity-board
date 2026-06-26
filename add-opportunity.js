const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

const copInput = document.getElementById("cop");
const copSuggestions = document.getElementById("copSuggestions");

let cops = [];

loadCOPList();

function loadCOPList() {
  fetch(`${API_URL}?action=getCOPList`)
    .then(response => response.json())
    .then(data => {
      cops = data;
    })
    .catch(error => {
      console.error("Could not load COP list:", error);
    });
}

function showCOPSuggestions() {
  const typed = copInput.value.trim().toLowerCase();
  copSuggestions.innerHTML = "";

  if (!typed) {
    copSuggestions.style.display = "none";
    return;
  }

  const matches = cops
    .filter(name =>
      String(name || "").toLowerCase().startsWith(typed)
    )
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 8);

  if (!matches.length) {
    copSuggestions.style.display = "none";
    return;
  }

  matches.forEach(name => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.textContent = name;

    item.addEventListener("click", () => {
      copInput.value = name;
      copSuggestions.style.display = "none";
    });

    copSuggestions.appendChild(item);
  });

  copSuggestions.style.display = "block";
}

copInput.addEventListener("input", showCOPSuggestions);

document.addEventListener("click", function(event) {
  if (!event.target.closest(".autocomplete")) {
    copSuggestions.style.display = "none";
  }
});

function addOpportunity() {
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const coachesNeeded = document.getElementById("coachesNeeded").value;
  const programType = document.getElementById("programType").value;
  const fund = document.getElementById("fund").value;
  const cop = document.getElementById("cop").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!school || !date || !startTime || !endTime || !coachesNeeded || !programType || !fund || !cop) {
    alert("Please complete all required fields including Program Type, Fund, and COP.");
    return;
  }

  const url = `${API_URL}?action=addOpportunity`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&coachesNeeded=${encodeURIComponent(coachesNeeded)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&fund=${encodeURIComponent(fund)}`
    + `&cop=${encodeURIComponent(cop)}`
    + `&notes=${encodeURIComponent(notes)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Opportunity added!");
        window.location.href = "index.html";
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong adding the opportunity.");
      console.error(error);
    });
}
