const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const releaseRequestList = document.getElementById("releaseRequestList");

const requestList = document.getElementById("requestList");

const payApprovalList = document.getElementById("payApprovalList");

async function loadRequests() {
  requestList.innerHTML = "<p>Loading requests...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    requestList.innerHTML = "";

    const pending = requests.filter(request => request.Status === "Pending Approval");

    if (pending.length === 0) {
      requestList.innerHTML = `
        <div class="empty-state">
          <h2>No Pending Requests</h2>
          <p>All caught up. No approvals needed right now.</p>
        </div>
      `;
      return;
    }

    pending.forEach(request => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
       <h3>${request.School}</h3>
        <p><strong>Date:</strong> ${formatDateOnly(request.Date)}</p>
        <p><strong>Time:</strong> ${request.StartTime} - ${request.EndTime}</p>
        <p><strong>Coach:</strong> ${request.CoachName}</p>
        <p><strong>Requested At:</strong> ${formatDateTime(request.RequestedAt)}</p>
        <p><strong>Status:</strong> ${request.Status}</p>
        ${request.AttendanceVerified === "Yes"
            ? `<p><strong>Attendance:</strong> Verified</p>`
            : `
            <button onclick="verifyAttendance('${request.RequestID}')">
              Verify Worked
            </button>
            `
        }
        
        <button onclick="updateRequest('${request.RequestID}', 'Approved')">
          Approve
        </button>

        <button onclick="updateRequest('${request.RequestID}', 'Denied')">
          Deny
        </button>
      `;

      requestList.appendChild(div);
    });

  } catch (error) {
    requestList.innerHTML = "<p>Something went wrong loading requests.</p>";
    console.error(error);
  }
}

function updateRequest(requestID, newStatus) {
  const url = `${API_URL}?action=updateRequest&requestID=${encodeURIComponent(requestID)}&status=${encodeURIComponent(newStatus)}`;

  const img = new Image();
  img.src = url;

  alert(`Request marked as ${newStatus}.`);

  setTimeout(() => {
    loadRequests();
  }, 1500);
}

async function loadPayApprovals() {
  payApprovalList.innerHTML = "<p>Loading pay approvals...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getCompletedSessions`);
    const sessions = await response.json();

    const pending = sessions.filter(session =>
      session.Status === "Pending Pay Approval"
    );

    if (pending.length === 0) {
      payApprovalList.innerHTML = `
        <div class="empty-state">
          <h2>No Pending Pay Approvals</h2>
          <p>All submitted sessions have been reviewed.</p>
        </div>
      `;
      return;
    }

    payApprovalList.innerHTML = "";

    pending.forEach(session => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
        <h3>${session.School}</h3>
        <p><strong>Coach:</strong> ${session.CoachName}</p>
        <p><strong>Date:</strong> ${formatDateOnly(session.Date)}</p>
        <p><strong>Pay Rule:</strong> ${session.PayRule}</p>
        <p><strong>Pay Hours:</strong> ${session.PayHours}</p>
        <p><strong>Pay Amount:</strong> $${session.PayAmount}</p>
        <p><strong>Notes:</strong> ${session.Notes || ""}</p>
       
   <button onclick="editPayrollEntry('${session.SessionID}')">
  Edit
</button>
     
<button onclick="deletePayrollEntry('${session.SessionID}')">
  Delete
</button>

<button onclick="updatePayApproval('${session.SessionID}', 'Approved for Pay')">
  Approve for Pay
</button>

<button onclick="updatePayApproval('${session.SessionID}', 'Denied')">
  Deny
</button>
      `;

      payApprovalList.appendChild(div);
    });

  } catch (error) {
    payApprovalList.innerHTML = "<p>Something went wrong loading pay approvals.</p>";
    console.error(error);
  }
}

function updatePayApproval(sessionID, newStatus) {
  const url = `${API_URL}?action=updateCompletedSession&sessionID=${encodeURIComponent(sessionID)}&status=${encodeURIComponent(newStatus)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(`Session marked as ${newStatus}.`);
        loadPayApprovals();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong updating the session.");
      console.error(error);
    });
}

function generateScheduledPayroll() {
  const confirmRun = confirm("Generate payroll items from approved scheduled opportunities that have already passed?");

  if (!confirmRun) {
    return;
  }

  fetch(`${API_URL}?action=generateScheduledPayroll`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(`${result.created} scheduled payroll item(s) created.`);
        loadPayApprovals();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong generating scheduled payroll.");
      console.error(error);
    });
}

