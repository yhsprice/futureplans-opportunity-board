const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

loadCOPList();

function loadCOPList() {
  fetch(`${API_URL}?action=getCOPList`)
    .then(response => response.json())
    .then(cops => {
      const copList = document.getElementById("copList");
      copList.innerHTML = "";

      cops.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        copList.appendChild(option);
      });
    })
    .catch(error => {
      console.error("Could not load COP list:", error);
    });
}

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
