const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const container = document.getElementById("opportunityManager");
const currentUser = getCurrentUser();

let allCoaches = [];

showUserBanner();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isYes(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return ["yes", "true", "active"].includes(normalized);
}

function getCoachTier(person) {
  return Number(
    person.Tiers ??
    person.Tier ??
    0
  );
}

function isActiveCoach(person) {
  const type = String(person.Type || "")
    .trim()
    .toLowerCase();

  const role = String(person.Role || "")
    .trim()
    .toLowerCase();

  const active =
    isYes(person.Active) ||
    isYes(person.ActiveStatus);

  return (
    active &&
    (type === "coach" || role === "coach") &&
    getCoachTier(person) !== 0
  );
}

function getCoachDisplayValue(coach) {
  const name = String(coach.Name || "").trim();
  const email = String(coach.Email || "").trim();

  if (email) {
    return `${name} — ${email}`;
  }

  return name;
}

function findCoachByDisplayValue(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  return allCoaches.find(coach =>
    getCoachDisplayValue(coach)
      .toLowerCase() === normalizedValue
  );
}

async function loadCoaches() {
  try {
    const response = await fetch(
      `${API_URL}?action=getPeople`
    );

    const people = await response.json();

    allCoaches = people
      .filter(isActiveCoach)
      .sort((a, b) =>
        String(a.Name || "").localeCompare(
          String(b.Name || "")
        )
      );

  } catch (error) {
    console.error("Unable to load coaches:", error);
    allCoaches = [];
  }
}

function buildCoachOptions() {
  return allCoaches
    .map(coach => {
      const displayValue =
        getCoachDisplayValue(coach);

      return `
        <option value="${escapeHtml(displayValue)}"></option>
      `;
    })
    .join("");
}