function verifyAttendance(requestID) {

  const confirmVerify = confirm(
    "Verify that this coach completed the session?"
  );

  if (!confirmVerify) {
    return;
  }

  fetch(
    `${API_URL}?action=verifyAttendance&requestID=${encodeURIComponent(requestID)}`
  )
    .then(response => response.json())
    .then(result => {

      if (result.success) {
        alert("Attendance verified.");
        loadRequests();
      } else {
        alert(result.message || "Something went wrong.");
      }

    })
    .catch(error => {
      console.error(error);
      alert("Something went wrong.");
    });
}

async function loadReleaseRequests() {
  releaseRequestList.innerHTML = "<p>Loading release requests...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    const releaseRequests = requests.filter(request =>
      request.ReleaseRequested === "Yes" &&
      request.ReleaseStatus === "Pending Review"
    );

    if (releaseRequests.length === 0) {
      releaseRequestList.innerHTML = `
        <div class="empty-state">
          <h2>No Release Requests</h2>
          <p>No coaches are currently requesting release.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="opportunity">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px;">Coach</th>
              <th style="text-align:left; padding:8px;">School</th>
              <th style="text-align:left; padding:8px;">Date</th>
              <th style="text-align:left; padding:8px;">Time</th>
              <th style="text-align:left; padding:8px;">Reason</th>
              <td style="padding:8px;">${formatDateTime(request.ReleaseRequestedAt)}</td>
              <th style="text-align:left; padding:8px;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    releaseRequests.forEach(request => {
  html += `
    <tr>
      <td style="padding:8px;">${request.CoachName}</td>
      <td style="padding:8px;">${request.School}</td>
      <td style="padding:8px;">${formatDateOnly(request.Date)}</td>
      <td style="padding:8px;">${request.StartTime} - ${request.EndTime}</td>
      <td style="padding:8px;">${request.ReleaseReason || ""}</td>
      <td style="padding:8px;">${formatDateTime(request.ReleaseRequestedAt)}</td>

      <td style="padding:8px;">
        <button onclick="approveRelease('${request.RequestID}')">
  Approve Release
</button>

<button onclick="recordCallOff('${request.RequestID}')">
  Record Call-Off
</button>
      </td>
    </tr>
  `;
});

    html += `
          </tbody>
        </table>
      </div>
    `;

    releaseRequestList.innerHTML = html;

  } catch (error) {
    releaseRequestList.innerHTML = "<p>Something went wrong loading release requests.</p>";
    console.error(error);
  }
}

function approveRelease(requestID) {

  if (!confirm("Approve this release request?")) {
    return;
  }

  fetch(`${API_URL}?action=approveRelease&requestID=${encodeURIComponent(requestID)}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Release approved.");
        loadReleaseRequests();
      } else {
        alert(result.message || "Something went wrong.");
      }
    });
}

