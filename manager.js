const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const releaseRequestList = document.getElementById("releaseRequestList");

const requestList = document.getElementById("requestList");

const payApprovalList = document.getElementById("payApprovalList");

function logout() {
  sessionStorage.clear();
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.src = url + "&callback=" + callbackName;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

async function loadRequests() {
  requestList.innerHTML = "<p>Loading requests...</p>";

  try {
    const requests = await jsonp(`${API_URL}?action=getRequests`);

    console.log("Requests loaded:", requests);

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
        <p><strong>Status:</strong> ${request.Status}</p>

        <button onclick="updateRequest('${request.RequestID}', 'Approved')">Approve</button>
        <button onclick="updateRequest('${request.RequestID}', 'Denied')">Deny</button>
      `;

      requestList.appendChild(div);
    });

  } catch (error) {
    console.error("Requests error:", error);
    requestList.innerHTML = "<p>Something went wrong loading requests.</p>";
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
    const sessions = await jsonp(`${API_URL}?action=getCompletedSessions`);

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

  const userName = document.getElementById("manualCoachInput").value.trim();
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

        document.getElementById("manualCoachInput").value = "";
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
    const opportunities = await jsonp(`${API_URL}?action=getOpportunities`);

    const requests = await jsonp(`${API_URL}?action=getRequests`);

    const sessions = await jsonp(`${API_URL}?action=getCompletedSessions`);

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

    people
  .filter(person =>
    person.Name &&
    String(person.Active || person.ActiveStatus || "").trim() === "Yes" &&
    String(person.Role || "").trim() !== "COP"
  )
  .sort((a, b) => a.Name.localeCompare(b.Name))
  .forEach(person => {

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

const manualCoachInput = document.getElementById("manualCoachInput");
const manualCoachSuggestions = document.getElementById("manualCoachSuggestions");

let manualPayrollPeople = [];

function manualCoachOptions() {
  return manualPayrollPeople
    .map(person => `<option value="${person.Name}"></option>`)
    .join("");
}

function addManualGridRow(copyFromLast = true) {
  const body = document.getElementById("manualPayrollGridBody");

  let previous = null;

  if (copyFromLast && body.children.length > 0) {
    const lastRow = body.children[body.children.length - 1];

    previous = {
      date: lastRow.querySelector(".grid-date").value,
      programType: lastRow.querySelector(".grid-program").value,
      fund: lastRow.querySelector(".grid-fund").value,
      serviceType: lastRow.querySelector(".grid-service").value,
      hours: lastRow.querySelector(".grid-hours").value,
      school: lastRow.querySelector(".grid-school").value,
      notes: lastRow.querySelector(".grid-notes").value
    };
  }

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <input class="grid-coach" list="manualCoachGridList" placeholder="Coach">
    </td>

    <td>
      <input class="grid-date" type="date" value="${previous ? previous.date : ""}">
    </td>

    <td>
      <select class="grid-program">
        <option value="">Program</option>
        <option value="Youth">Youth</option>
        <option value="Adult">Adult</option>
        <option value="Summer Program">Summer Program</option>
        <option value="Professional Development">Professional Development</option>
        <option value="Meeting">Meeting</option>
        <option value="Other">Other</option>
      </select>
    </td>

    <td>
      <select class="grid-fund">
        <option value="">Fund</option>
        <option value="Grit">Grit</option>
        <option value="NW OH">NW OH</option>
        <option value="SW OH">SW OH</option>
      </select>
    </td>

    <td>
      <select class="grid-service">
        <option value="">Service</option>
        <option value="Coaching">Coaching</option>
        <option value="Revolution">Revolution</option>
        <option value="Training">Training</option>
        <option value="Shadowing">Shadowing</option>
        <option value="Administrative">Administrative</option>
        <option value="Other">Other</option>
      </select>
    </td>

    <td>
      <input class="grid-hours" type="number" step="0.25" min="0" placeholder="Hours" value="${previous ? previous.hours : ""}">
    </td>

    <td>
      <input class="grid-school" placeholder="School / Agency" value="${previous ? previous.school : ""}">
    </td>

    <td>
      <input class="grid-notes" placeholder="Notes" value="${previous ? previous.notes : ""}">
    </td>

    <td>
      <button onclick="this.closest('tr').remove()">Remove</button>
    </td>
  `;

  body.appendChild(row);

  if (previous) {
    row.querySelector(".grid-program").value = previous.programType;
    row.querySelector(".grid-fund").value = previous.fund;
    row.querySelector(".grid-service").value = previous.serviceType;
  }

  row.querySelector(".grid-coach").focus();
}

function clearManualGrid() {
  if (!confirm("Clear all manual payroll rows?")) return;

  document.getElementById("manualPayrollGridBody").innerHTML = "";
  document.getElementById("manualSessionMessage").textContent = "";

  addManualGridRow(false);
}

function submitManualGrid() {
  const rows = document.querySelectorAll("#manualPayrollGridBody tr");
  const message = document.getElementById("manualSessionMessage");

  if (rows.length === 0) {
    alert("There are no rows to submit.");
    return;
  }

  const entries = [];

  rows.forEach(row => {
    entries.push({
      userName: row.querySelector(".grid-coach").value.trim(),
      date: row.querySelector(".grid-date").value,
      programType: row.querySelector(".grid-program").value,
      fund: row.querySelector(".grid-fund").value,
      serviceType: row.querySelector(".grid-service").value,
      hours: row.querySelector(".grid-hours").value,
      school: row.querySelector(".grid-school").value.trim(),
      notes: row.querySelector(".grid-notes").value.trim()
    });
  });

  const incomplete = entries.some(e =>
    !e.userName || !e.date || !e.programType || !e.fund || !e.serviceType || !e.hours
  );

  if (incomplete) {
  console.log("Grid entries being checked:", entries);
  alert("One or more rows is missing Coach, Date, Program, Fund, Service, or Hours. Notes are optional.");
  return;
}

  const approveNow = confirm(
    `Submit ${entries.length} payroll entr${entries.length === 1 ? "y" : "ies"}?\n\nApprove for pay now?`
  );

  let completed = 0;
  let failed = 0;

  entries.forEach(entry => {
    const params = new URLSearchParams({
      action: "addManualCompletedSession",
      approveNow,
      userName: entry.userName,
      date: entry.date,
      programType: entry.programType,
      fund: entry.fund,
      serviceType: entry.serviceType,
      hours: entry.hours,
      school: entry.school,
      notes: entry.notes
    });

    fetch(API_URL, {
      method: "POST",
      body: params
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) completed++;
        else failed++;

        if (completed + failed === entries.length) {
          message.textContent = `${completed} added successfully. ${failed} failed.`;

          if (failed === 0) {
            clearManualGrid();
            loadPayApprovals();
          }
        }
      })
      .catch(error => {
        failed++;
        console.error("Grid submit error:", error);
      });
  });
}

function loadManualPayrollPeople() {
  console.log("Starting loadManualPayrollPeople");

  const gridList = document.getElementById("manualCoachGridList");

if (gridList) {
  gridList.innerHTML = manualPayrollPeople
    .map(person => `<option value="${person.Name}"></option>`)
    .join("");
}

  jsonp(`${API_URL}?action=getPeople`)
    .then(people => {
      console.log("People loaded:", people);

      manualPayrollPeople = people
        .filter(person =>
          person.Name &&
          String(person.Active || person.ActiveStatus || "").trim() === "Yes" &&
          String(person.Type || person.Role || "").trim() !== "COP"
        )
        .sort((a, b) => a.Name.localeCompare(b.Name));

      console.log("Manual payroll people:", manualPayrollPeople);
    })
    .catch(error => {
      console.error("Manual people error:", error);
    });
}

setTimeout(() => {
  const table = document.getElementById("manualPayrollGridBody");
  if (table && table.children.length === 0) {
    addManualGridRow(false);
  }
}, 500);

function showManualCoachSuggestions() {
  const typed = manualCoachInput.value.trim().toLowerCase();
  manualCoachSuggestions.innerHTML = "";

  if (!typed) {
    manualCoachSuggestions.style.display = "none";
    return;
  }

  const matches = manualPayrollPeople
    .filter(person =>
      String(person.Name || "").toLowerCase().startsWith(typed)
    )
    .slice(0, 8);

  matches.forEach(person => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.textContent = person.Name;

    item.addEventListener("click", () => {
      manualCoachInput.value = person.Name;
      manualCoachSuggestions.style.display = "none";
    });

    manualCoachSuggestions.appendChild(item);
  });

  manualCoachSuggestions.style.display = matches.length ? "block" : "none";
}

if (manualCoachInput) {
  manualCoachInput.addEventListener("input", showManualCoachSuggestions);
}

loadRequests();
loadPayApprovals();
loadManualPayrollPeople();
loadReleaseRequests();
loadDashboardCounts();
loadRecentActivity();
