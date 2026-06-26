const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const container = document.getElementById("opportunityManager");
showUserBanner();

async function loadOpportunities() {
  container.innerHTML = "<p>Loading opportunities...</p>";

  const response = await fetch(`${API_URL}?action=getManageOpportunities`);
  const opportunities = await response.json();

  opportunities.sort((a, b) => {
    const statusA = String(a.OpportunityStatus || "Open").trim();
    const statusB = String(b.OpportunityStatus || "Open").trim();

    const openA = statusA === "Open" ? 0 : 1;
    const openB = statusB === "Open" ? 0 : 1;

    if (openA !== openB) return openA - openB;

    const dateA = new Date(`${a.Date} ${a.StartTime}`);
    const dateB = new Date(`${b.Date} ${b.StartTime}`);

    return dateA - dateB;
  });

  let html = `
    <div class="dashboard-card">
  <table class="modern-table">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px;">Status</th>
            <th style="text-align:left; padding:8px;">Date</th>
            <th style="text-align:left; padding:8px;">Start</th>
            <th style="text-align:left; padding:8px;">End</th>
            <th style="text-align:left; padding:8px; min-width:180px;">School</th>
            <th style="text-align:left; padding:8px;">Needed</th>
            <th style="text-align:left; padding:8px;">Approved</th>
            <th style="text-align:left; padding:8px;">Open</th>
            <th style="text-align:left; padding:8px;">Program</th>
            <th style="text-align:left; padding:8px;">Fund</th>
            <th style="text-align:left; padding:8px;">Meeting</th>
            <th style="text-align:left; padding:8px; min-width:220px;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  opportunities.forEach(opportunity => {
    const status = String(opportunity.OpportunityStatus || "Open").trim();

    let statusColor = "#28a745";
    let rowBackground = "";

    if (status === "Closed") {
      statusColor = "#f0ad4e";
      rowBackground = "background:#fff8e1;";
    }

    if (status === "Cancelled") {
      statusColor = "#dc3545";
      rowBackground = "background:#f2f2f2;";
    }

    html += `
      <tr style="${rowBackground}">
        <td style="padding:8px; color:${statusColor}; font-weight:bold;">${status || "Open"}</td>
        <td style="padding:8px; white-space:nowrap;">${opportunity.Date}</td>
        <td style="padding:8px; white-space:nowrap;">${opportunity.StartTime}</td>
        <td style="padding:8px; white-space:nowrap;">${opportunity.EndTime}</td>
        <td style="padding:8px; min-width:180px;">${opportunity.School}</td>
        <td style="padding:8px;">${opportunity.CoachesNeeded}</td>
        <td style="padding:8px;">${opportunity.ApprovedCount || 0}</td>
        <td style="padding:8px;">${opportunity.RemainingOpenings}</td>
        <td style="padding:8px;">${opportunity.ProgramType}</td>
       <td style="padding:8px;">${opportunity.Fund || ""}</td>
<td style="padding:8px;">
  ${opportunity.MeetingLink ? `<a href="${opportunity.MeetingLink}" target="_blank">${opportunity.MeetingPlatform || "Meeting"}</a>` : "Not added"}
</td>
<td style="padding:8px; min-width:220px;">
          <div style="display:flex; gap:4px; flex-wrap:nowrap;">
            <button onclick="showEditForm('${opportunity.OpportunityID}')">Edit</button>
            <button onclick="setOpportunityStatus('${opportunity.OpportunityID}', 'Closed')">Close</button>
            <button onclick="setOpportunityStatus('${opportunity.OpportunityID}', 'Cancelled')">Cancel</button>
          </div>
        </td>
      </tr>

      <tr id="edit-row-${opportunity.OpportunityID}" style="display:none;">
        <td colspan="12">
          <div class="opportunity">
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
            <select id="program-${opportunity.OpportunityID}">
            <option value="Youth" ${opportunity.ProgramType === "Youth" ? "selected" : ""}>Youth</option>
            <option value="Adult" ${opportunity.ProgramType === "Adult" ? "selected" : ""}>Adult</option>
            <option value="Summer Program" ${opportunity.ProgramType === "Summer Program" ? "selected" : ""}>Summer Program</option>
            <option value="Professional Development" ${opportunity.ProgramType === "Professional Development" ? "selected" : ""}>Professional Development</option>
            <option value="Meeting" ${opportunity.ProgramType === "Meeting" ? "selected" : ""}>Meeting</option>
            <option value="Other" ${opportunity.ProgramType === "Other" ? "selected" : ""}>Other</option>
            </select>

            <p><strong>Fund</strong></p>
            <select id="fund-${opportunity.OpportunityID}">
            <option value="Grit" ${opportunity.Fund === "Grit" ? "selected" : ""}>Grit</option>
            <option value="NW OH" ${opportunity.Fund === "NW OH" ? "selected" : ""}>NW OH</option>
            <option value="SW OH" ${opportunity.Fund === "SW OH" ? "selected" : ""}>SW OH</option>
            </select>

            <p><strong>Notes</strong></p>
            <textarea id="notes-${opportunity.OpportunityID}">${opportunity.Notes || ""}</textarea>

            <p><strong>Contact</strong></p>
            <input id="contact-${opportunity.OpportunityID}" value="${opportunity.Contact || ""}">

            <p><strong>Meeting Platform</strong></p>
<select id="meetingPlatform-${opportunity.OpportunityID}">
  <option value="" ${!opportunity.MeetingPlatform ? "selected" : ""}>Select Platform</option>
  <option value="Google Meet" ${opportunity.MeetingPlatform === "Google Meet" ? "selected" : ""}>Google Meet</option>
  <option value="Zoom" ${opportunity.MeetingPlatform === "Zoom" ? "selected" : ""}>Zoom</option>
  <option value="Other" ${opportunity.MeetingPlatform === "Other" ? "selected" : ""}>Other</option>
</select>

<p><strong>Meeting Link</strong></p>
<input id="meetingLink-${opportunity.OpportunityID}" value="${opportunity.MeetingLink || ""}" placeholder="Paste Zoom or Google Meet link">

<p><strong>Meeting Notes</strong></p>
<textarea id="meetingNotes-${opportunity.OpportunityID}" placeholder="Optional passcode, waiting room note, etc.">${opportunity.MeetingNotes || ""}</textarea>

            <br><br>

            <button onclick="updateOpportunity('${opportunity.OpportunityID}')">
              Save Changes
            </button>

            <button onclick="hideEditForm('${opportunity.OpportunityID}')">
              Hide
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function showEditForm(opportunityID) {
  document.getElementById(`edit-row-${opportunityID}`).style.display = "table-row";
}

function hideEditForm(opportunityID) {
  document.getElementById(`edit-row-${opportunityID}`).style.display = "none";
}

function updateOpportunity(opportunityID) {
  const school = document.getElementById(`school-${opportunityID}`).value.trim();
  const date = document.getElementById(`date-${opportunityID}`).value;
  const startTime = document.getElementById(`start-${opportunityID}`).value;
  const endTime = document.getElementById(`end-${opportunityID}`).value;
  const coachesNeeded = document.getElementById(`coaches-${opportunityID}`).value;
  const programType = document.getElementById(`program-${opportunityID}`).value;
  const fund = document.getElementById(`fund-${opportunityID}`).value;  
  const notes = document.getElementById(`notes-${opportunityID}`).value.trim();
  const contact = document.getElementById(`contact-${opportunityID}`).value.trim();
  const meetingPlatform = document.getElementById(`meetingPlatform-${opportunityID}`).value;
  const meetingLink = document.getElementById(`meetingLink-${opportunityID}`).value.trim();
  const meetingNotes = document.getElementById(`meetingNotes-${opportunityID}`).value.trim();

  const url = `${API_URL}?action=updateOpportunity`
    + `&opportunityID=${encodeURIComponent(opportunityID)}`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&coachesNeeded=${encodeURIComponent(coachesNeeded)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&fund=${encodeURIComponent(fund)}`
    + `&notes=${encodeURIComponent(notes)}`
    + `&contact=${encodeURIComponent(contact)}`
    + `&meetingPlatform=${encodeURIComponent(meetingPlatform)}`
    + `&meetingLink=${encodeURIComponent(meetingLink)}`
    + `&meetingNotes=${encodeURIComponent(meetingNotes)}`;

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

function setOpportunityStatus(opportunityID, status) {
  const confirmChange = confirm(`Mark this opportunity as ${status}?`);

  if (!confirmChange) {
    return;
  }

  fetch(`${API_URL}?action=setOpportunityStatus&opportunityID=${encodeURIComponent(opportunityID)}&status=${encodeURIComponent(status)}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(`Opportunity marked as ${status}.`);
        loadOpportunities();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong updating the opportunity status.");
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