function recordCallOff(requestID) {

  if (!confirm("Record this as a call-off and open the opportunity for replacement?")) {
    return;
  }

  fetch(`${API_URL}?action=recordCallOff&requestID=${encodeURIComponent(requestID)}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Call-off recorded and replacement opened.");
        loadReleaseRequests();
      } else {
        alert(result.message || "Something went wrong.");
      }
    });
}
function submitManualCompletedSession() {

  const userName = document.getElementById("manualUserName").value.trim();
  const date = document.getElementById("manualDate").value;
  const programType = document.getElementById("manualProgramType").value;
  const fund = document.getElementById("manualFund").value;
  const serviceType = document.getElementById("manualServiceType").value;
  const hours = document.getElementById("manualHours").value;
  const school = document.getElementById("manualSchool").value.trim();
  const notes = document.getElementById("manualNotes").value.trim();

  const approveNow = confirm(
  `Do you want to approve this for pay now?\n\n` +
  `Coach: ${userName}\n` +
  `Date: ${date}\n` +
  `Program Type: ${programType}\n` +
  `Fund: ${fund}\n` +
  `Service Type: ${serviceType}\n` +
  `Hours: ${hours}\n` +
  `School/Agency: ${school || "N/A"}\n` +
  `Notes: ${notes || "N/A"}`
);
  const message = document.getElementById("manualSessionMessage");

  if (!userName || !date || !programType || !fund || !serviceType || !hours) {
    message.textContent = "Please complete User Name, Date, Program Type, Service Type, and Hours.";
    return;
  }

  const params = new URLSearchParams({
    action: "addManualCompletedSession",
    approveNow,
    userName,
    date,
    programType,
    fund,
    serviceType,
    hours,
    school,
    notes
  });

  fetch(API_URL, {
    method: "POST",
    body: params
  })
    .then(response => response.json())
    .then(result => {

      if (result.success) {
        message.textContent = "Manual time added successfully.";

        document.getElementById("manualUserName").value = "";
        document.getElementById("manualDate").value = "";
        document.getElementById("manualProgramType").value = "";
        document.getElementById("manualFund").value = "";
        document.getElementById("manualServiceType").value = "";
        document.getElementById("manualHours").value = "";
        document.getElementById("manualSchool").value = "";
        document.getElementById("manualNotes").value = "";

        loadPayApprovals();

      } else {
        message.textContent = result.message || "Unable to add manual time.";
      }
    })
    .catch(error => {
  console.error("Manual time error:", error);
  message.textContent = "Error adding manual time. Check console or Apps Script deployment.";
});
}

async function loadDashboardCounts() {
  try {
    const opportunitiesResponse = await fetch(`${API_URL}?action=getOpportunities`);
    const opportunities = await opportunitiesResponse.json();

    const requestsResponse = await fetch(`${API_URL}?action=getRequests`);
    const requests = await requestsResponse.json();

    const sessionsResponse = await fetch(`${API_URL}?action=getCompletedSessions`);
    const sessions = await sessionsResponse.json();

    const openOpportunities = opportunities.length;

    const pendingRequests = requests.filter(r =>
      r.Status === "Pending Approval"
    ).length;

    const releaseRequests = requests.filter(r =>
      r.ReleaseRequested === "Yes" &&
      r.ReleaseStatus === "Pending Review"
    ).length;

    const pendingPayroll = sessions.filter(s =>
      s.Status === "Pending Pay Approval"
    ).length;

    document.getElementById("openOpportunityCount").textContent = openOpportunities;
    document.getElementById("pendingRequestCount").textContent = pendingRequests;
    document.getElementById("pendingPayrollCount").textContent = pendingPayroll;
    document.getElementById("releaseRequestCount").textContent = releaseRequests;

  } catch (error) {
    console.error("Dashboard count error:", error);
  }
}

async function loadRecentActivity() {
  const activityBox = document.getElementById("recentActivity");

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    if (!Array.isArray(requests) || requests.length === 0) {
      activityBox.innerHTML = "<p>No recent activity yet.</p>";
      return;
    }

    const recentRequests = requests
      .filter(r => r.RequestID)
      .slice(-5)
      .reverse();

    if (recentRequests.length === 0) {
      activityBox.innerHTML = "<p>No recent activity yet.</p>";
      return;
    }

    let html = "";

    recentRequests.forEach(request => {
      html += `
        <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,.1);">
          <strong>${request.CoachName || "Coach"}</strong>
          requested
          <strong>${request.School || "an opportunity"}</strong>
          on
          ${formatDateOnly(request.Date)}
        </div>
      `;
    });

    activityBox.innerHTML = html;

  } catch (error) {
    console.error("Recent activity error:", error);
    activityBox.innerHTML = "<p>No recent activity yet.</p>";
  }
}

async function loadCoachNamesForManualEntry() {

  const list = document.getElementById("coachNameList");

  if (!list) return;

  try {

    const response = await fetch(`${API_URL}?action=getPeople`);
    const people = await response.json();

    list.innerHTML = "";

    people.forEach(person => {

  if (!person.Name) return;

  const option = document.createElement("option");
  option.value = person.Name;

  list.appendChild(option);

});

  } catch (error) {

    console.error(error);

  }

}

async function deletePayrollEntry(sessionID) {
  if (!confirm("Delete this payroll entry?")) {
    return;
  }

  const response = await fetch(
    `${API_URL}?action=deleteCompletedSession&sessionID=${encodeURIComponent(sessionID)}`
  );

  const result = await response.json();

  alert(result.message || "Done.");
  loadPayApprovals();
}

async function editPayrollEntry(sessionID) {
  const response = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await response.json();

  const session = sessions.find(
    s => String(s.SessionID) === String(sessionID)
  );

  if (!session) {
    alert("Payroll entry not found.");
    return;
  }

  const date = prompt("Date:", formatDateForInput(session.Date));
  if (date === null) return;

  const programType = prompt("Program Type:", session.ProgramType || "");
  if (programType === null) return;

  const serviceType = prompt("Service Type:", session.PayRule || "");
  if (serviceType === null) return;

  const school = prompt("School / Agency:", session.School || "");
  if (school === null) return;

  const hours = prompt("Hours:", session.PayHours || "");
  if (hours === null) return;

  const notes = prompt("Notes:", session.Notes || "");
  if (notes === null) return;

  const params = new URLSearchParams({
    action: "editCompletedSession",
    sessionID,
    date,
    programType,
    serviceType,
    school,
    hours,
    notes
  });

  const saveResponse = await fetch(API_URL, {
    method: "POST",
    body: params
  });

  const result = await saveResponse.json();

  alert(result.message || "Done.");
  loadPayApprovals();
}

function formatDateForInput(value) {
  const date = new Date(value);
  if (isNaN(date)) return "";

  return date.toISOString().split("T")[0];
}

loadRequests();
loadPayApprovals();
loadReleaseRequests();
loadDashboardCounts();
loadRecentActivity();
loadCoachNamesForManualEntry();
