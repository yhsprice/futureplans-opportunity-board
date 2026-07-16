const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const container = document.getElementById("scheduleList");
const currentUser = getCurrentUser();
let currentPersonID = currentUser.PersonID;

async function loadSchedule() {
  container.innerHTML = "<p>Loading schedule...</p>";

  try {
    const response = await fetch(API_URL + "?action=getRequests");
    const requests = await response.json();

    const myRequests = requests
      .filter(r =>
        String(r.PersonID) === String(currentPersonID) &&
        (r.Status === "Approved" || r.Status === "Pending Approval")
      )
      .sort((a, b) => {
        const dateA = new Date(`${a.Date} ${a.StartTime}`);
        const dateB = new Date(`${b.Date} ${b.StartTime}`);
        return dateA - dateB;
      });

    if (myRequests.length === 0) {
      container.innerHTML = `
        <div class="opportunity">
          <h2>No Current Schedule</h2>
          <p>You do not currently have approved or pending opportunities.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="opportunity">
        <p>
          <strong>Important:</strong> By requesting an opportunity, you are accepting responsibility for that assignment.
          If you later cannot attend, you are responsible for notifying management and helping find a replacement.
        </p>

        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px;">Date</th>
              <th style="text-align:left; padding:8px;">Start</th>
              <th style="text-align:left; padding:8px;">End</th>
              <th style="text-align:left; padding:8px; min-width:180px;">School</th>
              <th style="text-align:left; padding:8px;">Program</th>
              <th style="text-align:left; padding:8px;">COP</th>
              <th style="text-align:left; padding:8px;">Status</th>
              <th style="text-align:left; padding:8px;">Release</th>
              <th style="text-align:left; padding:8px;">Submit for Pay</th>
            </tr>
          </thead>
          <tbody>
    `;

    myRequests.forEach(request => {
      const releaseRequested = String(request.ReleaseRequested || "").trim() === "Yes";

      html += `
        <tr>
          <td style="padding:8px; white-space:nowrap;">${request.Date}</td>
          <td style="padding:8px; white-space:nowrap;">${request.StartTime}</td>
          <td style="padding:8px; white-space:nowrap;">${request.EndTime}</td>
          <td style="padding:8px; min-width:180px;">${request.School}</td>
          <td style="padding:8px;">${request.ProgramType || ""}</td>
          <td style="padding:8px;">${request.COP || "Not listed"}</td>
          <td style="padding:8px;">${request.Status}</td>
          <td style="padding:8px;">
            ${releaseRequested
              ? `<strong>Release requested</strong><br><small>${request.ReleaseStatus || "Pending Review"}</small>`
              : `<button onclick="requestRelease('${request.RequestID}')">Request Release</button>`
            }
          </td>

          <td style="padding:8px;">
            ${request.Status === "Approved"
              ? `<button onclick="openPaySubmission('${request.RequestID}')">Submit for Pay</button>`
              : `<small>Available after approval</small>`
            }
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
    container.innerHTML = "<p>Something went wrong loading your schedule.</p>";
    console.error(error);
  }
}

function requestRelease(requestID) {
  const reason = prompt(
    "Explain why you need to be released from this opportunity. This note will only be visible to management."
  );

  if (!reason || reason.trim() === "") {
    alert("A reason is required to request release.");
    return;
  }

  const confirmRelease = confirm(
    "By requesting release, you are notifying management that you cannot fulfill this assignment and are responsible for helping find a replacement. Submit this request?"
  );

  if (!confirmRelease) {
    return;
  }

  const url = `${API_URL}?action=requestRelease`
    + `&requestID=${encodeURIComponent(requestID)}`
    + `&reason=${encodeURIComponent(reason.trim())}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Release request submitted to management.");
        loadSchedule();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the release request.");
      console.error(error);
    });
}

function openPaySubmission(requestID) {
  const row = document.createElement("div");

  row.className = "dashboard-card";

  row.innerHTML = `
    <h3>Submit Appointment for Pay</h3>

    <p><strong>Appointment Outcome</strong></p>
    <select id="scheduleOutcome_${requestID}" onchange="toggleScheduleOutcomeFields('${requestID}')">
      <option value="Completed">Completed</option>
      <option value="Student Absent">Student Absent</option>
      <option value="Student Cancelled">Student Cancelled</option>
      <option value="School Cancelled">School Cancelled</option>
      <option value="School Closed">School Closed</option>
      <option value="Technical Issue">Technical Issue</option>
      <option value="Other">Other</option>
    </select>

    <div id="scheduleReasonArea_${requestID}" style="display:none;">
      <p><strong>Reason</strong></p>

      <select id="scheduleReason_${requestID}">
        <option value="">Select Reason</option>
        <option value="Weather">Weather</option>
        <option value="Student Illness">Student Illness</option>
        <option value="School Event">School Event</option>
        <option value="State Testing">State Testing</option>
        <option value="Transportation">Transportation</option>
        <option value="Behavior">Behavior</option>
        <option value="Parent Request">Parent Request</option>
        <option value="Scheduling Conflict">Scheduling Conflict</option>
        <option value="Technical Issue">Technical Issue</option>
        <option value="Other">Other</option>
      </select>

      <p><strong>Details</strong></p>
      <textarea
        id="scheduleDetails_${requestID}"
        placeholder="Optional details"
      ></textarea>
    </div>

    <br><br>

    <button onclick="submitScheduleForPay('${requestID}')">
      Submit for Pay
    </button>

    <button onclick="this.closest('.dashboard-card').remove()">
      Cancel
    </button>
  `;

  container.prepend(row);
}

function toggleScheduleOutcomeFields(requestID) {
  const outcome = document.getElementById(`scheduleOutcome_${requestID}`).value;
  const reasonArea = document.getElementById(`scheduleReasonArea_${requestID}`);

  reasonArea.style.display =
    outcome === "Completed" ? "none" : "block";

  if (outcome === "Completed") {
    document.getElementById(`scheduleReason_${requestID}`).value = "";
    document.getElementById(`scheduleDetails_${requestID}`).value = "";
  }
}

function submitScheduleForPay(requestID) {
  const outcome =
    document.getElementById(`scheduleOutcome_${requestID}`).value;

  const reason =
    document.getElementById(`scheduleReason_${requestID}`).value;

  const details =
    document.getElementById(`scheduleDetails_${requestID}`).value.trim();

  if (outcome !== "Completed" && !reason) {
    alert("Please select a reason.");
    return;
  }

  const url = `${API_URL}?action=completeRequest`
    + `&requestID=${encodeURIComponent(requestID)}`
    + `&appointmentOutcome=${encodeURIComponent(outcome)}`
    + `&outcomeReason=${encodeURIComponent(reason)}`
    + `&outcomeDetails=${encodeURIComponent(details)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Submitted for pay.");
        loadSchedule();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      console.error(error);
      alert("Something went wrong submitting this appointment for pay.");
    });
}

showUserBanner();
showManagerLinksOnly();
loadSchedule();