async function loadOpportunities() {
  container.innerHTML =
    "<p>Loading opportunities...</p>";

  try {
    await loadCoaches();

    const response = await fetch(
      `${API_URL}?action=getManageOpportunities`
    );

    const opportunities = await response.json();

    opportunities.sort((a, b) => {
      const statusA = String(
        a.OpportunityStatus || "Open"
      ).trim();

      const statusB = String(
        b.OpportunityStatus || "Open"
      ).trim();

      const openA = statusA === "Open" ? 0 : 1;
      const openB = statusB === "Open" ? 0 : 1;

      if (openA !== openB) {
        return openA - openB;
      }

      const dateA = new Date(
        `${a.Date} ${a.StartTime}`
      );

      const dateB = new Date(
        `${b.Date} ${b.StartTime}`
      );

      return dateA - dateB;
    });

    let html = `
      <datalist id="managerCoachList">
        ${buildCoachOptions()}
      </datalist>

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
              <th style="text-align:left; padding:8px; min-width:300px;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    opportunities.forEach(opportunity => {
      const opportunityID =
        String(opportunity.OpportunityID || "");

      const status = String(
        opportunity.OpportunityStatus || "Open"
      ).trim();

      const remainingOpenings = Number(
        opportunity.RemainingOpenings || 0
      );

      const canAssign =
        status === "Open" &&
        remainingOpenings > 0;

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
          <td style="padding:8px; color:${statusColor}; font-weight:bold;">
            ${escapeHtml(status || "Open")}
          </td>

          <td style="padding:8px; white-space:nowrap;">
            ${escapeHtml(opportunity.Date)}
          </td>

          <td style="padding:8px; white-space:nowrap;">
            ${escapeHtml(opportunity.StartTime)}
          </td>

          <td style="padding:8px; white-space:nowrap;">
            ${escapeHtml(opportunity.EndTime)}
          </td>

          <td style="padding:8px; min-width:180px;">
            ${escapeHtml(opportunity.School)}
          </td>

          <td style="padding:8px;">
            ${escapeHtml(opportunity.CoachesNeeded)}
          </td>

          <td style="padding:8px;">
            ${escapeHtml(opportunity.ApprovedCount || 0)}
          </td>

          <td style="padding:8px;">
            ${escapeHtml(remainingOpenings)}
          </td>

          <td style="padding:8px;">
            ${escapeHtml(opportunity.ProgramType)}
          </td>

          <td style="padding:8px;">
            ${escapeHtml(opportunity.Fund || "")}
          </td>

          <td style="padding:8px;">
            ${
              opportunity.MeetingLink
                ? `
                  <a
                    href="${escapeHtml(opportunity.MeetingLink)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${escapeHtml(
                      opportunity.MeetingPlatform ||
                      "Meeting"
                    )}
                  </a>
                `
                : "Not added"
            }
          </td>

          <td style="padding:8px; min-width:300px;">
            <div style="display:flex; gap:5px; flex-wrap:wrap;">

              <button
                onclick="showEditForm('${opportunityID}')"
              >
                Edit
              </button>

              ${
                canAssign
                  ? `
                    <button
                      onclick="showAssignmentForm('${opportunityID}')"
                    >
                      Assign Coach
                    </button>
                  `
                  : ""
              }

              <button
                onclick="setOpportunityStatus('${opportunityID}', 'Closed')"
              >
                Close
              </button>

              <button
                onclick="setOpportunityStatus('${opportunityID}', 'Cancelled')"
              >
                Cancel
              </button>

            </div>
          </td>
        </tr>

        <tr
          id="assignment-row-${opportunityID}"
          style="display:none;"
        >
          <td colspan="12">
            <div class="opportunity">

              <h3>Assign Coach</h3>

              <p>
                <strong>
                  ${escapeHtml(opportunity.School)}
                </strong>
                <br>
                ${escapeHtml(opportunity.Date)}
                |
                ${escapeHtml(opportunity.StartTime)}
                -
                ${escapeHtml(opportunity.EndTime)}
              </p>

              <p><strong>Coach</strong></p>

              <input
                id="assignment-coach-${opportunityID}"
                list="managerCoachList"
                placeholder="Start typing a coach's name"
                autocomplete="off"
                style="width:100%; max-width:500px;"
              >

              <p><strong>Reason</strong></p>

              <select
                id="assignment-reason-${opportunityID}"
                style="width:100%; max-width:500px;"
              >
                <option value="">Select a reason</option>
                <option value="Help with scheduling access">
                  Help with scheduling access
                </option>
                <option value="Additional opportunity">
                  Additional opportunity
                </option>
                <option value="Low utilization">
                  Low utilization
                </option>
                <option value="Coach requested assistance">
                  Coach requested assistance
                </option>
                <option value="Coverage needed">
                  Coverage needed
                </option>
                <option value="Other">
                  Other
                </option>
              </select>

              <p><strong>Notes</strong></p>

              <textarea
                id="assignment-notes-${opportunityID}"
                placeholder="Optional"
                style="width:100%; max-width:500px;"
              ></textarea>

              <br><br>

              <button
                id="assignment-button-${opportunityID}"
                onclick="assignCoach('${opportunityID}')"
              >
                Assign Coach
              </button>

              <button
                onclick="hideAssignmentForm('${opportunityID}')"
              >
                Hide
              </button>

            </div>
          </td>
        </tr>

        <tr
          id="edit-row-${opportunityID}"
          style="display:none;"
        >
          <td colspan="12">
            <div class="opportunity">

              <p><strong>School</strong></p>

              <input
                id="school-${opportunityID}"
                value="${escapeHtml(
                  opportunity.School || ""
                )}"
              >

              <p><strong>Date</strong></p>

              <input
                id="date-${opportunityID}"
                type="date"
                value="${toInputDate(opportunity.Date)}"
              >

              <p><strong>Start Time</strong></p>

              <input
                id="start-${opportunityID}"
                type="time"
                value="${toInputTime(
                  opportunity.StartTime
                )}"
              >

              <p><strong>End Time</strong></p>

              <input
                id="end-${opportunityID}"
                type="time"
                value="${toInputTime(
                  opportunity.EndTime
                )}"
              >

              <p><strong>Coaches Needed</strong></p>

              <input
                id="coaches-${opportunityID}"
                type="number"
                value="${escapeHtml(
                  opportunity.CoachesNeeded || 1
                )}"
              >

              <p><strong>Program Type</strong></p>

              <select id="program-${opportunityID}">
                <option
                  value="Youth"
                  ${
                    opportunity.ProgramType === "Youth"
                      ? "selected"
                      : ""
                  }
                >
                  Youth
                </option>

                <option
                  value="Adult"
                  ${
                    opportunity.ProgramType === "Adult"
                      ? "selected"
                      : ""
                  }
                >
                  Adult
                </option>

                <option
                  value="Summer Program"
                  ${
                    opportunity.ProgramType ===
                    "Summer Program"
                      ? "selected"
                      : ""
                  }
                >
                  Summer Program
                </option>

                <option
                  value="Professional Development"
                  ${
                    opportunity.ProgramType ===
                    "Professional Development"
                      ? "selected"
                      : ""
                  }
                >
                  Professional Development
                </option>

                <option
                  value="Meeting"
                  ${
                    opportunity.ProgramType === "Meeting"
                      ? "selected"
                      : ""
                  }
                >
                  Meeting
                </option>

                <option
                  value="Other"
                  ${
                    opportunity.ProgramType === "Other"
                      ? "selected"
                      : ""
                  }
                >
                  Other
                </option>
              </select>

              <p><strong>Fund</strong></p>

              <select id="fund-${opportunityID}">
                <option
                  value="Grit"
                  ${
                    opportunity.Fund === "Grit"
                      ? "selected"
                      : ""
                  }
                >
                  Grit
                </option>

                <option
                  value="NW OH"
                  ${
                    opportunity.Fund === "NW OH"
                      ? "selected"
                      : ""
                  }
                >
                  NW OH
                </option>

                <option
                  value="SW OH"
                  ${
                    opportunity.Fund === "SW OH"
                      ? "selected"
                      : ""
                  }
                >
                  SW OH
                </option>
              </select>

              <p><strong>Notes</strong></p>

              <textarea
                id="notes-${opportunityID}"
              >${escapeHtml(
                opportunity.Notes || ""
              )}</textarea>

              <p><strong>Contact</strong></p>

              <input
                id="contact-${opportunityID}"
                value="${escapeHtml(
                  opportunity.Contact || ""
                )}"
              >

              <p><strong>Meeting Platform</strong></p>

              <select
                id="meetingPlatform-${opportunityID}"
              >
                <option
                  value=""
                  ${
                    !opportunity.MeetingPlatform
                      ? "selected"
                      : ""
                  }
                >
                  Select Platform
                </option>

                <option
                  value="Google Meet"
                  ${
                    opportunity.MeetingPlatform ===
                    "Google Meet"
                      ? "selected"
                      : ""
                  }
                >
                  Google Meet
                </option>

                <option
                  value="Zoom"
                  ${
                    opportunity.MeetingPlatform === "Zoom"
                      ? "selected"
                      : ""
                  }
                >
                  Zoom
                </option>

                <option
                  value="Other"
                  ${
                    opportunity.MeetingPlatform === "Other"
                      ? "selected"
                      : ""
                  }
                >
                  Other
                </option>
              </select>

              <p><strong>Meeting Link</strong></p>

              <input
                id="meetingLink-${opportunityID}"
                value="${escapeHtml(
                  opportunity.MeetingLink || ""
                )}"
                placeholder="Paste Zoom or Google Meet link"
              >

              <p><strong>Meeting Notes</strong></p>

              <textarea
                id="meetingNotes-${opportunityID}"
                placeholder="Optional passcode, waiting room note, etc."
              >${escapeHtml(
                opportunity.MeetingNotes || ""
              )}</textarea>

              <br><br>

              <button
                onclick="updateOpportunity('${opportunityID}')"
              >
                Save Changes
              </button>

              <button
                onclick="hideEditForm('${opportunityID}')"
              >
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

  } catch (error) {
    container.innerHTML =
      "<p>Something went wrong loading opportunities.</p>";

    console.error(error);
  }
}

function showAssignmentForm(opportunityID) {
  const row = document.getElementById(
    `assignment-row-${opportunityID}`
  );

  if (row) {
    row.style.display = "table-row";
  }
}

function hideAssignmentForm(opportunityID) {
  const row = document.getElementById(
    `assignment-row-${opportunityID}`
  );

  if (row) {
    row.style.display = "none";
  }
}

async function assignCoach(opportunityID) {
  const coachInput = document.getElementById(
    `assignment-coach-${opportunityID}`
  );

  const reasonInput = document.getElementById(
    `assignment-reason-${opportunityID}`
  );

  const notesInput = document.getElementById(
    `assignment-notes-${opportunityID}`
  );

  const assignButton = document.getElementById(
    `assignment-button-${opportunityID}`
  );

  const coach = findCoachByDisplayValue(
    coachInput.value
  );

  if (!coach) {
    alert(
      "Please select a coach from the available coach list."
    );

    coachInput.focus();
    return;
  }

  const assignmentReason =
    reasonInput.value.trim();

  const assignmentNotes =
    notesInput.value.trim();

  const confirmed = confirm(
    `Assign ${coach.Name} to this opportunity?`
  );

  if (!confirmed) {
    return;
  }

  assignButton.disabled = true;
  assignButton.textContent = "Assigning...";

  const url =
    `${API_URL}?action=assignCoachToOpportunity`
    + `&opportunityID=${encodeURIComponent(opportunityID)}`
    + `&personID=${encodeURIComponent(coach.PersonID)}`
    + `&assignedByPersonID=${encodeURIComponent(
      currentUser.PersonID || ""
    )}`
    + `&assignmentReason=${encodeURIComponent(
      assignmentReason
    )}`
    + `&assignmentNotes=${encodeURIComponent(
      assignmentNotes
    )}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      alert(
        result.message ||
        "The coach could not be assigned."
      );

      assignButton.disabled = false;
      assignButton.textContent = "Assign Coach";
      return;
    }

    alert(
      result.message ||
      `${coach.Name} was assigned successfully.`
    );

    loadOpportunities();

  } catch (error) {
    alert(
      "Something went wrong assigning the coach."
    );

    console.error(error);

    assignButton.disabled = false;
    assignButton.textContent = "Assign Coach";
  }
}

