const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const container = document.getElementById("opportunityManager");

async function loadOpportunities() {
  container.innerHTML = "<p>Loading opportunities...</p>";

  const response = await fetch(API_URL);
  const opportunities = await response.json();

  container.innerHTML = "";

  opportunities.forEach(opportunity => {
    const div = document.createElement("div");
    div.className = "opportunity";

    div.innerHTML = `
      <h3>${opportunity.School}</h3>

      <p><strong>Opportunity ID:</strong> ${opportunity.OpportunityID}</p>

      <p><strong>School</strong></p>
      <input id="school-${opportunity.OpportunityID}" value="${opportunity.School || ""}">

      <p><strong>Date</strong></p>
      <input id="date-${opportunity.OpportunityID}" type="date" value="${toInputDate(opportunity.Date)}">

      <p><strong>Start Time</strong></p>
      <input id="start-${opportunity.OpportunityID}" type="time" value="${toInputTime(opportunity.StartTime)}">

      <p><strong>End Time</strong></p>
      <input id="end-${opportunity.OpportunityID}" type="time" value="${toInputTime(opportunity.EndTime)}">

      <p><strong>Coaches Needed</strong></p>
      <input id="coaches-${opportunity.OpportunityID}" type="number" value="${opportunity.CoachesNeeded || 1}">

      <p><strong>Program Type</strong></p>
      <input id="program-${opportunity.OpportunityID}" value="${opportunity.ProgramType || ""}">

      <p><strong>Notes</strong></p>
      <textarea id="notes-${opportunity.OpportunityID}">${opportunity.Notes || ""}</textarea>

      <p><strong>Contact</strong></p>
      <input id="contact-${opportunity.OpportunityID}" value="${opportunity.Contact || ""}">

      <br><br>

      <button onclick="updateOpportunity('${opportunity.OpportunityID}')">
        Save Changes
      </button>
    `;

    container.appendChild(div);
  });
}

function updateOpportunity(opportunityID) {
  const school = document.getElementById(`school-${opportunityID}`).value.trim();
  const date = document.getElementById(`date-${opportunityID}`).value;
  const startTime = document.getElementById(`start-${opportunityID}`).value;
  const endTime = document.getElementById(`end-${opportunityID}`).value;
  const coachesNeeded = document.getElementById(`coaches-${opportunityID}`).value;
  const programType = document.getElementById(`program-${opportunityID}`).value.trim();
  const notes = document.getElementById(`notes-${opportunityID}`).value.trim();
  const contact = document.getElementById(`contact-${opportunityID}`).value.trim();

  const url = `${API_URL}?action=updateOpportunity`
    + `&opportunityID=${encodeURIComponent(opportunityID)}`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&coachesNeeded=${encodeURIComponent(coachesNeeded)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&notes=${encodeURIComponent(notes)}`
    + `&contact=${encodeURIComponent(contact)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Opportunity updated.");
        loadOpportunities();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong updating the opportunity.");
      console.error(error);
    });
}

function toInputDate(value) {
  const date = new Date(value);
  if (isNaN(date)) return "";
  return date.toISOString().split("T")[0];
}

function toInputTime(value) {
  if (!value) return "";

  const date = new Date(`1970-01-01 ${value}`);
  if (isNaN(date)) return "";

  return date.toTimeString().slice(0, 5);
}

loadOpportunities();