function showEditForm(opportunityID) {
  document.getElementById(
    `edit-row-${opportunityID}`
  ).style.display = "table-row";
}

function hideEditForm(opportunityID) {
  document.getElementById(
    `edit-row-${opportunityID}`
  ).style.display = "none";
}

function updateOpportunity(opportunityID) {
  const school = document
    .getElementById(`school-${opportunityID}`)
    .value
    .trim();

  const date = document.getElementById(
    `date-${opportunityID}`
  ).value;

  const startTime = document.getElementById(
    `start-${opportunityID}`
  ).value;

  const endTime = document.getElementById(
    `end-${opportunityID}`
  ).value;

  const coachesNeeded = document.getElementById(
    `coaches-${opportunityID}`
  ).value;

  const programType = document.getElementById(
    `program-${opportunityID}`
  ).value;

  const fund = document.getElementById(
    `fund-${opportunityID}`
  ).value;

  const notes = document
    .getElementById(`notes-${opportunityID}`)
    .value
    .trim();

  const contact = document
    .getElementById(`contact-${opportunityID}`)
    .value
    .trim();

  const meetingPlatform =
    document.getElementById(
      `meetingPlatform-${opportunityID}`
    ).value;

  const meetingLink = document
    .getElementById(
      `meetingLink-${opportunityID}`
    )
    .value
    .trim();

  const meetingNotes = document
    .getElementById(
      `meetingNotes-${opportunityID}`
    )
    .value
    .trim();

  const url =
    `${API_URL}?action=updateOpportunity`
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
        alert(
          result.message ||
          "Something went wrong."
        );
      }
    })
    .catch(error => {
      alert(
        "Something went wrong updating the opportunity."
      );

      console.error(error);
    });
}

function setOpportunityStatus(
  opportunityID,
  status
) {
  const confirmChange = confirm(
    `Mark this opportunity as ${status}?`
  );

  if (!confirmChange) {
    return;
  }

  fetch(
    `${API_URL}?action=setOpportunityStatus`
    + `&opportunityID=${encodeURIComponent(opportunityID)}`
    + `&status=${encodeURIComponent(status)}`
  )
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(
          `Opportunity marked as ${status}.`
        );

        loadOpportunities();
      } else {
        alert(
          result.message ||
          "Something went wrong."
        );
      }
    })
    .catch(error => {
      alert(
        "Something went wrong updating the opportunity status."
      );

      console.error(error);
    });
}

function toInputDate(value) {
  const date = new Date(value);

  if (isNaN(date)) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function toInputTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(
    `1970-01-01 ${value}`
  );

  if (isNaN(date)) {
    return "";
  }

  return date.toTimeString().slice(0, 5);
}

loadOpportunities();
